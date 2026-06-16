import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Next 16 renamed the `middleware` convention to `proxy`.
// next-auth's `auth` is the request handler; the `authorized` callback gates routes.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ['/admin/:path*'],
};
