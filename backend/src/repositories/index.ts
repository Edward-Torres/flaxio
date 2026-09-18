import { prisma } from '../lib/prisma';
import { ApiError } from '../utils';

export const userRepo = {
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  create: (data: { email: string; passwordHash: string; name: string }) =>
    prisma.user.create({ data }),
  updatePassword: (id: string, passwordHash: string) =>
    prisma.user.update({ where: { id }, data: { passwordHash } }),
};
