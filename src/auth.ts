import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  clearFailures,
  isLockedOut,
  recordFailure,
} from "@/lib/login-throttle";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Household",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const db = getDb();
        const emailKey = parsed.data.email.toLowerCase();

        // Throttle by email whether or not the account exists, so a lockout
        // doesn't reveal which emails are registered.
        if (await isLockedOut(db, emailKey)) throw new TooManyAttempts();

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, emailKey))
          .limit(1);

        const ok = user
          ? await compare(parsed.data.password, user.passwordHash)
          : false;
        if (!user || !ok) {
          await recordFailure(db, emailKey);
          return null;
        }
        await clearFailures(db, emailKey);

        return {
          id: user.id,
          email: user.email,
          householdId: user.householdId,
        };
      },
    }),
  ],
  // Helps cookies work on the Vercel HTTPS production domain
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
