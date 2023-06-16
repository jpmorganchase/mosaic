---
'@jpmorganchase/mosaic-site-middleware': patch
---

fix: remove env variable check in `withSession` middleware

The `NEXTAUTH_SECRET` env variable is not always required. It is possible to pass the secret as an option to `next-auth`
