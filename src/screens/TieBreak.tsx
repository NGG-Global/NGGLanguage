import { useState } from 'react';
import { content, fill } from '../content';
import { Header } from '../components/ui';
import type { Lang } from '../content/types';
import type { Analysis } from '../logic';
import './question.css';

/** S5: only the tied languages, by their tie-break text — never by name. */
export function TieBreak({ analysis, onPick }: { analysis: Analysis; onPick: (lang: Lang) => void }) {
  const t = content.ui.tie;
  const [picked, setPicked] = useState<Lang | null>(null);
  const n = analysis.tied.length;
  const pick = (k: Lang) => {
    if (picked) return;
    setPicked(k);
    window.setTimeout(() => onPick(k), 180);
  };
  return (
    <main className="screen tie" tabIndex={-1}>
      <Header />
      <div className="q__top">
        <div className="q__ticks" aria-hidden="true">
          {content.items.map((it) => <span key={it.id} className="tick is-done" />)}
        </div>
        <span className="q__counter">{t.stepLabel}</span>
      </div>
      <h1 className="tie__title lt-rise">{t.title}</h1>
      <p className="tie__intro lt-rise" style={{ animationDelay: '.06s' }}>
        {fill(t.intro, { count: t.countWords[String(n)] ?? n })}
      </p>
      <p className="tie__q lt-rise" style={{ animationDelay: '.12s' }} id="tie-q">{t.question}</p>
      <div className="tie__opts" role="group" aria-labelledby="tie-q">
        {analysis.tied.map((k, i) => (
          <div key={k} className="lt-rise" style={{ animationDelay: `${(0.18 + i * 0.07).toFixed(2)}s` }}>
            <button
              type="button"
              className={`tieopt ${picked === k ? 'is-picked' : ''}`}
              aria-pressed={picked === k}
              onClick={() => pick(k)}
            >
              <span className="tieopt__mark" aria-hidden="true" />
              <span>{content.languages[k].tiebreak}</span>
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
