import path from 'path';
import nodeFetch from 'node-fetch';
import matter from 'gray-matter';
import { getSharedConfig } from './getSharedConfig';

export const getPage = async pathname => {
  const url = path.join('http://localhost:8080', pathname);
  const result = await nodeFetch(url);
  const text = await result.text();
  const { data: frontmatter, content: source } = matter(text);
  const sharedConfig = await getSharedConfig(pathname);

  return { frontmatter: { ...frontmatter, sharedConfig }, source };
};
