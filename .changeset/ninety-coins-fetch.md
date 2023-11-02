---
'@jpmorganchase/mosaic-plugins': patch
'@jpmorganchase/mosaic-site': patch
---

## Feature - Advanced Sidebar Sorting

Given a directory of pages, you can provide a sidebar sort config in the frontmatter of the directory index page which will be used to sort the other pages in the directory.

The sort config consists of:

- field: the path, separated by a '/', to the page metadata you want to use for sorting e.g. title or data/publicationDate
- dataType: 'string' or 'number' or 'Date'
- arrange: 'asc' or 'desc'

Note that a page can still specify its sidebar priority and this will overrule any sort config specified in the index page.

## Example

Let's say you have a "Newsletters" directory which has an index page and multiple newsletter pages in the same directory.

Each newsletter page has a data property which includes the publication date of the newsletter.

To order the newsletters in the sidebar in descending order (the newest newsletter first):

Add the following to the **index** page frontmatter:

```
sharedConfig:
  sidebar:
    sort:
      field: data/publicationDate
      dataType: date
      arrange: desc
```
