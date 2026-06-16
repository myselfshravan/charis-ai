# ── Build stage: install everything and build the frontend ──────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime stage: only what's needed to serve ──────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
EXPOSE 8787
# Secrets (GROQ_API_KEY, MCP_AUTH_TOKEN, …) come from the runtime env, not the image.
CMD ["node", "server/index.js"]
