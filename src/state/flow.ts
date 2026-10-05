// Screen state machine. Pure: no timers, no DOM. Timers live in the screens and
// dispatch the follow-up events (ADVANCE after 520ms, CALC_DONE after 1.9s).
//
// boot ─BOOT_DONE→ welcome ─START→ frame ─TO_FIRST→ question[0]
// frame ─BACK→ welcome · question[0] ─BACK→ frame · question[i] ─BACK→ question[i-1]
// question[i] ─ANSWER→ (same, answer stored) ─ADVANCE→ question[i+1] | tie | calc
// tie ─TIE_PICK→ calc ─CALC_DONE→ result ─RESTART→ welcome (everything cleared)

import type { Item, Lang, Thresholds } from '../content/types';
import { analyse } from '../logic';

export type Screen = 'boot' | 'welcome' | 'frame' | 'question' | 'tie' | 'calc' | 'result';

export interface FlowState {
  screen: Screen;
  /** Current question index, 0..11. */
  idx: number;
  /** One value per item, 1..5; 0 = unanswered. Held in memory only. */
  answers: number[];
  tieChoice: Lang | null;
  /** The S1 intro plays once per run; coming back from S2 shows the settled state. */
  introPlayed: boolean;
  /** Direction of the last question change, for the slide transition. */
  nav: 'forward' | 'back';
  /** Increments on restart so every screen remounts from scratch. */
  run: number;
}

export type FlowAction =
  | { type: 'BOOT_DONE' }
  | { type: 'START' }
  | { type: 'TO_FIRST' }
  | { type: 'BACK' }
  | { type: 'ANSWER'; value: number }
  | { type: 'ADVANCE' }
  | { type: 'TIE_PICK'; lang: Lang }
  | { type: 'CALC_DONE' }
  | { type: 'RESTART' };

export interface FlowContext {
  items: Item[];
  thresholds: Thresholds;
}

export function initialState(items: Item[], screen: Screen = 'boot'): FlowState {
  return { screen, idx: 0, answers: items.map(() => 0), tieChoice: null, introPlayed: false, nav: 'forward', run: 0 };
}

export function createReducer(ctx: FlowContext) {
  const last = ctx.items.length - 1;
  return function reducer(s: FlowState, a: FlowAction): FlowState {
    switch (a.type) {
      case 'BOOT_DONE':
        return s.screen === 'boot' ? { ...s, screen: 'welcome' } : s;
      case 'START':
        return s.screen === 'welcome' ? { ...s, screen: 'frame', introPlayed: true } : s;
      case 'TO_FIRST':
        return s.screen === 'frame' ? { ...s, screen: 'question', idx: 0, nav: 'forward' } : s;
      case 'BACK':
        if (s.screen === 'frame') return { ...s, screen: 'welcome' };
        if (s.screen === 'question') {
          return s.idx === 0 ? { ...s, screen: 'frame' } : { ...s, idx: s.idx - 1, nav: 'back' };
        }
        return s;
      case 'ANSWER': {
        if (s.screen !== 'question' || !Number.isInteger(a.value) || a.value < 1 || a.value > 5) return s;
        const answers = s.answers.slice();
        answers[s.idx] = a.value;
        return { ...s, answers };
      }
      case 'ADVANCE': {
        if (s.screen !== 'question' || !s.answers[s.idx]) return s;
        if (s.idx < last) return { ...s, idx: s.idx + 1, nav: 'forward' };
        // All twelve answered: a top tie needs the tie-break screen first.
        const r = analyse(s.answers, ctx.items, ctx.thresholds);
        return { ...s, screen: r.needsTieBreak ? 'tie' : 'calc', tieChoice: null };
      }
      case 'TIE_PICK': {
        if (s.screen !== 'tie') return s;
        const r = analyse(s.answers, ctx.items, ctx.thresholds);
        if (!r.tied.includes(a.lang)) return s;
        return { ...s, screen: 'calc', tieChoice: a.lang };
      }
      case 'CALC_DONE':
        return s.screen === 'calc' ? { ...s, screen: 'result' } : s;
      case 'RESTART':
        return { ...initialState(ctx.items, 'welcome'), run: s.run + 1 };
      default:
        return s;
    }
  };
}
