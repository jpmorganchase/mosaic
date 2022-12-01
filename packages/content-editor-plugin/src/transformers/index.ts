import { TRANSFORMERS } from '@lexical/markdown';

import { HORIZONTAL_RULE } from './horizontalRule';
import { TABLE_RULE } from './tableRule';

export default [HORIZONTAL_RULE, TABLE_RULE, ...TRANSFORMERS];
