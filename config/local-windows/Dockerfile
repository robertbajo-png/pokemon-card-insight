FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN npm install --global npm@10.9.9
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG LOCAL_PUBLIC_URL
ARG LOCAL_ANON_KEY
ENV VITE_SUPABASE_URL=$LOCAL_PUBLIC_URL VITE_SUPABASE_PUBLISHABLE_KEY=$LOCAL_ANON_KEY VITE_HOSTING_MODE=local
RUN npm run build
RUN node scripts/build-local-functions.mjs

FROM nginxinc/nginx-unprivileged:1.28-alpine@sha256:7377697a821c131a924a7105fafbe7414db4e9fcc77a6f08f776f33f141ec3f8 AS web
COPY --from=build /app/dist /usr/share/nginx/html
COPY config/local-windows/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080

FROM node:22-bookworm-slim AS functions
WORKDIR /app
COPY --from=build /app/.local-build/functions/server.mjs ./server.mjs
USER node
CMD ["node", "--max-old-space-size=192", "server.mjs"]
