import { cookies } from 'next/headers';
import { verifyJwt } from './auth';
import { prisma } from './prisma';

export async function checkAdmin(requiredPermission?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) return { error: 'Unauthorized', status: 401 };

  const payload = await verifyJwt(token);
  if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'PRO')) return { error: 'Unauthorized', status: 401 };

  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
    select: { adminPermissions: true, id: true, email: true, firstName: true, lastName: true }
  });

  if (!user) return { error: 'Unauthorized', status: 401 };

  const perms = user.adminPermissions || [];
  // Legacy admins without specific permissions get SUPER_ADMIN
  const isSuperAdmin = perms.includes('SUPER_ADMIN') || perms.length === 0;

  if (requiredPermission && !isSuperAdmin && !perms.includes(requiredPermission)) {
    return { error: 'Forbidden: Missing permission ' + requiredPermission, status: 403 };
  }

  return { user: { ...user, permissions: perms, isSuperAdmin } };
}
