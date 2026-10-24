import { cookies } from "next/headers";
import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { ApiError } from "@/lib/api/api-error";
import { authService } from "@/features/auth/services/auth.service";
import { auth } from "@/lib/auth/config";
import { userRepository } from "@/features/users/repositories/user.repository";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt";

const IS_PROD = process.env.NODE_ENV === "production";

export const POST = createApiHandler(
  {
    POST: async (request) => {
      const cookieStore = await cookies();
      let refreshToken = cookieStore.get("refresh_token")?.value;

      if (!refreshToken) {
        try {
          const body = await request.json();
          refreshToken = body?.refreshToken;
        } catch {
          // ignore json parse error if empty body
        }
      }

      if (refreshToken) {
        try {
          const result = await authService.refreshAccessToken(refreshToken);

          if (result.accessToken) {
            cookieStore.set("access_token", result.accessToken, {
              httpOnly: true,
              secure: IS_PROD,
              sameSite: "lax",
              path: "/",
              maxAge: 15 * 60, // 15 minutes
            });
          }

          return apiSuccess(null, "Access token refreshed successfully");
        } catch {
          // Fall through to NextAuth check
        }
      }

      // Fallback: Check NextAuth session / cookies for Admin or Social users
      let userIdentifier: string | null = null;
      try {
        const nextAuthSession = await auth();
        const user = nextAuthSession?.user;
        if (user?.id || (user as any)?.email) {
          userIdentifier = user?.id || (user as any)?.email || null;
        }
      } catch {
        // Fall through to cookie inspection
      }

      if (!userIdentifier) {
        const nextAuthCookie =
          cookieStore.get("authjs.session-token")?.value ||
          cookieStore.get("__Secure-authjs.session-token")?.value ||
          cookieStore.get("next-auth.session-token")?.value ||
          cookieStore.get("__Secure-next-auth.session-token")?.value;

        if (nextAuthCookie) {
          try {
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
                  userIdentifier =
                    (decoded.id as string) ||
                    (decoded.sub as string) ||
                    (decoded.email as string);
                  break;
                }
              } catch {}
            }
          } catch {}
        }
      }

      if (userIdentifier) {
        const user = await userRepository.findById(userIdentifier);
        if (user && user.status === "active") {
          const userUuid = user.uuid || user.id.toString();
          const userRole = user.roleName || user.role?.name || "CUSTOMER";
          const accessToken = generateAccessToken({
            userId: userUuid,
            email: user.email ?? "",
            role: userRole,
          });
          const newRefreshToken = generateRefreshToken({ userId: userUuid });

          cookieStore.set("access_token", accessToken, {
            httpOnly: true,
            secure: IS_PROD,
            sameSite: "lax",
            path: "/",
            maxAge: 15 * 60, // 15 minutes
          });

          cookieStore.set("refresh_token", newRefreshToken, {
            httpOnly: true,
            secure: IS_PROD,
            sameSite: "lax",
            path: "/",
            maxAge: 30 * 24 * 60 * 60, // 30 days
          });

          return apiSuccess(null, "Access token refreshed successfully");
        }
      }

      throw ApiError.unauthorized("Refresh token is required");
    },
  },
  {
    method: "POST",
  }
);
