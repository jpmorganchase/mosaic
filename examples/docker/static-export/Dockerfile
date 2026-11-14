# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# The root context includes every workspace manifest and the pinned Yarn release.
COPY . .
RUN corepack enable && yarn install --immutable
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build
ENV MOSAIC_MODE=snapshot-file MOSAIC_SNAPSHOT_DIR=snapshots/latest
RUN yarn workspace @jpmorganchase/mosaic-site build:static:file

FROM nginx:1.27-alpine AS runner

# Drop the default site config and ship our own. `try_files $uri $uri.html`
# is the only trick needed to make App Router static export work with
# clean URLs (e.g. /mosaic/index → mosaic/index.html).
COPY --from=builder /app/packages/site/out /usr/share/nginx/html
COPY <<'NGINX' /etc/nginx/conf.d/default.conf
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # Allow clean URLs (no .html suffix).
  location / {
    try_files $uri $uri.html $uri/ /404.html;
  }

  # Long cache for fingerprinted assets.
  location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  error_page 404 /404.html;
}
NGINX

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

