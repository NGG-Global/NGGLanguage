import raw from '@content';
import { validateContent } from './validate';

export type * from './types';
export { fill, joinNames } from './format';

export const content = validateContent(raw);
