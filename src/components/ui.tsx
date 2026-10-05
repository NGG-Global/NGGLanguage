import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { content } from '../content';
import './ui.css';

const logoSrc = `${import.meta.env.BASE_URL}assets/ngg-logo-color.png`;

export function Header() {
  const b = content.ui.brand;
  return (
    <header className="hdr">
      <img className="hdr__logo" src={logoSrc} alt={b.logoAlt} width={34} height={40} />
      <div className="hdr__event" dir="ltr">
        <span className="hdr__name">{b.event}</span>
        <span className="hdr__year">{b.year}</span>
      </div>
    </header>
  );
}

/** Forward arrow in RTL (points left). */
export function ArrowForward({ size = 22 }: { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

/** Back arrow in RTL (points right). */
export function ArrowBack({ size = 18 }: { size?: number }) {
  return (
    <svg className="icon icon--thin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { breathe?: boolean; children: ReactNode };

export function PrimaryButton({ breathe, className = '', children, ...rest }: BtnProps) {
  return (
    <button type="button" className={`btn ${breathe ? 'btn--breathe' : ''} ${className}`} {...rest}>
      <span>{children}</span>
      <ArrowForward />
    </button>
  );
}

export function LinkButton({ className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`linkbtn ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** Scale glyph: a stack of 1–5 terrace layers, same visual language as the map. */
export function LevelGlyph({ value, selected = false }: { value: number; selected?: boolean }) {
  return (
    <span className={`glyph ${selected ? 'is-selected' : ''}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((k) => (
        <span key={k} className={`glyph__l ${k < value ? 'is-on' : ''}`} style={{ top: 14 - k * 3.2 }} />
      ))}
    </span>
  );
}

export function Toast({ text, id }: { text: string; id: number }) {
  return (
    <div className="toast-wrap">
      <div key={id} className="toast lt-toast" role="status">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        {text}
      </div>
    </div>
  );
}
