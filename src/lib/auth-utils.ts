import { auth } from '@/auth';

export async function requireAdmin(): Promise<string> {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new Error('Unauthorized: Not authenticated');
    }

    if (!session.user.id) {
      throw new Error('Unauthorized: Missing user ID');
    }

    if (session.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    return session.user.id;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Unauthorized: Session error');
  }
}

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === 'admin';
}
