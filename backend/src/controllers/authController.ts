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
    `${REFRESH_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=${maxAge}`
  );
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { name, email, password } = req.body as { name: string; email: string; password: string };
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new ApiError(409, 'Ya existe un usuario con ese email.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, createdAt: true },
    });
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
    setRefreshCookie(res, refreshToken, env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60);
    res.status(201).json({ accessToken, expiresIn: 900, user });
  },

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError(401, 'Credenciales incorrectas.');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Credenciales incorrectas.');
    }
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
    setRefreshCookie(res, refreshToken, env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60);
    res.json({
      accessToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, name: user.name },
    });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.flaxio_refresh;
    if (!token) throw new ApiError(401, 'Sesión expirada.');
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
      setRefreshCookie(res, newRefreshToken, env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60);
      res.json({ accessToken, expiresIn: 900 });
    } catch {
      throw new ApiError(401, 'Sesión expirada.');
    }
  },

  async logout(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.flaxio_refresh;
    if (token) {
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
        await prisma.refreshToken.updateMany({
          where: { userId: payload.sub, revoked: false },
          data: { revoked: true },
        });
      } catch {
        // ignore
      }
    }
    res.setHeader(
      'Set-Cookie',
      'flaxio_refresh=; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=0'
    );
    res.status(204).end();
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.json(user);
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new ApiError(401, 'No autorizado.');
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) throw new ApiError(404, 'Usuario no encontrado.');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Contraseña actual incorrecta.');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.status(204).end();
  },
};
