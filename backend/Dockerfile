# ─── base ────────────────────────────────────────────────────────────────
FROM node:24-alpine AS base
WORKDIR /app

# ─── dev — hot reload via nest start --watch ───────────────────────────────
FROM base AS dev
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
CMD ["npm", "run", "start:dev"]

# ─── build — compile TypeScript to dist/ ───────────────────────────────────
FROM base AS build
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

# ─── production — minimal runtime image ────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY prisma.config.ts ./prisma.config.ts
EXPOSE 3000
CMD ["node", "dist/src/main"]
