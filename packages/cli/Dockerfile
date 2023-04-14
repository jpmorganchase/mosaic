FROM node:18-alpine AS  base
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock* ./
RUN  yarn --frozen-lockfile && yarn cache clean --all;

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build:cli


# Production image, copy all the files and run mosaic
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mosaicfs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder --chown=mosaicfs:nodejs /app/dist ./
COPY --from=builder --chown=mosaicfs:nodejs /app/mosaic.config.mjs ./
RUN mkdir ./docs
RUN chown -R mosaicfs:nodejs ./docs
RUN chown mosaicfs:nodejs ./

USER mosaicfs:nodejs
EXPOSE 8080

ENV PORT=8080

CMD ["node", "index.mjs", "serve", "-c", "./mosaic.config.mjs", "-p", "8080"]