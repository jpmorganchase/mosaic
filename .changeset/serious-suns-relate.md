---
'@jpmorganchase/mosaic-site': patch
'@jpmorganchase/mosaic-workflows': patch
---

Fix Bitbucket Pull Request Workflow

Create a new repo instance every time the workflow is triggered to prevent the wrong source being used to raise the PR.
