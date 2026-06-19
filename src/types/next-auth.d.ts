import type { DefaultSession } from 'next-auth';

type Role = 'admin' | 'staff' | 'client';

declare module 'next-auth' {
  interface User {
    role: Role;
    roleId?: string;
    roleName?: string;
  }
  interface Session {
    user: {
      role: Role;
      roleId?: string;
      roleName?: string;
    } & DefaultSession['user'];
  }
}

// JWT is defined in @auth/core/jwt; next-auth/jwt only re-exports it.
declare module '@auth/core/jwt' {
  interface JWT {
    role?: Role;
    roleId?: string;
    roleName?: string;
  }
}
