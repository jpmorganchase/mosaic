---
'@jpmorganchase/mosaic-cli': minor
'@jpmorganchase/mosaic-core': minor
'@jpmorganchase/mosaic-source-git-repo': minor
'@jpmorganchase/mosaic-types': minor
---

Refresh git repo sources as soon as Bitbucket reports a push

### Additions

**`@jpmorganchase/mosaic-cli`**

- `POST /_mosaic_/webhooks/bitbucket` receives Bitbucket Data Center
  "Repository → Push" webhooks. It refreshes the running git repo sources
  whose `repo` (project key and slug, in any of the `/scm/`, SSH or
  `/projects/…/repos/…` URL forms) and `branch` match the push, so merged
  changes appear within seconds instead of at the next scheduled check
  (30 minutes by default). Pushes within 5 seconds of each other refresh a
  source once. The CLI replies `202` straight away and refreshes in the
  background; the site is then revalidated as for any other update.
- The endpoint only exists when `MOSAIC_BITBUCKET_WEBHOOK_SECRET` is set. It
  doesn't use `MOSAIC_ADMIN_SECRET`: requests must carry a valid
  `X-Hub-Signature` (HMAC-SHA256 of the body with the secret) or get `401`.
  Bodies are capped at 1 MB.

**`@jpmorganchase/mosaic-core`**

- `refreshSource(name)` asks a running source to check for changes now.
  Unlike `restartSource`, the source keeps serving its pages and its caches.
  It resolves to `false` for sources that can't refresh on demand.
- `getSourceDefinition(name)` returns the definition a running source was
  started with.

**`@jpmorganchase/mosaic-types`**

- Sources can implement an optional `refresh(options)` hook, which
  `refreshSource` calls in the source's worker.

**`@jpmorganchase/mosaic-source-git-repo`**

- Implements `refresh`: it fetches and pulls new commits the same way a
  scheduled check does.
- `Repo.checkForChanges()` runs that check on demand. Checks no longer
  overlap: one requested while another runs (a webhook during a scheduled
  fetch) runs once more afterwards.

Scheduled checks are unchanged and remain the fallback for missed
deliveries. See "Refresh on push" in the git repo source docs.
