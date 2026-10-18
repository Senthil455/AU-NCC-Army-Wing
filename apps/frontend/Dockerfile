# Build context must be the repository root so npm workspaces resolve.
# The root package-lock.json is the single source of truth for every workspace.
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./
COPY packages/shared/package.json ./
RUN npm ci --workspace ncc-frontend --workspace @ncc/shared
COPY apps/frontend ./apps/frontend
COPY packages/shared ./packages/shared
WORKDIR /app/apps/frontend
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]