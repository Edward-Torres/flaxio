# ===== Etapa de build =====
FROM node:20-slim AS build
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ===== Etapa de runtime (sin devDependencies) =====
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 1001 appuser

COPY prisma ./prisma
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npx prisma generate

COPY --from=build /app/dist ./dist
COPY entrypoint.sh ./entrypoint.sh

RUN mkdir -p /app/uploads \
    && chown -R appuser:appuser /app \
    && chmod +x /app/entrypoint.sh

USER appuser
EXPOSE 4000

ENTRYPOINT ["./entrypoint.sh"]
