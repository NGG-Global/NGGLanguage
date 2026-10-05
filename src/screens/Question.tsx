import { useEffect, useLayoutEffect, useRef, useState, type Dispatch } from 'react';
import { content, fill } from '../content';
import { ArrowBack, Header, LevelGlyph } from '../components/ui';
import { orbitPoint } from '../map/geometry';
import { useReducedMotion } from '../hooks';
import type { FlowAction, FlowState } from '../state/flow';
import './question.css';

type Phase = 'in' | 'out' | 'pre' | 'preBack';
type Pt = { x: number; y: number };

/** CONTEXT §7: feedback at 0ms, statement leaves at 260ms, next one at 520ms. */
const T_OUT = 260;
const T_NEXT = 520;

function vibrate() {
  try {
    navigator.vibrate?.(10);
  } catch {
    /* unsupported (e.g. iOS Safari) */
  }
}

/** Neutral core: grows brighter with every answer, never hints at a language. */
function Core({ answers, nodeRef }: { answers: number[]; nodeRef: React.Ref<HTMLDivElement> }) {
  const answered = answers.filter((a) => a > 0).length;
  return (
    <div className="core" aria-hidden="true">
      <div className="core__halo" style={{ opacity: Math.min(1, 0.35 + answered * 0.055) }} />
      <div className="core__iso" />
      {answers.map((a, i) => {
        if (!a) return null;
        const [ox, oy] = orbitPoint(i);
        return <span key={i} className="core__orbit" style={{ left: `calc(50% + ${(ox - 2.5).toFixed(1)}px)`, top: 46 + oy - 2.5 }} />;
      })}
      <div className="core__node" ref={nodeRef}>
        <span className="core__glow" />
        <span className="core__glow core__glow--strong" style={{ opacity: answered / content.items.length }} />
        <span className="core__dot" />
      </div>
    </div>
  );
}

export function Question({ state, dispatch }: { state: FlowState; dispatch: Dispatch<FlowAction> }) {
  const { idx, answers, nav } = state;
  const q = content.ui.question;
  const item = content.items[idx];
  const current = answers[idx];
  const reduced = useReducedMotion();

  const [phase, setPhase] = useState<Phase>('pre');
  const [fly, setFly] = useState<{ from: Pt; to: Pt; go: boolean; id: number } | null>(null);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const rootRef = useRef<HTMLElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Each statement enters from the left (RTL forward) or from the right (going back).
  // Input unlocks as soon as the next statement is on screen.
  useLayoutEffect(() => {
    busy.current = false;
    setPhase(nav === 'back' ? 'preBack' : 'pre');
    const id = window.setTimeout(() => setPhase('in'), 30);
    return () => clearTimeout(id);
  }, [idx, nav]);

  const centerOf = (el: Element, root: DOMRect): Pt => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - root.left, y: r.top + r.height / 2 - root.top };
  };

  const pick = (value: number, row: number) => {
    if (busy.current) return;
    busy.current = true;
    dispatch({ type: 'ANSWER', value });
    vibrate();
    const root = rootRef.current;
    const glyph = glyphRefs.current[row];
    if (!reduced && root && glyph && nodeRef.current) {
      const rr = root.getBoundingClientRect();
      const from = centerOf(glyph, rr);
      const to = centerOf(nodeRef.current, rr);
      const id = Date.now();
      setFly({ from, to, go: false, id });
      requestAnimationFrame(() => requestAnimationFrame(() => setFly((f) => (f && f.id === id ? { ...f, go: true } : f))));
    }
    later(() => setPhase('out'), T_OUT);
    later(() => {
      setFly(null);
      dispatch({ type: 'ADVANCE' });
    }, T_NEXT);
  };

  const back = () => {
    if (busy.current) return;
    dispatch({ type: 'BACK' });
  };

  return (
    <main className="screen question" ref={rootRef} tabIndex={-1}>
      <Header />
      <div className="q__top">
        <div className="q__ticks" aria-hidden="true">
          {content.items.map((it, i) => (
            <span key={it.id} className={`tick ${i < idx ? 'is-done' : i === idx ? 'is-now lt-now' : ''}`} />
          ))}
        </div>
        <span className="q__counter" aria-live="polite">{fill(q.counter, { n: idx + 1 })}</span>
      </div>

      <Core answers={answers} nodeRef={nodeRef} />

      <div className={`q__stmt is-${phase}`}>
        <span className="q__context">{q.context}</span>
        <p className="q__text">{item.text}</p>
      </div>

      <div className="grow" />
      <div className="q__opts" role="group" aria-label={q.groupAria}>
        {content.scale.map((s, row) => {
          const selected = current === s.value;
          return (
            <button
              key={s.value}
              type="button"
              className={`opt ${selected ? 'is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => pick(s.value, row)}
            >
              <span className="opt__fill" />
              <span className="opt__label">{s.label}</span>
              <span className="opt__glyph" ref={(el) => { glyphRefs.current[row] = el; }}>
                <LevelGlyph value={s.value} selected={selected} />
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" className="linkbtn q__back" onClick={back}>
        <ArrowBack />
        {q.back}
      </button>

      {fly && (
        <span
          className="fly"
          aria-hidden="true"
          style={{ left: fly.from.x - 5, top: fly.from.y - 5, transform: `translateX(${fly.go ? fly.to.x - fly.from.x : 0}px)` }}
        >
          <span className="fly__dot" style={{ transform: `translateY(${fly.go ? fly.to.y - fly.from.y : 0}px)`, opacity: fly.go ? 0 : 1 }} />
        </span>
      )}
    </main>
  );
}
