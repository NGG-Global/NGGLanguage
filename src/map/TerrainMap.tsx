import type { CSSProperties } from 'react';
import { content } from '../content';
import type { Analysis } from '../logic';
import { useFitScale } from '../hooks';
import {
  FLOOR, LABEL, STARS, buildCalcDots, buildLabels, buildRoutes, buildTerraces,
  type MapMode, type Terrace,
} from './geometry';
import './map.css';

export interface TerrainMapProps {
  mode: MapMode;
  /**
   * welcome: 0 hidden · 1 floor + terraces rise · 2 names + node
   * calc:    0 dots at the node · 1 dots travel to their terraces
   * result:  0 flat · 1 terraces rise · 2 name/glow · 3 light route + magenta node · 4 weak language lit
   */
  stage: number;
  analysis: Analysis | null;
  ariaLabel: string;
  /** Margin above the axis row (prototype: 16 on S1, 0 on S6, 10 on R). */
  axisTop?: number;
}

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const [W, H] = content.map.size;
const [NX, NY] = content.map.node;

function TerraceView({ t, risen, mode, stage }: { t: Terrace; risen: boolean; mode: MapMode; stage: number }) {
  const delay = (j: number) =>
    mode === 'welcome' ? 0.15 + t.order * 0.14 + j * 0.06 : t.order * 0.12 + j * 0.05;
  const [x, y] = t.origin;
  return (
    <>
      {t.layers.map((l) => {
        const style: Vars = {
          left: x,
          top: y,
          '--lift': `${risen ? l.lift : 0}px`,
          '--a': l.alpha,
          opacity: l.j === 0 || risen ? 1 : 0,
          transitionDelay: `${delay(l.j).toFixed(2)}s`,
        };
        if (t.look === 'missing') {
          return (
            <span key={l.j} className={`layer layer--missing ${stage >= 4 ? 'is-lit' : ''}`} style={style} />
          );
        }
        return (
          <span
            key={l.j}
            className={`layer layer--${t.look === 'native' ? 'mag' : t.look === 'calc' ? 'calc' : 'blue'} ${l.isTop ? 'is-top' : ''}`}
            style={style}
          >
            {t.look === 'native' && l.isTop && <span className={`layer__glow ${stage >= 2 ? 'is-on' : ''}`} />}
          </span>
        );
      })}
    </>
  );
}

export function TerrainMap({ mode, stage, analysis, ariaLabel, axisTop = 10 }: TerrainMapProps) {
  const [fitRef, scale] = useFitScale<HTMLDivElement>(W);
  const ui = content.ui;

  const floorOn = mode !== 'welcome' || stage >= 1;
  const risen = mode === 'calc' || stage >= 1;
  const labelsOn = mode === 'welcome' ? stage >= 2 : mode === 'calc' || stage >= 1;
  const nodeOn = labelsOn;
  const routeOn = mode === 'result' && stage >= 3;

  const terraces = buildTerraces(content, mode, analysis);
  const labels = buildLabels(content, mode, analysis);
  const routes = mode === 'result' && analysis ? buildRoutes(content, analysis) : [];
  const dots = mode === 'calc' ? buildCalcDots(content) : [];

  const labelDelay = (order: number) => (mode === 'welcome' ? order * 0.1 : 0.5 + order * 0.08);
  const nodeDelay = mode === 'result' ? 0.6 : 0;

  return (
    <div className={`tmap tmap--${mode}`} ref={fitRef}>
      <div className={`tmap__axes ${floorOn ? 'is-on' : ''}`} style={{ marginTop: axisTop }}>
        <span>{ui.map.axisRight}</span>
        <span className="tmap__axis-left">{ui.map.axisLeft}</span>
      </div>
      <div className="tmap__box" role="img" aria-label={ariaLabel} style={{ width: W * scale, height: H * scale }}>
        <div className="tmap__stage" style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <div className={`tmap__floor ${floorOn ? 'is-on' : ''}`}>
            <div className="tmap__glow" style={{ left: FLOOR.x, top: FLOOR.y, width: FLOOR.size, height: FLOOR.size }} />
            <div className="tmap__grid" style={{ left: FLOOR.x, top: FLOOR.y, width: FLOOR.size, height: FLOOR.size }} />
          </div>
          <div className="tmap__vignette" />
          <div className={`tmap__stars ${floorOn ? 'is-on' : ''}`}>
            {STARS.map(([x, y, r], i) => (
              <span key={i} className="star lt-twinkle" style={{ left: x, top: y, width: r, height: r, animationDelay: `${(i * 0.37).toFixed(2)}s` }} />
            ))}
          </div>

          {terraces.map((t) => (
            <TerraceView key={t.lang} t={t} risen={risen} mode={mode} stage={stage} />
          ))}

          {dots.map((d, i) => {
            const [tx, ty] = stage >= 1 ? d.to : [NX, NY];
            return (
              <span key={i} className="cdot" style={{ transform: `translate(${tx - 4}px, ${ty - 4}px)`, transitionDelay: `${d.delay}s` }} />
            );
          })}

          {routes.map((r) => (
            <svg key={r.weak} className="route" viewBox={`0 0 ${W} 312`} width={W} height={312} aria-hidden="true">
              <path d={r.d} style={{ strokeDasharray: r.len, strokeDashoffset: routeOn ? 0 : r.len }} />
              <circle cx={r.start[0]} cy={r.start[1]} r={4.5} style={{ opacity: routeOn ? 1 : 0 }} />
            </svg>
          ))}

          <div className="node" style={{ left: NX - 17, top: NY - 17, opacity: nodeOn ? 1 : 0, transitionDelay: `${nodeDelay}s` }}>
            <span className="node__ring" />
            <span className="node__halo" />
            <span className="node__core"><span className="node__dot" /></span>
          </div>
          {routeOn && (
            <div className="node node--mag" style={{ left: NX - 17, top: NY - 17 }}>
              <span className="node__ring" />
              <span className="node__halo" />
              <span className="node__core"><span className="node__dot" /></span>
            </div>
          )}
          <span
            className="node__label"
            style={{ left: NX - 60, top: NY + 21, opacity: nodeOn ? 1 : 0, transitionDelay: `${nodeDelay + 0.1}s` }}
          >
            {ui.map.node}
          </span>

          {labels.map((l) => (
            <div
              key={l.lang}
              className="mlabel"
              style={{ left: l.x, top: l.y, width: LABEL.width, opacity: labelsOn ? 1 : 0, transitionDelay: `${labelDelay(l.order).toFixed(2)}s` }}
            >
              <div className={`mlabel__box mlabel--${l.look} ${l.look === 'missing' && stage >= 4 ? 'is-lit' : ''}`}>
                <span className="mlabel__name">{l.name}</span>
                {l.status && <span className="mlabel__status">{l.status}</span>}
                {l.look === 'missing' && <span className="mlabel__bring">{ui.result.bring}</span>}
              </div>
            </div>
          ))}

          <span className={`tmap__row tmap__row--top ${floorOn ? 'is-on' : ''}`}>{ui.map.rowTop}</span>
          <span className={`tmap__row tmap__row--bottom ${floorOn ? 'is-on' : ''}`}>{ui.map.rowBottom}</span>
        </div>
      </div>
    </div>
  );
}

