---
'@jpmorganchase/mosaic-site-components': minor
---

Make authentication optional for Mosaic UI. Hosts without sign-in no longer need `next-auth` or a session provider. Use `MosaicAuthProvider` and `useMosaicAuth` for a host-owned authentication integration.

Auth.js hosts must add `NextAuthAdapter` from `@jpmorganchase/mosaic-site-components/auth/next-auth` inside their existing `SessionProvider`. A `SessionProvider` alone no longer connects the header or metadata to authentication. The adapter preserves the login flag and sign-in/sign-out callback behavior. Server-side authorization is unchanged.
