import { compileMDX } from './compileMdx';
import { MosaicMiddleware } from './createMiddlewareRunner';
import MiddlewareError from './MiddlewareError';
/**
 *  [[`ContentProps`]] specifies the page source/content
 */
export interface ContentProps {
  /** Page source, which will be page type specific */
  source?: Record<string, unknown>;
  /** Page type */
  type?: string;
  /** Raw page content, includes markdown and frontmatter */
  raw?: string;
}

/**
 * Adds the [[`ContentProps`]] object to the page props
 * @param context
 */
export const withContent: MosaicMiddleware<ContentProps> = async context => {
  const { resolvedUrl } = context;
  try {
    const req = await fetch(`http://localhost:8080${resolvedUrl}`);

    if (req.ok) {
      const contentType = req.headers.get('content-type');
      if (contentType && contentType.includes('/mdx')) {
        const text = await req.text();
        const mdxSource = await compileMDX(text);
        return { props: { type: 'mdx', source: mdxSource, raw: text } };
      }
      if (contentType && contentType.includes('/json')) {
        const json = await req.json();
        return { props: { type: 'json', ...json } };
      }
      // If redirect url was returned
    } else if (req.status === 302) {
      return {
        redirect: {
          destination: (await req.json()).redirect,
          permanent: true
        }
      };
    }
  } catch (error: Error) {
    console.error(error.message);
    throw new MiddlewareError(500, resolvedUrl, [error.message], { show500: true });
  }
  throw new MiddlewareError(404, resolvedUrl, [`Could not find any content for ${resolvedUrl}`], {
    show404: true
  });
};
