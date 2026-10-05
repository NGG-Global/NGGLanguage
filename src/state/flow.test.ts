import { describe, expect, it } from 'vitest';
import { content } from '../content';
import { createReducer, initialState, type FlowAction, type FlowState } from './flow';

const reduce = createReducer({ items: content.items, thresholds: content.thresholds });
const run = (s: FlowState, ...actions: FlowAction[]) => actions.reduce(reduce, s);
const answerAll = (s: FlowState, values: number[]) =>
  values.reduce((st, v) => run(st, { type: 'ANSWER', value: v }, { type: 'ADVANCE' }), s);

const SAMPLE = [5, 4, 3, 2, 5, 3, 4, 2, 3, 4, 2, 3]; // C 14, M 11, S 9, P 6
const TIE_CM = [4, 4, 3, 3, 4, 3, 4, 2, 2, 4, 2, 4]; // C 12, M 12

function atFirstQuestion(): FlowState {
  return run(initialState(content.items), { type: 'BOOT_DONE' }, { type: 'START' }, { type: 'TO_FIRST' });
}

describe('flow', () => {
  it('boot → welcome → frame → first question', () => {
    const s = atFirstQuestion();
    expect(s.screen).toBe('question');
    expect(s.idx).toBe(0);
    expect(s.introPlayed).toBe(true);
  });

  it('back from frame returns to welcome without replaying the intro', () => {
    const s = run(initialState(content.items), { type: 'BOOT_DONE' }, { type: 'START' }, { type: 'BACK' });
    expect(s.screen).toBe('welcome');
    expect(s.introPlayed).toBe(true);
  });

  it('back on question 1 returns to the frame; later questions keep their answer', () => {
    let s = atFirstQuestion();
    expect(run(s, { type: 'BACK' }).screen).toBe('frame');
    s = run(s, { type: 'ANSWER', value: 4 }, { type: 'ADVANCE' }, { type: 'ANSWER', value: 2 }, { type: 'ADVANCE' });
    expect(s.idx).toBe(2);
    s = run(s, { type: 'BACK' });
    expect(s.idx).toBe(1);
    expect(s.nav).toBe('back');
    expect(s.answers[1]).toBe(2);
  });

  it('does not advance an unanswered question and rejects values outside 1..5', () => {
    const s = atFirstQuestion();
    expect(run(s, { type: 'ADVANCE' }).idx).toBe(0);
    expect(run(s, { type: 'ANSWER', value: 6 }).answers[0]).toBe(0);
    expect(run(s, { type: 'ANSWER', value: 0 }).answers[0]).toBe(0);
  });

  it('twelve answers without a tie go straight to calc, then result', () => {
    const s = answerAll(atFirstQuestion(), SAMPLE);
    expect(s.screen).toBe('calc');
    expect(run(s, { type: 'CALC_DONE' }).screen).toBe('result');
  });

  it('a top tie goes to the tie-break; only a tied language is accepted', () => {
    const s = answerAll(atFirstQuestion(), TIE_CM);
    expect(s.screen).toBe('tie');
    expect(run(s, { type: 'TIE_PICK', lang: 'S' }).screen).toBe('tie');
    const picked = run(s, { type: 'TIE_PICK', lang: 'M' });
    expect(picked.screen).toBe('calc');
    expect(picked.tieChoice).toBe('M');
  });

  it('restart clears every answer and returns to welcome with the intro', () => {
    const done = run(answerAll(atFirstQuestion(), SAMPLE), { type: 'CALC_DONE' });
    const s = run(done, { type: 'RESTART' });
    expect(s.screen).toBe('welcome');
    expect(s.answers.every((a) => a === 0)).toBe(true);
    expect(s.introPlayed).toBe(false);
    expect(s.tieChoice).toBe(null);
    expect(s.run).toBe(done.run + 1);
  });
});
