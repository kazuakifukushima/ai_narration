FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate storage directories
RUN mkdir -p data public/audio public/uploads

# Build Next.js app and Custom Server
# Note: npm run build runs "next build && tsc --project tsconfig.server.json"
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create writable directories for data persistence (if volume mounted)
RUN mkdir -p data public/audio public/uploads
RUN chown -R nextjs:nodejs data public/audio public/uploads

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Ensure uploads directory is writable
RUN mkdir -p public/uploads public/audio && chown -R nextjs:nodejs public/uploads public/audio

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# BUT we are using a custom server, so we need to copy necessary files manually 
# or use the standalone output if we can adapt it. 
# For simplicity with Custom Server + WS, we will copy .next and node_modules.
# Optimizing node_modules for prod:
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/package.json ./package.json

# Copy compiled custom server
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./server.js

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
