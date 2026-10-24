import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodSchema } from "zod";
import { apiError, apiValidationError, apiFromError } from "./api-response";
import { ApiError } from "./api-error";
import { handlePrismaError } from "./api-error";
import { auth } from "@/lib/auth/config";
import { verifyAccessToken } from "@/lib/auth/jwt";
import type { Session } from "next-auth";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ApiHandlerOptions {
  method?: HttpMethod | HttpMethod[];
  requireAuth?: boolean;
  requiredRole?: string[];
  bodySchema?: ZodSchema;
  querySchema?: ZodSchema;
}

export interface HandlerContext {
  params?: Record<string, string>;
  searchParams?: URLSearchParams;
  session?: Session | null;
  body?: unknown;
  query?: Record<string, unknown>;
}

type HandlerFn = (
  request: NextRequest,
  context: HandlerContext
) => Promise<NextResponse>;

function parseSearchParams(
  searchParams: URLSearchParams,
  schema?: ZodSchema
): Record<string, unknown> {
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });

  if (schema) {
    const result = schema.safeParse(raw);
    if (result.success) {
      return result.data as Record<string, unknown>;
    }
  }

  return raw;
}

export function createApiHandler(
  handlers: Partial<Record<HttpMethod, HandlerFn>>,
  options: ApiHandlerOptions = {}
) {
  return async (
    request: NextRequest,
    routeContext: { params: Promise<any> }
  ) => {
    const method = request.method as HttpMethod;

    if (options.method) {
      const allowedMethods = Array.isArray(options.method)
        ? options.method
        : [options.method];
      if (!allowedMethods.includes(method)) {
        return apiError("Method not allowed", 405);
      }
    }

    const handler = handlers[method];
    if (!handler) {
      return apiError("Method not allowed", 405);
    }

    let session: Session | null = null;

    if (options.requireAuth) {
      try {
        // 1. Try NextAuth session (Google OAuth & NextAuth Credentials)
        session = (await auth()) as Session | null;
      } catch {
        session = null;
      }

      // 2. Fallback: Try NextAuth session cookie direct decode if auth() was empty
      if (!session?.user) {
        try {
          const cookieStore = await cookies();
          const nextAuthCookie =
            cookieStore.get("authjs.session-token")?.value ||
            cookieStore.get("__Secure-authjs.session-token")?.value ||
            cookieStore.get("next-auth.session-token")?.value ||
            cookieStore.get("__Secure-next-auth.session-token")?.value;

          if (nextAuthCookie) {
            const { decode } = await import("next-auth/jwt");
            const secret =
              process.env.AUTH_SECRET ||
              process.env.NEXTAUTH_SECRET ||
              "rithu-snacks@2026";
            for (const salt of [
              "authjs.session-token",
              "__Secure-authjs.session-token",
              "next-auth.session-token",
              "__Secure-next-auth.session-token",
              "",
            ]) {
              try {
                const decoded = await decode({
                  token: nextAuthCookie,
                  secret,
                  salt,
                });
                if (decoded && (decoded.id || decoded.sub || decoded.email)) {
                  const identifier =
                    (decoded.id as string) ||
                    (decoded.sub as string) ||
                    (decoded.email as string);
                  session = {
                    user: {
                      id: identifier,
                      email: (decoded.email as string) || "",
                      role: (decoded.role as string) || "CUSTOMER",
                      status: (decoded.status as string) || "active",
                    },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  } as unknown as Session;
                  break;
                }
              } catch {}
            }
          }
        } catch {
          // Continue to access token check
        }
      }

      // 3. Fallback: Try HttpOnly access_token cookie or Authorization header
      if (!session?.user) {
        let cookieStore;
        try {
          cookieStore = await cookies();
        } catch {
          cookieStore = null;
        }
        const token =
          cookieStore?.get("access_token")?.value ||
          request.headers.get("authorization")?.replace("Bearer ", "");

        if (token) {
          try {
            const payload = verifyAccessToken(token);
            session = {
              user: {
                id: payload.userId, // UUID string
                email: payload.email,
                role: payload.role || "CUSTOMER",
                status: "active",
              },
              expires: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            } as unknown as Session;
          } catch {
            // Token expired or invalid; session remains null
          }
        }
      }

      if (!session?.user) {
        return apiError("Session expired. Please log in again.", 401);
      }

      if (options.requiredRole && options.requiredRole.length > 0) {
        const userRole = ((session.user as { role?: string }).role || "").toUpperCase();
        const allowedRoles = options.requiredRole.map((r) => r.toUpperCase());
        if (!allowedRoles.includes(userRole)) {
          return apiError("You don't have permission", 403);
        }
      }
    }

    const resolvedParams = routeContext?.params
      ? await routeContext.params
      : undefined;
    const searchParams = new URL(request.url).searchParams;

    const context: HandlerContext = {
      params: resolvedParams,
      searchParams,
      session,
    };

    if (options.querySchema) {
      context.query = parseSearchParams(searchParams, options.querySchema);
    } else {
      context.query = parseSearchParams(searchParams);
    }

    if (
      options.bodySchema &&
      (method === "POST" || method === "PATCH" || method === "PUT")
    ) {
      try {
        const body = await request.json();
        const validation = options.bodySchema.safeParse(body);
        if (!validation.success) {
          const errors = validation.error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`
          );
          return apiValidationError(errors);
        }
        context.body = validation.data;
      } catch {
        return apiError("Invalid request body", 400);
      }
    }

    try {
      return await handler(request, context);
    } catch (error: any) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        fs.writeFileSync(path.join(process.cwd(), "handler_error.log"), String(error?.stack || error?.message || error));
      } catch {}

      if (error instanceof ApiError) {
        return apiFromError(error);
      }

      if (
        error instanceof TypeError &&
        error.message.includes("Content-Type")
      ) {
        return apiError("Content-Type must be multipart/form-data", 400);
      }

      const prismaResult = handlePrismaError(error);
      if (prismaResult && prismaResult.message !== "A database error occurred") {
        return apiFromError(prismaResult);
      }

      console.error(`Unhandled API Error [${method}]:`, error);
      const isDev = process.env.NODE_ENV !== "production";
      return apiError(isDev ? (error?.message || "Something went wrong") : "Something went wrong", 500);
    }
  };
}
