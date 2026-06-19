import { eq, or } from 'drizzle-orm';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { authConfig } from '@/auth.config';
import { db } from '@/db';
import { roles, users } from '@/db/schema';
import { verifyPassword } from '@/lib/password';

const credentialsSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  jwt: { maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        login: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { login, password } = parsed.data;
        const normalized = login.toLowerCase();

        const [user] = await db
          .select()
          .from(users)
          .where(or(eq(users.email, normalized), eq(users.username, normalized)))
          .limit(1);

        if (!user?.active) return null;

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) return null;

        // Load the role name if a role is assigned
        let roleName: string | undefined;
        if (user.roleId) {
          const role = await db.query.roles.findFirst({ where: eq(roles.id, user.roleId) });
          roleName = role?.name;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          roleId: user.roleId ?? undefined,
          roleName,
        };
      },
    }),
  ],
  callbacks: {
    // Keep the edge-safe authorized guard from authConfig.
    authorized: authConfig.callbacks?.authorized,
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
      }
      return token;
    },
    session({ session, token }) {
      // Preserve user.id (set from token.sub by default in authConfig).
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role as 'admin' | 'staff' | 'client';
      session.user.roleId = token.roleId as string | undefined;
      session.user.roleName = token.roleName as string | undefined;
      return session;
    },
  },
});
