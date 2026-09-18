import { Prisma } from '@prisma/client';
import { ApiError } from './ApiError';

export function handlePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      throw new ApiError(409, 'Ya existe un registro con ese valor único.');
    }
    if (err.code === 'P2025') {
      throw new ApiError(404, 'El registro no existe.');
    }
  }
  throw err;
}
