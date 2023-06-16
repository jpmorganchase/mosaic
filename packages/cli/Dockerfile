FROM jetae-publish.prod.aws.jpmchase.net/container-base/managedbaseimages/nodejs:18-stable as base
RUN microdnf update && microdnf install -y shadow-utils tar curl git
RUN npm install -g yarn@1.22.10
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn --frozen-lockfile && yarn cache clean --all;
# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build:cli
# Production image, copy all the files and run mosaic
FROM base AS runner
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 mosaicfs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder --chown=mosaicfs:nodejs /app/dist ./
COPY --from=builder --chown=mosaicfs:nodejs /app/mosaic.config.mjs ./
RUN chown mosaicfs:nodejs ./

USER mosaicfs:nodejs
EXPOSE 8080
ENV PORT=8080
CMD ["sh", "-c", "node index.mjs serve -c ./mosaic.config.mjs --port ${PORT}"]