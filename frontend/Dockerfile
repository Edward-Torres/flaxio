# Multi-stage: builder + runtime ligero
FROM node:20-slim AS build
WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime: nginx sirve el build
FROM nginx:1.27-alpine

RUN addgroup -g 1001 nginx || true
RUN adduser -S -D -H -u 1001 -G nginx nginx || true

COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-entrypoint.sh /docker-entrypoint.d/99-inject-backend-upstream.sh

RUN chmod +x /docker-entrypoint.d/99-inject-backend-upstream.sh \
    && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /tmp \
    && chmod 700 /var/cache/nginx \
    && chmod 644 /etc/nginx/conf.d/default.conf

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
