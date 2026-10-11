import { useEffect, useRef, useState } from 'react';
import { content, fill, joinNames } from '../content';
import { Header, LinkButton, PrimaryButton, SecondaryButton, Toast } from '../components/ui';
import { TerrainMap } from '../map/TerrainMap';
import { useReducedMotion, useStages, useTimeout } from '../hooks';
import type { Analysis } from '../logic';
import { prepareCard, preparePdf, saveFile, type PreparedFile } from '../share/export';
import './result.css';

/** 0.1s terraces rise · 1.15s name · 1.9s light route + magenta node · 3.0s weak language lit. */
const STAGES = [100, 1150, 1900, 3000] as const;
const RESTART_WINDOW = 3200;

export function resultAria(a: Analysis): string {
  const ui = content.ui;
  const L = content.languages;
  return fill(a.weak.length > 1 ? ui.map.aria.resultMulti : ui.map.aria.result, {
    native: L[a.native].name,
    weak: joinNames(a.weak.map((k) => L[k].name), ui.listSeparator),
  });
}

export function Result({ analysis, onRestart }: { analysis: Analysis; onRestart: () => void }) {
  const reduced = useReducedMotion();
  const stage = useStages(STAGES, reduced);
  const r = content.ui.result;
  const L = content.languages;
  const native = L[analysis.native];
  const multi = analysis.weak.length > 1;

  const [confirm, setConfirm] = useState(false);
  useTimeout(() => setConfirm(false), confirm ? RESTART_WINDOW : null, [confirm]);
  const restart = () => {
    if (confirm) onRestart();
    else setConfirm(true);
  };

  // Both files are prepared ahead of the tap so the share sheet opens inside the
  // user gesture (iOS Safari rejects navigator.share after a long await).
  type Kind = 'png' | 'pdf';
  const prepare: Record<Kind, () => Promise<PreparedFile>> = {
    png: () => prepareCard(analysis),
    pdf: () => preparePdf(analysis),
  };
  const files = useRef<Record<Kind, Promise<PreparedFile> | null>>({ png: null, pdf: null });
  useEffect(() => {
    const ids = [
      window.setTimeout(() => { files.current.png ??= prepareCard(analysis); }, reduced ? 200 : 3400),
      window.setTimeout(() => { files.current.pdf ??= preparePdf(analysis); }, reduced ? 600 : 4200),
    ];
    return () => ids.forEach(clearTimeout);
  }, [analysis, reduced]);

  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  useTimeout(() => setToast(null), toast ? 2600 : null, [toast?.id]);
  const [saving, setSaving] = useState<Kind | null>(null);
  const exportFile = async (kind: Kind) => {
    if (saving) return;
    setSaving(kind);
    try {
      files.current[kind] ??= prepare[kind]();
      const outcome = await saveFile(files.current[kind]!);
      if (outcome !== 'cancelled') setToast({ id: Date.now(), text: kind === 'pdf' ? r.toastPdf : r.toast });
    } catch {
      files.current[kind] = null;
      setToast({ id: Date.now(), text: r.toastError });
    } finally {
      setSaving(null);
    }
  };

  return (
    <main className={`screen result ${analysis.closeSecond ? 'has-close' : ''}`} tabIndex={-1}>
      <Header />
      <span className={`res__label fade ${stage >= 2 ? 'is-on' : ''}`}>{r.nativeLabel}</span>
      <h1 className={`res__name ${stage >= 2 ? 'is-on' : ''}`}>{native.name}</h1>
      <span className={`res__persona fade ${stage >= 2 ? 'is-on' : ''}`} style={{ transitionDelay: '.3s' }}>{native.persona}</span>
      {analysis.closeSecond && (
        <span className={`res__close fade ${stage >= 2 ? 'is-on' : ''}`} style={{ transitionDelay: '.5s' }}>
          {fill(r.closeSecond, { name: L[analysis.closeSecond].name })}
        </span>
      )}

      <TerrainMap mode="result" stage={stage} analysis={analysis} ariaLabel={resultAria(analysis)} axisTop={10} />

      <div className={`res__lower ${stage >= 3 ? 'is-on' : ''}`} inert={stage < 3}>
        <div className="res__divider" />
        {analysis.weak.map((k) => (
          <section key={k} className="res__weak">
            <div className="res__weak-head">
              <span className="res__weak-labels">
                <span className="res__weak-label">{multi ? r.weakLabelMulti : r.weakLabelSingle}</span>
                <span className="res__bring">{r.bring}</span>
              </span>
              <h2 className="res__weak-name">{L[k].name}</h2>
            </div>
            <p className="res__weak-text">{L[k].weakText}</p>
          </section>
        ))}
        <PrimaryButton className="res__save" onClick={() => exportFile('png')} aria-busy={saving === 'png'}>{r.save}</PrimaryButton>
        <SecondaryButton className="res__pdf" onClick={() => exportFile('pdf')} aria-busy={saving === 'pdf'}>{r.savePdf}</SecondaryButton>
        <div className="res__links">
          <LinkButton onClick={restart}>{confirm ? r.restartConfirm : r.restart}</LinkButton>
          <a className="linkbtn res__contact" href={r.contactUrl} target="_blank" rel="noopener noreferrer">{r.contact}</a>
        </div>
        <p className="res__message">{r.message.map((line) => <span key={line}>{line}</span>)}</p>

        <div className="res__divider res__divider--deep" />
        <span className="res__deep-label">{r.deepLabel}</span>
        <p className="res__deep">{native.nativeText}</p>
        <div className="res__price">
          <span>{r.priceLabel}</span>
          <p>{native.price}</p>
        </div>
        {analysis.weak.map((k) => (
          <div key={k} className="res__takeaway">
            <span>{r.takeawayLabel}</span>
            <p>{L[k].takeaway}</p>
          </div>
        ))}
        {analysis.balanced && <p className="res__balanced">{r.balanced}</p>}
        <p className="res__disclaimer">{r.disclaimer}</p>
        <span className="res__version">{r.versionLabel} {content.version}</span>
      </div>
      {toast && <Toast id={toast.id} text={toast.text} />}
    </main>
  );
}
