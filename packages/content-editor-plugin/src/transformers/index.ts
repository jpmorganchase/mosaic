import { TRANSFORMERS, MULTILINE_ELEMENT_TRANSFORMERS, type Transformer } from '@lexical/markdown';

import { HORIZONTAL_RULE } from './horizontalRule';
import { TABLE_RULE, setTableCellTransformers } from './tableRule';

/**
 * Master transformer list.
 *
 * Ordering:
 *   1. TABLE_RULE  — `| ... |` row regex wins over any default that
 *                    could also match pipe-delimited text.
 *   2. HORIZONTAL_RULE — `---` matcher beats default `---` handlers.
 *   3. ...TRANSFORMERS — `@lexical/markdown`'s default
 *      ELEMENT + TEXT_FORMAT + TEXT_MATCH transformers
 *      (bold/italic/code/link/heading/list/blockquote/etc.).
 *   4. ...MULTILINE_ELEMENT_TRANSFORMERS — added in this pass.
 *      Currently a single transformer for fenced code blocks
 *      (```lang ... ```). Without it, fenced code round-trips as
 *      plain text and the language tag is lost. Placed at the
 *      end because its regex is anchored to lines starting with
 *      ``` so there's no conflict with earlier matchers; ordering
 *      among non-overlapping matchers is not meaningful in Lexical.
 *
 * Type: the consumer surface (`<MarkdownShortcutPlugin>` from
 * `@lexical/react`, and `$convertFromMarkdownString` /
 * `$convertToMarkdownString` from `@lexical/markdown`) takes
 * `Array<Transformer>` (the union of ElementTransformer |
 * MultilineElementTransformer | TextFormatTransformer |
 * TextMatchTransformer). We export the broader type so callers
 * don't have to assert. The previous `ElementTransformer[]` typing
 * was narrower than reality and is now outright wrong because the
 * list contains MultilineElementTransformer entries.
 *
 * Cell-content transformer registry:
 * After construction we hand the same list back to TABLE_RULE so
 * that recursive cell content (bold, italic, inline links, etc.)
 * is parsed/serialized via the same registry — the cell-transformer
 * setter pattern avoids the import cycle that a direct reference
 * from `tableRule.ts` to this file would create.
 */
const transformers: Transformer[] = [
  TABLE_RULE,
  HORIZONTAL_RULE,
  ...TRANSFORMERS,
  ...MULTILINE_ELEMENT_TRANSFORMERS
];

setTableCellTransformers(transformers);

export default transformers;
