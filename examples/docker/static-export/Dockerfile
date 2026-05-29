# syntax=docker/dockerfile:1.7
#
# examples/docker/static-export/Dockerfile
#
# Two-stage build that produces a static-only Mosaic site served by nginx.
# Requires `MOSAIC_MODE=snapshot-file` or `MOSAIC_MODE=snapshot-s3` at build
# time (active mode cannot be statically exported).
#
# The resulting image has NO Node.js runtime — only nginx serving the
# pre-rendered HTML/JS/CSS from `out/`.

# ---- builder ----------------------------------------------------------------
FROM node:24-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies (cached layer)
COPY package.json yarn.lock* ./
RUN yarn --frozen-lockfile && yarn cache clean --all;

# Source
COPY . .

# Snapshots (file mode). For snapshot-s3, omit this COPY and provide
# MOSAIC_SNAPSHOT_S3_BUCKET / AWS creds via --build-arg + RUN secrets.
ARG MOSAIC_MODE=snapshot-file
ENV MOSAIC_MODE=$MOSAIC_MODE
ENV NEXT_TELEMETRY_DISABLED=1

# build:static:file applies the API-route stubs, runs `next build` with
# MOSAIC_OUTPUT=export, and reverts the stubs whether the build succeeds
# or fails. The result lands in packages/site/out/.
RUN if [ "$MOSAIC_MODE" = "snapshot-s3" ]; then \
      yarn workspace @jpmorganchase/mosaic-site build:static:s3; \
    else \
      yarn workspace @jpmorganchase/mosaic-site build:static:file; \
    fi

# ---- runtime ----------------------------------------------------------------
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

