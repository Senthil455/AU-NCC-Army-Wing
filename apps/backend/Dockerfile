# Build context must be the repository root so npm workspaces resolve.
# The root package-lock.json is the single source of truth for every workspace.
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./
COPY packages/shared/package.json ./
RUN npm ci --workspace @ncc/backend --workspace @ncc/shared --omit=dev
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build
EXPOSE 4000
CMD ["node", "dist/server.js"]