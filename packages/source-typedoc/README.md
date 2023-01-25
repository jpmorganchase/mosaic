# PullDocs Typedoc source

PullDocs' Typedoc source is a `sourceDefinition` for `@jpmdevconsole/pull-docs`.

PullDocs will use this source to translate HTML docs created using (Typedocs)[https://typedoc.org/] and
populate the VFS.

The responsibility of the source definitions is to:

- Pull together the data they want to go into the virtual file system (as MDX content + JSON metadata)
- Watch for changes to those files and notify PullDocs of any changes

| Name              | Path                                    | Options                                                                                                                                                    |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bitbucket Typedoc | @jpmdevconsole/pull-docs-source-typedoc | <ul><li>targetFolders: string[]</li><li>repoBranch: string</li><li>repoUrl: string</li><li>subfolder?: string</li><li>checkIntervalMins?: number</li></ul> |

## Further reading

Refer to the (Developer Contribution Guide)[http://go/developer/site/contribution/pull-docs/sources] to see how to configure your repo as a Typedoc source.
