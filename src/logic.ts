// Typed bridge to the agreed reference logic. logic/scoring.js is used as-is;
// this module only adds types and maps its level names to content.json keys.
import * as scoring from '../logic/scoring.js';
import type { Item, Lang, LevelKey, Thresholds } from './content/types';

export type Level = 'native' | 'fluent' | 'partial' | 'basic' | 'weak';

export interface Analysis {
  scores: Record<Lang, number>;
  native: Lang;
  weak: Lang[];
  closeSecond: Lang | null;
  balanced: boolean;
  levels: Record<Lang, Level>;
  needsTieBreak: boolean;
  tied: Lang[];
}

// scoring.js types tieChoice from its default (null); the signature below is the documented one.
const analyseRef = scoring.analyse as unknown as (
  answers: number[], items: Item[], thresholds: Thresholds, tieChoice?: Lang | null,
) => Analysis;

export function analyse(answers: number[], items: Item[], thresholds: Thresholds, tieChoice: Lang | null = null): Analysis {
  return analyseRef(answers, items, thresholds, tieChoice);
}

export function topLanguages(answers: number[], items: Item[]): Lang[] {
  return scoring.topLanguages(scoring.scores(answers, items)) as Lang[];
}

/** scoring.js calls the lowest language "weak"; content.json keys it as "missing". */
export function levelKey(level: Level): LevelKey {
  return level === 'weak' ? 'missing' : level;
}
