import { useRef, useState } from 'react';
import { DogMascot } from '../../mascot/index.js';
import { ChristmasHat } from '../head/christmas-hat';

// Try-on page: the mascot dog (from ../mascot, unchanged) with the Christmas hat put on top.
// Play/Pause, the full 12-second sequence on a slider, hat on/off, backgrounds and sizes.
const BLOCK_NAMES = ['поза 1', 'поза 1', 'поза 1', 'игровая поза'];
const STAGE_NAMES = { 'pose 1': 'поза 1', crouch: 'приседание', 'pose 2': 'поза 2', return: 'возвращение' };
const MARKS = [
  [0, 'Начало'], [0.6, 'Поворот головы'], [9.25, 'Приседание'], [10.5, 'Поза 2'], [11.75, 'Возвращение']
];

export default function App() {
  const dog = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [hat, setHat] = useState(true);
  const [info, setInfo] = useState({ time: 0, blockIndex: 0, stage: 'pose 1' });
  const [size, setSize] = useState(240);
  const [bg, setBg] = useState('white');

  const jump = t => { setPlaying(false); dog.current.seek(t); };

  return (
    <main className="player">
      <h1>Примерка: шапочка</h1>
      <div className={`stage bg-${bg}`} style={{ width: size, height: size }}>
        <ChristmasHat enabled={hat}>
          <DogMascot ref={dog} size={size} playing={playing} onFrame={setInfo} />
        </ChristmasHat>
      </div>

      <div className="row">
        <button type="button" className={playing ? '' : 'primary'} disabled={playing} onClick={() => setPlaying(true)}>
          ▶ Play
        </button>
        <button type="button" className={playing ? 'primary' : ''} disabled={!playing} onClick={() => setPlaying(false)}>
          ❚❚ Pause
        </button>
        <button type="button" className={hat ? 'primary' : ''} aria-pressed={hat} onClick={() => setHat(h => !h)}>
          🎅 Шапочка: {hat ? 'вкл' : 'выкл'}
        </button>
      </div>

      <label className="scrub">
        <span>0 с</span>
        <input
          type="range" min="0" max="12000" value={Math.round(info.time * 1000)}
          aria-label="Положение в последовательности"
          onChange={e => jump(e.target.value / 1000)}
        />
        <span>12 с</span>
      </label>

      <div className="meta">
        {info.time.toFixed(2)} / 12.00 s · блок {info.blockIndex + 1}/4 ({BLOCK_NAMES[info.blockIndex]}) · {STAGE_NAMES[info.stage] || info.stage}
      </div>

      <div className="row sizes" role="group" aria-label="Переход к моменту">
        {MARKS.map(([t, label]) => (
          <button key={t} type="button" onClick={() => jump(t)}>{label}</button>
        ))}
      </div>

      <div className="row sizes" role="group" aria-label="Фон под компонентом">
        {[['white', 'Белый'], ['dark', 'Тёмный'], ['color', 'Цветной'], ['checker', 'Прозрачность']].map(([k, label]) => (
          <button key={k} type="button" className={bg === k ? 'primary' : ''} onClick={() => setBg(k)}>{label}</button>
        ))}
      </div>

      <div className="row sizes" role="group" aria-label="Размер">
        {[240, 120, 64].map(s => (
          <button key={s} type="button" className={size === s ? 'primary' : ''} onClick={() => setSize(s)}>{s} px</button>
        ))}
      </div>
    </main>
  );
}
