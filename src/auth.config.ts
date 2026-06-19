import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe Auth.js config (no DB, no Node-only deps) so it can run inside
 * middleware. The Credentials provider — which needs the DB and Argon2 — is
 * added in `auth.ts`, which runs on the Node.js runtime.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isProtected = nextUrl.pathname.startsWith('/admin');
      if (isProtected) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
