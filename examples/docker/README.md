# Docker examples

Build all examples from the repository root. The Dockerfiles use the checked-in
Yarn release and all workspace manifests, build internal packages, then build
the site when required. `.dockerignore` excludes local dependencies, generated
builds, Git metadata, audit worktrees and local environment overrides.

- [Active mode](active-mode/): separate content and site containers.
- [Snapshot mode](snapshot-mode/): a standalone Next server with a local snapshot.
- [Static export](static-export/): pre-rendered files served by nginx.

Run the same clean builds and HTTP checks used in CI:

```sh
bash examples/docker/smoke.sh active
bash examples/docker/smoke.sh snapshot
bash examples/docker/smoke.sh static
```

The active check makes an HTTP request from the site container to the content
server, then all modes verify that a documentation page is served. The script
removes its containers and network on exit and prints container logs on failure.

Root Turbo commands retain strict environment filtering. Build-affecting Mosaic
settings participate in cache keys; auth secrets also participate because their
presence enables the rendered auth gate. Runtime-only credentials pass through
to uncached serve/start tasks, including GitHub OAuth settings. Snapshot generation
is uncached because its source content can change independently of repository files.
