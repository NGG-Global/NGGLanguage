import { content, fill, joinNames } from '../content';
import { Header, PrimaryButton } from '../components/ui';
import { TerrainMap } from '../map/TerrainMap';
import { useReducedMotion, useStages } from '../hooks';
import './screens.css';

/** Floor + terraces from ~0s, names and node at 1.1s (CONTEXT §7). */
const STAGES = [30, 1100] as const;

export function introAria(): string {
  const ui = content.ui;
  return fill(ui.map.aria.intro, {
    names: joinNames(content.languageOrder.map((k) => content.languages[k].name), ui.listSeparator),
    node: ui.map.node,
  });
}

export function Welcome({ settled, onStart }: { settled: boolean; onStart: () => void }) {
  const reduced = useReducedMotion();
  const stage = useStages(STAGES, settled || reduced);
  const w = content.ui.welcome;
  return (
    <main className={`screen welcome ${settled ? 'no-entrance' : ''}`} tabIndex={-1}>
      <Header />
      <h1 className="welcome__title lt-rise" style={{ animationDelay: '.25s' }}>
        {w.title.map((line) => <span key={line}>{line}</span>)}
      </h1>
      <p className="welcome__body lt-rise" style={{ animationDelay: '.4s' }}>
        {w.body.map((line) => <span key={line}>{line}</span>)}
      </p>
      <TerrainMap mode="welcome" stage={stage} analysis={null} ariaLabel={introAria()} axisTop={16} />
      <div className="welcome__bottom">
        <div className="welcome__cta lt-rise" style={{ animationDelay: '1.4s' }}>
          <PrimaryButton breathe onClick={onStart}>{w.cta}</PrimaryButton>
        </div>
      </div>
    </main>
  );
}
