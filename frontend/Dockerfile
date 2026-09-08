# ─── base ────────────────────────────────────────────────────────────────
FROM node:24-alpine AS base
WORKDIR /app

# ─── dev — Vite HMR ─────────────────────────────────────────────────────────
FROM base AS dev
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ─── build — type-check and bundle static assets ───────────────────────────
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── production — Nginx serving static assets ──────────────────────────────
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
