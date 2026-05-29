/**
 * Server-rendered MDX body.
 *
 * Pipeline:
 *   1. Server (here): `serializeMdxForClient` compiles MDX into a
 *      JSON-safe `{ compiledSource, frontmatter, scope }` payload.
 *   2. The payload crosses the RSC boundary as plain props.
 *   3. Client (`<MdxRenderer />`): `next-mdx-remote-client`'s
 *      `<MDXClient />` evaluates the compiled source and renders it
 *      with the locally-imported MDX component registry.
 *
 * Why this shape:
 *   - Heavy work (parse / transform / compile MDX) stays on the server.
 *   - Component references (Salt-DS, Mosaic UI, Sitemap, ...) stay in
 *     the *client* graph where their hooks (`useEffect`, ...) are legal
 *     and no `'use client'` shims are needed around third-party
 *     packages that ship without directives.
 *   - Nothing React-element-shaped crosses the boundary, so we side-step
 *     the client-reference-vs-real-function mismatch that breaks the
 *     server-evaluate path (`Card === undefined`).
 *   - `<MDXClient />` uses no hooks itself, so it avoids the
 *     `null.useState` hazard that `next-mdx-remote`'s
 *     `<MDXRemote lazy />` introduces.
 */
import { serializeMdxForClient } from '@jpmorganchase/mosaic-site-middleware';

import { BodySwitcher } from './BodySwitcher';
import { MdxRenderer } from './MdxRenderer';

interface BodyServerProps {
  type?: 'mdx' | 'json';
  /** Raw, un-compiled MDX text from the loader middleware. */
  raw?: string;
  /** Already-rendered content for non-MDX (JSON) responses. */
  content?: React.ReactNode;
}

export async function BodyServer({ type, raw, content }: BodyServerProps) {
  if (type === 'mdx') {
    if (!raw) {
      throw new Error('BodyServer: `raw` MDX text is required when type === "mdx".');
    }
    const source = await serializeMdxForClient(raw);
    // The server-rendered MDX subtree is passed as `children` to the
    // client-side `<BodySwitcher>`, which swaps it for the Lexical
    // `<Editor>` when the user starts editing. VIEW mode pays no
    // extra cost — Lexical is dynamically imported only on EDIT.
    return (
      <div className="wrapper">
        <BodySwitcher raw={raw}>
          <MdxRenderer source={source} />
        </BodySwitcher>
      </div>
    );
  }
  if (type === 'json') {
    return <div className="wrapper">{content}</div>;
  }
  return <div className="wrapper">Unsupported file type</div>;
}
