---
'@jpmorganchase/mosaic-cli': major
'@jpmorganchase/mosaic-content-editor-plugin': minor
'@jpmorganchase/mosaic-core': patch
'@jpmorganchase/mosaic-types': major
'@jpmorganchase/mosaic-workflows': major
---

Run editor saves over HTTP and Server-Sent Events instead of a WebSocket

Some infrastructure doesn't allow WebSockets but does allow Server-Sent
Events (SSE). Saves now start with a plain HTTP request and stream their
progress over SSE, which also reconnects by itself and resumes where it
left off.

### Breaking changes

**`@jpmorganchase/mosaic-cli`**

- The `/workflows` WebSocket endpoint is removed, along with the
  `@fastify/websocket` and `md5` dependencies. Start a workflow with
  `POST /workflows/jobs` (JSON body: `name`, `user`, `route`, `markdown`,
  and optionally `frontmatter`, `targetRoute` and `isNewPage`), which
  responds `202 { jobId }`. Follow it with
  `GET /workflows/jobs/:jobId/events?user=<user id>`, a `text/event-stream`
  of `progress` events and a final `done` event with
  `{ status: 'SUCCESS' | 'ERROR', message }`. Reconnecting with
  `Last-Event-ID` replays only the missed events.
- Both endpoints need `MOSAIC_WORKFLOWS_SECRET` as a bearer token
  (`Authorization: Bearer <secret>`) instead of a `token` in each message.
  They respond `503` when the secret isn't configured and `401` when it is
  wrong. Invalid requests get `400 { error }`, a missing page `404` and an
  existing new page `409`; the `channel` field is gone.
- `MOSAIC_WORKFLOWS_TIMEOUT_MS` (default 5 minutes) is now read by the
  CLI, which fails jobs that run longer. Values must be integers from
  1 to 2147483647. The site no longer reads it.
- Jobs are kept in memory (finished jobs for 10 minutes, at most 100 jobs
  and 500 events per job), so they are lost when the CLI restarts. With
  several CLI instances, a job's events must be read from the instance
  that started it.

**Reference site (`packages/site`)**

- `MOSAIC_WORKFLOWS_URL` is the CLI's base HTTP URL, e.g.
  `http://localhost:8080`. A trailing `/workflows` is dropped. A `ws://` /
  `wss://` URL still works: it is converted to `http://` / `https://` and
  a deprecation warning is logged once.
- The `persistContent` Server Action is replaced by `startSave`, which
  returns `{ jobId }` or `{ error }`. The new
  `/api/workflows/[jobId]/events` route streams the save's progress to the
  signed-in editor who started it. Proxies must not buffer
  `text/event-stream` responses.

**`@jpmorganchase/mosaic-types`**

- `SourceWorkflowMessageEvent` no longer has a `channel` field.

**`@jpmorganchase/mosaic-workflows`**

- GitHub and Bitbucket workflows send `COMPLETE` with
  `{ pullRequestUrl }` instead of provider-specific response data. Custom
  event consumers should read this browser-facing URL. The action return
  values are unchanged, and `subscribeToSave` still accepts older GitHub
  URL strings and Bitbucket `links.self` messages.

### Fixes

- Saving an existing page no longer reports "Workflow save has started"
  when no source owns the page: the CLI now waits for the workflow and
  reports its real outcome. `triggerWorkflow` in
  `@jpmorganchase/mosaic-core` resolves when the workflow finishes rather
  than when it starts.
- Actions returning `false` or reporting `ERROR` remain failed through
  the source and job layers instead of being reported as successful.
- GitHub and Bitbucket saves accept a new page with frontmatter and an
  empty body, as the editor does. Empty edits are still rejected.
- The editor shows a successful result and disables repeat submission
  even when the successful workflow returns no pull request URL.

### Additions

- `@jpmorganchase/mosaic-content-editor-plugin`: `subscribeToSave(jobId)`
  follows a save over SSE as the `PersistEvent`s that `<Editor persist>`
  returns, letting `EventSource` reconnect a few times before reporting an
  error. The `PersistEvent` type is exported too. The `persist` prop is
  unchanged.
