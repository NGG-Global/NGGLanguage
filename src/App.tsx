import { useEffect, useMemo, useReducer, useRef } from 'react';
import { content } from './content';
import { createReducer, initialState } from './state/flow';
import { analyse } from './logic';
import { usePageVisibility } from './hooks';
import { Boot } from './boot/Boot';
import { Welcome } from './screens/Welcome';
import { Frame } from './screens/Frame';
import { Question } from './screens/Question';
import { TieBreak } from './screens/TieBreak';
import { Calc } from './screens/Calc';
import { Result } from './screens/Result';

const reducer = createReducer({ items: content.items, thresholds: content.thresholds });

export function App() {
  const [s, dispatch] = useReducer(reducer, undefined, () => initialState(content.items, 'boot'));
  usePageVisibility();

  const analysis = useMemo(
    () => (s.screen === 'tie' || s.screen === 'calc' || s.screen === 'result'
      ? analyse(s.answers, content.items, content.thresholds, s.tieChoice)
      : null),
    [s.screen, s.answers, s.tieChoice],
  );

  // New screen: start at the top and move focus to it for screen readers.
  const appRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (first.current) {
      first.current = false;
      return;
    }
    appRef.current?.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
  }, [s.screen, s.run]);

  const key = `${s.run}-${s.screen}`;
  let screen;
  switch (s.screen) {
    case 'boot':
      screen = <Boot key={key} onDone={() => dispatch({ type: 'BOOT_DONE' })} />;
      break;
    case 'welcome':
      screen = <Welcome key={key} settled={s.introPlayed} onStart={() => dispatch({ type: 'START' })} />;
      break;
    case 'frame':
      screen = <Frame key={key} onNext={() => dispatch({ type: 'TO_FIRST' })} onBack={() => dispatch({ type: 'BACK' })} />;
      break;
    case 'question':
      screen = <Question key={key} state={s} dispatch={dispatch} />;
      break;
    case 'tie':
      screen = <TieBreak key={key} analysis={analysis!} onPick={(lang) => dispatch({ type: 'TIE_PICK', lang })} />;
      break;
    case 'calc':
      screen = <Calc key={key} onDone={() => dispatch({ type: 'CALC_DONE' })} />;
      break;
    case 'result':
      screen = <Result key={key} analysis={analysis!} onRestart={() => dispatch({ type: 'RESTART' })} />;
      break;
  }

  return (
    <div className="app" ref={appRef} data-screen={s.screen}>
      {screen}
    </div>
  );
}
