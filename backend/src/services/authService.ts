import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils';
import { asyncHandler } from '../utils';

const REFRESH_COOKIE = 'flaxio_refresh';

function setRefreshCookie(res: Response, token: string, maxAge: number): void {
  res.setHeader(
    'Set-Cookie',
    `${REFRESH_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=${maxAge}`
  );
}

export const authService = {
  async register(data: { name: string; email: string; password: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, 'Ya existe un usuario con ese email.');
    const passwordHash = await bcrypt.hash(data.password, 12);
    return prisma.user.create({
      data: { email: data.email, passwordHash, name: data.name },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ApiError(401, 'Credenciales incorrectas.');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Credenciales incorrectas.');
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_TTL } as jwt.SignOptions
    );
    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      env.JWT_SECRET,
      { expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d` } as jwt.SignOptions
    );
    await prisma.refreshToken.create({
      data: {
        tokenHash: Buffer.from(refreshToken).toString('hex'),
        userId: user.id,
        expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } };
  },

   async refresh(token: string) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; type: string };
      if (payload.type !== 'refresh') throw new Error();
      const stored = await prisma.refreshToken.findFirst({
        where: { userId: payload.sub, revoked: false, expiresAt: { gt: new Date() } },
      });
      if (!stored || stored.tokenHash !== Buffer.from(token).toString('hex')) {
        throw new Error();
      }
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      const newRefreshToken = jwt.sign(
        { sub: payload.sub, type: 'refresh' },
        env.JWT_SECRET,
        { expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d` } as jwt.SignOptions
      );
      await prisma.refreshToken.create({
        data: {
          tokenHash: Buffer.from(newRefreshToken).toString('hex'),
          userId: payload.sub,
          expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
        },
      });
      const accessToken = jwt.sign(
        { sub: payload.sub, email: '' },
        env.JWT_SECRET,
        { expiresIn: env.JWT_ACCESS_TTL } as jwt.SignOptions
      );
      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new ApiError(401, 'Sesión expirada.');
    }
  },

  async logout(token: string) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
      await prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revoked: false },
        data: { revoked: true },
      });
    } catch {
      // ignore
    }
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'Usuario no encontrado.');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Contraseña actual incorrecta.');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },
};
