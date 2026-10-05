import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { content } from '../content';
import { prefersReducedMotion } from '../hooks';
import { ArrowForward } from '../components/ui';
import {
  CUES, DURATION, FLARE_AT, INNER, OUTER, PARTICLES, PH, PW, SETTLED, along, logoBox, scramble, tw,
} from './timeline';
import './boot.css';

const asset = (name: string) => `${import.meta.env.BASE_URL}boot/${name}`;
const IMG = { tri: asset('logo-triangle.png'), swoosh: asset('logo-swoosh.png'), text: asset('logo-text.png') };

/** The logo is drawn in a fixed 300px box and scaled, so only transform changes per frame. */
const LOGO_BOX = 300;
const K = LOGO_BOX / 1600;

const perimeter = (pts: [number, number][]) =>
  pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const OUTER_LEN = perimeter(OUTER);
const INNER_LEN = perimeter(INNER);
const poly = (pts: [number, number][]) => pts.map((p) => p.join(',')).join(' ');

const mask = (v: string): CSSProperties => ({ WebkitMaskImage: v, maskImage: v });

interface BootProps {
  onDone: () => void;
}

function useStageFit() {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ s: 1, x: 0, y: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.min(w / PW, h / PH);
      setFit({ s, x: (w - PW * s) / 2, y: (h - PH * s) / 2 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, fit] as const;
}

/** Animation clock: advances with rAF, pauses while hidden, stops at the end. */
function useBootClock(reduced: boolean) {
  const [T, setT] = useState(reduced ? DURATION : 0);
  const tRef = useRef(reduced ? DURATION : 0);
  const jump = useRef<number | null>(null);
  const kick = useRef<() => void>(() => {});
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      let t = tRef.current + dt;
      if (jump.current !== null) {
        t = Math.max(t, jump.current);
        jump.current = null;
      }
      tRef.current = Math.min(t, DURATION);
      setT(tRef.current);
      if (tRef.current < DURATION) raf = requestAnimationFrame(tick);
    };
    kick.current = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  const skipTo = (t: number) => {
    if (tRef.current >= t) return;
    jump.current = t;
    kick.current();
  };
  return [T, skipTo] as const;
}

export function Boot({ onDone }: BootProps) {
  const [reduced] = useState(prefersReducedMotion);
  const [T, skipTo] = useBootClock(reduced);
  const [fitRef, fit] = useStageFit();
  const [leaving, setLeaving] = useState(false);
  const ui = content.ui;

  // ---- background ----
  const fade = tw(T, CUES.Ignite, CUES.Trace + 0.8, 0, 1);
  const breathe = 1 + 0.06 * Math.sin(T * 1.1);
  const pinkGlow = tw(T, CUES.Swoosh, CUES.Lockup + 0.2, 0, 1);
  const logo = logoBox(T);

  // ---- logo ----
  const dotIn = tw(T, CUES.Ignite, CUES.Ignite + 0.6, 0, 1, 'pop');
  const outerP = tw(T, CUES.Trace - 0.1, CUES.Trace + 1.2, 0, 1, 'draw');
  const innerP = tw(T, CUES.Trace + 0.1, CUES.Trace + 1.3, 0, 1, 'draw');
  const lineFade = tw(T, CUES.Trace + 0.9, CUES.Swoosh + 0.7, 1, 0, 'draw');
  const headFade = tw(T, CUES.Trace + 0.9, CUES.Trace + 1.4, 1, 0, 'draw');
  const head = along(OUTER, outerP);
  const fillQ = tw(T, CUES.Trace + 0.6, CUES.Swoosh + 0.3, -30, 105, 'draw');
  const fillO = tw(T, CUES.Trace + 0.6, CUES.Swoosh + 0.1, 0, 1, 'draw');
  const sw = tw(T, CUES.Swoosh - 0.05, CUES.Swoosh + 0.85, 14, 96, 'draw');
  const swOn = T > CUES.Swoosh - 0.05;
  const bandA = swOn ? tw(T, CUES.Swoosh + 0.5, CUES.Lockup + 0.3, 1, 0, 'draw') : 0;
  const shimmer = tw(T, CUES.Idle + 0.4, CUES.Idle + 2.2, -15, 115, 'draw');
  const shimmerOn = T > CUES.Idle + 0.4 && T < CUES.Idle + 2.2;
  const flare = T < CUES.Swoosh + 0.55 ? 0
    : tw(T, CUES.Swoosh + 0.55, CUES.Swoosh + 0.9, 0, 1, 'pop') * tw(T, CUES.Swoosh + 0.9, CUES.Lockup + 0.7, 1, 0, 'draw');
  const txt = tw(T, CUES.Lockup - 0.1, CUES.Lockup + 0.8, 0, 1);

  // ---- title + CTA ----
  const tIn = tw(T, CUES.Reveal + 0.15, CUES.Reveal + 1.0, 0, 1);
  const bIn = tw(T, CUES.Reveal + 0.4, CUES.Reveal + 1.3, 0, 1);
  const sheenOn = T > CUES.Reveal + 1.1 && T < CUES.Reveal + 2.2;
  const sx = sheenOn ? tw(T, CUES.Reveal + 1.1, CUES.Reveal + 2.2, -40, 140, 'draw') : -40;

  // ---- footer counter ----
  const footOn = tw(T, CUES.Ignite + 0.2, CUES.Ignite + 0.5, 0, 1);
  const pct = Math.round(tw(T, CUES.Ignite + 0.2, CUES.Lockup + 0.6, 0, 100, 'draw'));
  const dec = tw(T, CUES.Reveal + 0.3, CUES.Reveal + 1.2, 0, 1, 'draw');
  const lines = tw(T, CUES.Reveal + 0.5, CUES.Idle + 0.3, 0, 1, 'draw');
  const booting = T < CUES.Reveal + 0.3;
  const signature = `${ui.brand.event} ${ui.brand.year}`;
  const counter = booting ? `${ui.boot.counter}  ${String(pct).padStart(3, '0')}%` : scramble(signature, dec, T);
  const barW = tw(T, CUES.Ignite + 0.2, CUES.Lockup + 0.6, 0, 1, 'draw');
  const barFade = tw(T, CUES.Lockup + 0.6, CUES.Reveal + 0.4, 1, 0, 'draw');

  const ctaReady = bIn > 0.6;
  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onDone, reduced ? 0 : 320);
  };

  const L = logo.size;
  return (
    <div
      ref={fitRef}
      className={`boot ${leaving ? 'is-leaving' : ''}`}
      onPointerDown={() => skipTo(SETTLED)}
    >
      <div
        className="boot__stage"
        style={{ width: PW, height: PH, transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.s})` }}
      >
        {/* background */}
        <div className="boot__bg" aria-hidden="true">
          <div
            className="boot__glow"
            style={{
              left: logo.cx - 260, top: logo.cy - 300,
              opacity: Math.min(1, fade * breathe), transform: `scale(${0.85 + 0.15 * fade})`,
            }}
          />
          <div
            className="boot__glow-mag"
            style={{ left: logo.cx - 40, top: logo.cy - 230, opacity: pinkGlow * (0.88 + 0.12 * Math.sin(T * 0.9 + 1)) }}
          />
          <div className="boot__grid" style={{ opacity: 0.8 * fade }}>
            <div className="boot__grid-lines" style={{ transform: `translateY(${(T * 8) % 44}px)` }} />
          </div>
          {PARTICLES.map((p, i) => {
            const y = (((p.y - T * p.v) % PH) + PH) % PH;
            const tw2 = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(T * 1.2 + p.ph));
            return (
              <span
                key={i}
                className="boot__particle"
                style={{ width: p.r * 2, height: p.r * 2, transform: `translate(${p.x}px, ${y}px)`, opacity: fade * tw2 * 0.55 }}
              />
            );
          })}
          <div className="boot__vignette" />
        </div>

        {/* logo */}
        <div
          className="boot__logo"
          aria-hidden="true"
          style={{
            left: logo.cx - LOGO_BOX / 2, top: logo.cy - LOGO_BOX / 2, width: LOGO_BOX, height: LOGO_BOX,
            transform: `scale(${L / LOGO_BOX})`,
          }}
        >
          <img src={IMG.tri} alt="" style={{ opacity: fillO, ...mask(`linear-gradient(180deg, #000 ${fillQ}%, transparent ${fillQ + 30}%)`) }} />
          <svg viewBox="0 0 1600 1600" className="boot__trace" style={{ opacity: lineFade }}>
            <polyline points={poly(OUTER)} strokeWidth={5} strokeDasharray={OUTER_LEN} strokeDashoffset={OUTER_LEN * (1 - outerP)} />
            <polyline points={poly(INNER)} strokeWidth={3.5} strokeDasharray={INNER_LEN} strokeDashoffset={INNER_LEN * (1 - innerP)} opacity={0.7} />
          </svg>
          <div
            className="boot__head"
            style={{ left: head[0] * K - 14, top: head[1] * K - 14, opacity: dotIn * headFade, transform: `scale(${dotIn})` }}
          />
          {swOn && (
            <>
              <img src={IMG.swoosh} alt="" className="boot__swoosh" style={mask(`linear-gradient(90deg, #000 ${sw - 6}%, transparent ${sw + 6}%)`)} />
              <img
                src={IMG.swoosh}
                alt=""
                className="boot__band"
                style={{ opacity: bandA, ...mask(`linear-gradient(90deg, transparent ${sw - 14}%, #000 ${sw - 2}%, transparent ${sw + 6}%)`) }}
              />
            </>
          )}
          {shimmerOn && (
            <img
              src={IMG.swoosh}
              alt=""
              className="boot__shimmer"
              style={mask(`linear-gradient(100deg, transparent ${shimmer - 14}%, #000 ${shimmer}%, transparent ${shimmer + 14}%)`)}
            />
          )}
          <div
            className="boot__flare"
            style={{ left: FLARE_AT[0] * K - 22, top: FLARE_AT[1] * K - 22, opacity: flare, transform: `scale(${flare})` }}
          />
          <img
            src={IMG.text}
            alt=""
            style={{ opacity: txt, filter: txt < 1 ? `blur(${(1 - txt) * 6}px)` : 'none', transform: `translateY(${(1 - txt) * 8}px)` }}
          />
        </div>

        {/* title + CTA */}
        <div className="boot__ui">
          <h1
            className="boot__title"
            style={{ opacity: tIn, transform: `translateY(${(1 - tIn) * 18}px)`, filter: tIn < 1 ? `blur(${(1 - tIn) * 6}px)` : 'none' }}
          >
            {ui.boot.title}
          </h1>
          <button
            type="button"
            className="btn boot__cta"
            style={{
              opacity: bIn,
              transform: `translateY(${(1 - bIn) * 16}px) scale(${0.96 + 0.04 * bIn})`,
              pointerEvents: ctaReady ? 'auto' : 'none',
            }}
            onFocus={() => skipTo(SETTLED)}
            onClick={leave}
          >
            <span className="boot__cta-glow" style={{ opacity: bIn }} aria-hidden="true" />
            <span className="boot__sheen-clip" aria-hidden="true">
              <span className="boot__sheen" style={{ transform: `translateX(${(sx / 100) * 342}px) skewX(-20deg)` }} />
            </span>
            <span>{ui.boot.cta}</span>
            <ArrowForward />
          </button>
        </div>

        {/* boot counter */}
        <div className="boot__foot" dir="ltr" aria-hidden="true" style={{ opacity: footOn }}>
          <div className="boot__foot-row">
            <span className="boot__foot-line" style={{ transform: `scaleX(${lines})` }} />
            <span className={`boot__counter ${booting ? '' : 'is-done'}`}>{counter}</span>
            <span className="boot__foot-line" style={{ transform: `scaleX(${lines})` }} />
          </div>
          <div className="boot__bar" style={{ opacity: barFade }}>
            <span style={{ transform: `scaleX(${barW})` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
