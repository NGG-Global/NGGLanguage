import { content } from '../content';
import { Header, LevelGlyph, LinkButton, PrimaryButton } from '../components/ui';
import './screens.css';

export function Frame({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const f = content.ui.frame;
  return (
    <main className="screen frame" tabIndex={-1}>
      <Header />
      <h1 className="frame__title lt-rise">
        {f.title.map((line) => <span key={line}>{line}</span>)}
      </h1>
      <p className="frame__body lt-rise" style={{ animationDelay: '.08s' }}>{f.body}</p>
      <div className="frame__scale lt-rise" style={{ animationDelay: '.16s' }}>
        <span className="frame__caption">{f.scaleCaption}</span>
        <ul className="frame__rows">
          {content.scale.map((s) => (
            <li key={s.value} className="frame__row">
              <span>{s.label}</span>
              <LevelGlyph value={s.value} />
            </li>
          ))}
        </ul>
      </div>
      <p className="frame__note lt-rise" style={{ animationDelay: '.24s' }}>{f.note}</p>
      <div className="grow" />
      <PrimaryButton onClick={onNext}>{f.cta}</PrimaryButton>
      <LinkButton className="frame__back" onClick={onBack}>{f.back}</LinkButton>
    </main>
  );
}
