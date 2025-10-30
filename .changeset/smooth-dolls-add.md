---
'@jpmorganchase/mosaic-cli': patch
'@jpmorganchase/mosaic-schemas': patch
'@jpmorganchase/mosaic-types': patch
'@jpmorganchase/mosaic-workflows': patch
---

Feat: add GithubPullRequestWorkflow

This workflow requires a [fine-grained github personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) so that the github rest API can be used to create Pull Requests.
