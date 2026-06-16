import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from '@/auth.config';

/**
 * Full Auth.js instance (Node.js runtime).
 *
 * Phase 1 implements `authorize`: look up the user by email, verify the
 * Argon2 password hash, reject inactive accounts, and return
 * `{ id, email, name, role }`. For Phase 0 it returns null (sign-in is wired
 * but intentionally inert until Phase 1).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async () => {
        // TODO(Phase 1): validate input, query `users`, verify hash, gate on `active`.
        return null;
      },
    }),
  ],
});
