import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "rithu-snacks@2026",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const validation = loginSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
        });

        if (!validation.success) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: validation.data.email },
          include: { role: true },
        });

        if (!user || !user.password_hash) {
          return null;
        }

        if (user.status !== "active") {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          validation.data.password,
          user.password_hash
        );

        if (!isPasswordValid) {
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { last_login_at: new Date() },
        });

        return {
          id: user.uuid || user.id.toString(),
          name: user.name,
          email: user.email ?? "",
          image: user.avatar ?? null,
          role: user.role.name,
          phone: user.phone ?? null,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = (profile?.email || user?.email || "").toLowerCase().trim();
        if (!email) {
          return false;
        }

        // Only allow verified emails from Google
        if (profile && "email_verified" in profile && profile.email_verified === false) {
          return false;
        }

        const existingUser = await db.user.findFirst({
          where: { email },
          include: { role: true },
        });

        if (existingUser) {
          // Verify account is active and not blocked
          if (
            existingUser.status !== "active" ||
            !existingUser.is_active ||
            existingUser.is_blocked
          ) {
            return "/login?error=AccessDenied";
          }

          const rawAvatar =
            existingUser.avatar || user.image || (profile as any)?.picture || null;
          const avatarToSave = rawAvatar ? rawAvatar.slice(0, 500) : null;

          await db.user.update({
            where: { id: existingUser.id },
            data: {
              last_login_at: new Date(),
              avatar: avatarToSave,
              email_verified_at: existingUser.email_verified_at || new Date(),
            },
          });

          // Ensure customer_profiles record exists
          const existingProfile = await db.customer_profiles.findFirst({
            where: { user_id: existingUser.id },
          });
          if (!existingProfile) {
            const userUuid = existingUser.uuid || crypto.randomUUID();
            const referralCode = "REF" + userUuid.replace(/-/g, "").slice(0, 8).toUpperCase();
            await db.customer_profiles.create({
              data: {
                uuid: crypto.randomUUID(),
                user_id: existingUser.id,
                name: existingUser.name.slice(0, 255),
                email: existingUser.email?.slice(0, 255) ?? null,
                phone: existingUser.phone?.slice(0, 13) ?? null,
                profile_image: rawAvatar,
                is_whatsapp: false,
                referral_code: referralCode,
                is_active: true,
                status: true,
              },
            });
          }

          user.id = existingUser.uuid || existingUser.id.toString();
          user.role = existingUser.role?.name || "CUSTOMER";
          user.phone = existingUser.phone ?? null;
          user.status = existingUser.status;
          return true;
        }

        // New Google user: atomic creation with CUSTOMER role
        const userUuid = crypto.randomUUID();
        const rawName = (user.name || (profile as any)?.name || email.split("@")[0]).trim();
        const displayName = rawName.slice(0, 150);
        const rawAvatar = user.image || (profile as any)?.picture || null;
        const avatarUrl = rawAvatar ? rawAvatar.slice(0, 500) : null;

        try {
          const newUser = await db.$transaction(async (tx) => {
            const customerRole = await tx.role.findFirst({
              where: {
                OR: [
                  { slug: "customer" },
                  { name: "CUSTOMER" },
                  { id: BigInt(3) },
                ],
              },
            });

            const createdUser = await tx.user.create({
              data: {
                uuid: userUuid,
                name: displayName,
                email,
                avatar: avatarUrl,
                roleId: customerRole ? customerRole.id : BigInt(3),
                status: "active",
                is_active: true,
                email_verified_at: new Date(),
                last_login_at: new Date(),
              },
              include: { role: true },
            });

            const referralCode = "REF" + userUuid.replace(/-/g, "").slice(0, 8).toUpperCase();
            await tx.customer_profiles.create({
              data: {
                uuid: crypto.randomUUID(),
                user_id: createdUser.id,
                name: createdUser.name.slice(0, 255),
                email: createdUser.email ? createdUser.email.slice(0, 255) : null,
                phone: null,
                profile_image: rawAvatar,
                is_whatsapp: false,
                whatsapp_no: null,
                referral_code: referralCode,
                is_active: true,
                status: true,
              },
            });

            return createdUser;
          });

          user.id = newUser.uuid || newUser.id.toString();
          user.role = newUser.role?.name || "CUSTOMER";
          user.phone = null;
          user.status = newUser.status;
          return true;
        } catch {
          // Race-condition fallback: user was created concurrently
          const fallbackUser = await db.user.findFirst({
            where: { email },
            include: { role: true },
          });
          if (fallbackUser) {
            user.id = fallbackUser.uuid || fallbackUser.id.toString();
            user.role = fallbackUser.role?.name || "CUSTOMER";
            user.phone = fallbackUser.phone ?? null;
            user.status = fallbackUser.status;
            return true;
          }
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = (user.id as string) || "";
        token.role = (user as { role?: string }).role || "CUSTOMER";
        token.phone = (user as { phone?: string | null }).phone ?? null;
        token.status = (user as { status?: string }).status || "active";
      }

      // Safety fallback: ensure token has id and role from DB if missing
      if ((!token.id || !token.role) && token.email) {
        const dbUser = await db.user.findFirst({
          where: { email: token.email },
          include: { role: true },
        });
        if (dbUser) {
          token.id = dbUser.uuid || dbUser.id.toString();
          token.role = dbUser.role?.name || "CUSTOMER";
          token.phone = dbUser.phone ?? null;
          token.status = dbUser.status;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as any;
        sessionUser.id = token.id as string;
        sessionUser.role = token.role as string;
        sessionUser.phone = (token.phone as string | null) ?? null;
        sessionUser.status = token.status as string;
      }
      return session;
    },
  },
});

