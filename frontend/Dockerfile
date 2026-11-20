# ─── base ────────────────────────────────────────────────────────────────
FROM node:26-alpine AS base
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
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Error tracking: an empty DSN builds a bundle that reports nothing
ARG VITE_SENTRY_DSN=
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT=development
ENV VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT
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
