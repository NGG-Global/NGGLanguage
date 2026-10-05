import type { Content } from './types';

// Fails fast (at build-time tests and at startup) if content.json loses a key
// the UI depends on. Copy is a draft and may change until the event; a missing
// key must never render as "undefined".

const LANGS = ['C', 'M', 'S', 'P'] as const;
const LANG_FIELDS = ['name', 'persona', 'nativeText', 'price', 'weakText', 'takeaway', 'tiebreak'] as const;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function walk(sample: unknown, actual: unknown, path: string, errors: string[]) {
  if (typeof sample === 'string') {
    if (typeof actual !== 'string' || actual.trim() === '') errors.push(`${path}: expected non-empty string`);
    return;
  }
  if (Array.isArray(sample)) {
    if (!Array.isArray(actual) || actual.length === 0) errors.push(`${path}: expected non-empty array`);
    return;
  }
  if (isObj(sample)) {
    if (!isObj(actual)) {
      errors.push(`${path}: expected object`);
      return;
    }
    for (const k of Object.keys(sample)) walk(sample[k], actual[k], `${path}.${k}`, errors);
  }
}

// Required UI keys, expressed as a template of their types.
const S = '';
const UI_TEMPLATE = {
  meta: { title: S, description: S },
  brand: { event: S, year: S, logoAlt: S },
  listSeparator: S,
  boot: { title: S, cta: S, counter: S },
  welcome: { title: [S], body: [S], facts: [S], cta: S, footnote: S },
  frame: { title: [S], body: S, scaleCaption: S, note: S, cta: S, back: S },
  question: { context: S, counter: S, groupAria: S, back: S },
  tie: { title: S, intro: S, countWords: {}, question: S, stepLabel: S },
  calc: { title: S, sub: S },
  result: {
    nativeLabel: S, closeSecond: S, weakLabelSingle: S, weakLabelMulti: S, bring: S, save: S,
    restart: S, restartConfirm: S, contact: S, contactUrl: S, message: [S], deepLabel: S,
    priceLabel: S, takeawayLabel: S, balanced: S, disclaimer: S, toast: S, toastError: S, versionLabel: S,
  },
  share: { nativeLabel: S, weakLabelSingle: S, weakLabelMulti: S, bring: S, footer: S, link: S, fileName: S, shareTitle: S },
  map: {
    axisRight: S, axisLeft: S, rowTop: S, rowBottom: S, node: S,
    status: { native: S, fluent: S, partial: S, basic: S, missing: S },
    aria: { intro: S, result: S, resultMulti: S },
  },
};

export function contentErrors(raw: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(raw)) return ['content: expected object'];
  if (typeof raw.version !== 'string') errors.push('version: expected string');
  walk(UI_TEMPLATE, raw.ui, 'ui', errors);

  const langs = raw.languages;
  for (const k of LANGS) {
    const l = isObj(langs) ? langs[k] : undefined;
    if (!isObj(l)) {
      errors.push(`languages.${k}: missing`);
      continue;
    }
    for (const f of LANG_FIELDS) if (typeof l[f] !== 'string' || !l[f]) errors.push(`languages.${k}.${f}: missing`);
  }

  const items = raw.items;
  if (!Array.isArray(items) || items.length !== 12) errors.push('items: expected 12 items');
  else items.forEach((it, i) => {
    if (!isObj(it) || !LANGS.includes(it.lang as never) || typeof it.text !== 'string' || !it.text) errors.push(`items[${i}]: invalid`);
  });

  const scale = raw.scale;
  if (!Array.isArray(scale) || scale.length !== 5) errors.push('scale: expected 5 steps');

  const t = raw.thresholds;
  if (!isObj(t)) errors.push('thresholds: missing');
  else for (const k of ['fluentMin', 'partialMin', 'closeSecondGap', 'balancedRange']) if (typeof t[k] !== 'number') errors.push(`thresholds.${k}: expected number`);

  const m = raw.map;
  if (!isObj(m)) errors.push('map: missing');
  else {
    if (!isObj(m.positions)) errors.push('map.positions: missing');
    else for (const k of LANGS) if (!Array.isArray((m.positions as Record<string, unknown>)[k])) errors.push(`map.positions.${k}: missing`);
    if (!Array.isArray(m.node)) errors.push('map.node: missing');
    if (typeof m.layerStep !== 'number') errors.push('map.layerStep: missing');
    if (!isObj(m.terraceLayers)) errors.push('map.terraceLayers: missing');
    else for (const k of ['native', 'fluent', 'partial', 'basic', 'missing', 'flat', 'calc']) if (typeof (m.terraceLayers as Record<string, unknown>)[k] !== 'number') errors.push(`map.terraceLayers.${k}: missing`);
  }

  const order = raw.languageOrder;
  if (!Array.isArray(order) || order.length !== 4 || !LANGS.every((k) => order.includes(k))) errors.push('languageOrder: expected C,M,S,P');
  return errors;
}

export function validateContent(raw: unknown): Content {
  const errors = contentErrors(raw);
  if (errors.length) throw new Error(`content.json is invalid:\n${errors.join('\n')}`);
  return raw as Content;
}
