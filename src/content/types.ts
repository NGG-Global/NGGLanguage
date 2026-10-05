// Shape of content/content.json. Every user-facing string comes from this file.

export type Lang = 'C' | 'M' | 'S' | 'P';

/** Level keys as used by content.json (ui.map.status, map.terraceLayers). */
export type LevelKey = 'native' | 'fluent' | 'partial' | 'basic' | 'missing';

export interface LanguageContent {
  name: string;
  persona: string;
  quadrant: string;
  nativeText: string;
  price: string;
  weakText: string;
  takeaway: string;
  tiebreak: string;
}

export interface Item {
  id: number;
  lang: Lang;
  text: string;
}

export interface ScaleStep {
  value: number;
  label: string;
}

export interface Thresholds {
  fluentMin: number;
  partialMin: number;
  closeSecondGap: number;
  balancedRange: number;
}

export type Point = [number, number];

export interface MapGeometry {
  size: Point;
  terraceLayers: Record<LevelKey | 'flat' | 'calc', number>;
  layerStep: number;
  positions: Record<Lang, Point>;
  node: Point;
}

export interface Content {
  version: string;
  status: string;
  ui: {
    meta: { title: string; description: string };
    brand: { event: string; year: string; logoAlt: string };
    listSeparator: string;
    boot: { title: string; cta: string; counter: string };
    welcome: { title: string[]; body: string[]; cta: string };
    frame: { title: string[]; body: string; scaleCaption: string; note: string; cta: string; back: string };
    question: { context: string; counter: string; groupAria: string; back: string };
    tie: { title: string; intro: string; countWords: Record<string, string>; question: string; stepLabel: string };
    calc: { title: string; sub: string };
    result: {
      nativeLabel: string;
      closeSecond: string;
      weakLabelSingle: string;
      weakLabelMulti: string;
      bring: string;
      save: string;
      restart: string;
      restartConfirm: string;
      contact: string;
      contactUrl: string;
      message: string[];
      deepLabel: string;
      priceLabel: string;
      takeawayLabel: string;
      balanced: string;
      disclaimer: string;
      toast: string;
      toastError: string;
      versionLabel: string;
    };
    share: {
      nativeLabel: string;
      weakLabelSingle: string;
      weakLabelMulti: string;
      bring: string;
      footer: string;
      link: string;
      fileName: string;
      shareTitle: string;
    };
    map: {
      axisRight: string;
      axisLeft: string;
      rowTop: string;
      rowBottom: string;
      node: string;
      status: Record<LevelKey, string>;
      aria: { intro: string; result: string; resultMulti: string };
    };
  };
  scale: ScaleStep[];
  languageOrder: Lang[];
  languages: Record<Lang, LanguageContent>;
  items: Item[];
  thresholds: Thresholds;
  map: MapGeometry;
}
