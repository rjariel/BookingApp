import 'server-only';
import { hash, verify } from '@node-rs/argon2';

const OPTIONS = {
  memoryCost: 19456, // 19 MiB — OWASP minimum
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

export const hashPassword = (plain: string) => hash(plain, OPTIONS);

export const verifyPassword = (hash: string, plain: string) => verify(hash, plain, OPTIONS);
