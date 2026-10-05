import { content } from '../content';
import { Header } from '../components/ui';
import { TerrainMap } from '../map/TerrainMap';
import { useReducedMotion, useStages, useTimeout } from '../hooks';
import { introAria } from './Welcome';
import './result.css';

/** Dots leave the node at 60ms; the result follows at 1.9s (CONTEXT §3, §7). */
const STAGES = [60] as const;
const T_DONE = 1900;

export function Calc({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const stage = useStages(STAGES, reduced);
  useTimeout(onDone, T_DONE);
  const c = content.ui.calc;
  return (
    <main className="screen calc" tabIndex={-1}>
      <Header />
      <div className="calc__spacer" />
      <TerrainMap mode="calc" stage={stage} analysis={null} ariaLabel={introAria()} axisTop={0} />
      <div className="calc__text" aria-live="polite">
        <span className="calc__title">{c.title}</span>
        <span className="calc__sub">{c.sub}</span>
        <span className="calc__bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${stage >= 1 ? 1 : 0})` }} />
        </span>
      </div>
    </main>
  );
}
