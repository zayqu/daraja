import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/password-auth";
import { isOwnerEmail } from "@/lib/platform-roles";

const providers = [];
const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;

if (process.env.AUTH_LINKEDIN_ID && process.env.AUTH_LINKEDIN_SECRET) {
  providers.push(LinkedIn({
    clientId: process.env.AUTH_LINKEDIN_ID,
    clientSecret: process.env.AUTH_LINKEDIN_SECRET,
    authorization: { params: { scope: "openid profile email" } },
    // LinkedIn OIDC can return a verified primary email. The signIn callback
    // below only permits same-email account linking when LinkedIn explicitly
    // marks that email as verified.
    allowDangerousEmailAccountLinking: true,
  }));
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    // Google verifies its addresses, so a Google sign-in may join an
    // existing Daraja account with the same email (see signIn below).
    allowDangerousEmailAccountLinking: true,
  }));
}

export const authProviders = providers.map((provider) => provider.id);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    // Email + password sign-in lives in app/api/account (lib/password-auth.js)
    // and creates the same database sessions; suspended accounts are refused
    // on both paths.
    async signIn({ user, account, profile }) {
      if (!user?.email) return false;
      const existing = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { id: true, suspendedAt: true, emailVerified: true },
      });
      if (existing?.suspendedAt) return false;
      if (
        existing &&
        account?.provider === "linkedin" &&
        profile?.email_verified !== true
      ) {
        return false;
      }
      // An unconfirmed password sign-up may have been made by someone else;
      // the Google owner of the address takes it over and its password is
      // cleared.
      if (existing && !existing.emailVerified && ["google", "linkedin"].includes(account?.provider)) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { emailVerified: new Date(), password: null },
        });
      }
      return true;
    },
    async session({ session, user }) {
      let role = user.role;
      // The owner account always administers Daraja; granted once, audited.
      // Every session here proves the email: password accounts cannot sign in
      // until the email is confirmed, and Google confirms its own addresses.
      if (role !== "ADMIN" && isOwnerEmail(user.email)) {
        await prisma.$transaction([
          prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } }),
          prisma.auditEvent.create({
            data: {
              actorUserId: user.id,
              action: "OWNER_ADMIN_GRANTED",
              entityType: "User",
              entityId: user.id,
              metadata: { previousRole: role },
            },
          }),
        ]);
        role = "ADMIN";
      }
      session.user.id = user.id;
      session.user.role = role;
      return session;
    },
  },
});
