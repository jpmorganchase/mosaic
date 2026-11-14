FROM node:24-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# The root context includes every workspace manifest and the pinned Yarn release.
COPY . .
RUN corepack enable && yarn install --immutable
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

FROM node:24-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
# Keep workspace targets for the node_modules links and dynamically loaded plugins.
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/packages/cli/mosaic.config.mjs ./mosaic.config.mjs
COPY --from=builder /app/packages/cli/fs.config.js ./fs.config.js
RUN mkdir .tmp && chown node:node .tmp
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["sh", "-c", "exec node packages/cli/dist/index.mjs serve -c ./mosaic.config.mjs --host 0.0.0.0 --port \"$PORT\""]
