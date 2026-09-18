import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { ApiError } from '../utils';

// Contexto por-request: se popula en `requireAuth` con el userId verificado del JWT.
// El middleware `$use` abajo usa este store para setear el GUC `app.user_id`
// (SET LOCAL dentro de transaccion) que consumen las policies de RLS.
export interface RlsContext {
  userId: string;
  // flag de reentrada: evita que el re-dispatch dentro de $transaction vuelva a
  // envolver la query en otra transaccion (y evita recursion infinita).
  rls?: boolean;
}

export const requestStore = new AsyncLocalStorage<RlsContext>();

const prisma = new PrismaClient();

// Modelos de auth NO estan bajo RLS (acceso service) -> se bypass del middleware.
const BYPASS_MODELS = new Set<string>(['User', 'RefreshToken']);

prisma.$use(async (params, next) => {
  if (!params.model || BYPASS_MODELS.has(params.model)) {
    return next(params);
  }
  const store = requestStore.getStore();
  const userId = store?.userId;
  if (!userId) {
    // No hay usuario en contexto y la tabla esta bajo RLS -> denegar por defecto.
    throw new ApiError(401, 'No autorizado. (RLS)');
  }
  if (store.rls) {
    // Ya estamos dentro de una transaccion con el GUC seteado -> ejecutar nativo.
    return next(params);
  }
  // Envolver la query en una transaccion y setear el GUC de forma
  // transaccional (SET LOCAL) para que no se filtre entre conexiones del pool.
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return await requestStore.run({ userId, rls: true }, async () => {
      const model: any = (tx as any)[params.model as string];
      return await model[params.action as string](params.args);
    });
  });
});

export { prisma };
