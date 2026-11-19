---
'@jpmorganchase/mosaic-workflows': patch
---

Format saved pages with the repository's Prettier configuration. The editor writes Markdown in its own style (`*emphasis*`, four-space nested lists, no blank line after the frontmatter), so in a repository formatted with Prettier every save reformatted lines the author never touched, and the pull request could fail the repository's `prettier --check`. When the repository has a Prettier configuration, `GitHubPullRequestWorkflow` and `BitbucketPullRequestWorkflow` now format the page with it before committing, respecting `.prettierignore`. Repositories without one are unchanged, and a page Prettier can't format is saved as written.
