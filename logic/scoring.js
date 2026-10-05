// NGG · NEXUS 2026 · "איזו שפה אתם דוברים?" — reference scoring logic.
// Pure, framework-free ES module. This is the agreed algorithm; do not change it
// without sign-off. The UI must call analyse() and render only from its output.

/** @typedef {'C'|'M'|'S'|'P'} Lang  C=מצפן, M=מיינדסט, S=מערכות, P=פרקטיקה */

export const LANG_ORDER = /** @type {Lang[]} */ (['C', 'M', 'S', 'P']);

/**
 * Sum answers (1..5) per language. Items carry their language in content.json.
 * @param {number[]} answers length 12, values 1..5 (0 = unanswered)
 * @param {{lang: Lang}[]} items length 12, fixed order C,M,S,P,C,S,M,P,S,C,P,M
 */
export function scores(answers, items) {
  const S = { C: 0, M: 0, S: 0, P: 0 };
  items.forEach((it, i) => { S[it.lang] += answers[i] || 0; });
  return S;
}

/** Languages sharing the top score. Length > 1 ⇒ show the tie-break screen. */
export function topLanguages(S) {
  const max = Math.max(...LANG_ORDER.map((k) => S[k]));
  return LANG_ORDER.filter((k) => S[k] === max);
}

/**
 * Full result. tieChoice is the language picked on the tie-break screen
 * (required when topLanguages(S).length > 1).
 * @returns {{
 *   scores: Record<Lang, number>, native: Lang, weak: Lang[], closeSecond: Lang|null,
 *   balanced: boolean, levels: Record<Lang, 'native'|'fluent'|'partial'|'basic'|'weak'>,
 *   needsTieBreak: boolean, tied: Lang[]
 * }}
 */
export function analyse(answers, items, thresholds, tieChoice = null) {
  const T = thresholds; // { fluentMin: 11, partialMin: 7, closeSecondGap: 1, balancedRange: 2 }
  const S = scores(answers, items);
  const vals = LANG_ORDER.map((k) => S[k]);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const tied = topLanguages(S);
  const needsTieBreak = tied.length > 1 && !tieChoice;
  if (tieChoice && !tied.includes(tieChoice)) throw new Error('tieChoice must be one of the tied languages');
  const native = tied.length === 1 ? tied[0] : (tieChoice || tied[0]);

  // Weak ("השפה החלשה") = every non-native language at the minimum score (1–3 languages).
  const weak = LANG_ORDER.filter((k) => k !== native && S[k] === min);

  const rest = LANG_ORDER.filter((k) => k !== native).sort((a, b) => S[b] - S[a]);
  const second = rest[0];
  const closeSecond = second && !weak.includes(second) && (S[native] - S[second]) <= T.closeSecondGap ? second : null;

  const levels = {};
  for (const k of LANG_ORDER) {
    if (k === native) levels[k] = 'native';
    else if (weak.includes(k)) levels[k] = 'weak';
    else if (S[k] >= T.fluentMin) levels[k] = 'fluent';
    else if (S[k] >= T.partialMin) levels[k] = 'partial';
    else levels[k] = 'basic';
  }

  return { scores: S, native, weak, closeSecond, balanced: (max - min) <= T.balancedRange, levels, needsTieBreak, tied };
}
