import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`▶ Flaxio API en http://localhost:${env.PORT} (${process.env.NODE_ENV || 'development'})`);
});

function shutdown(signal: string): void {
  console.log(`\n${signal} recibido, cerrando servidor...`);
  server.close(() => {
    prisma.$disconnect().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
