import { useRef, useState } from 'react';
import { DogMascot } from '../../mascot/index.js';
import { ChristmasHat } from '../head/christmas-hat';
import { Carrot } from '../mouth/carrot';
import { Bow } from '../head/bow';
import { Ball } from '../mouth/ball';
import { Duck } from '../head/duck';
import { Glasses } from '../eyes/glasses';

// Try-on page: the mascot dog (from ../mascot, unchanged) with accessories put on it.
// Play/Pause, the full 12-second sequence on a slider, each accessory on/off, backgrounds and sizes.
const BLOCK_NAMES = ['поза 1', 'поза 1', 'поза 1', 'игровая поза'];
const STAGE_NAMES = { 'pose 1': 'поза 1', crouch: 'приседание', 'pose 2': 'поза 2', return: 'возвращение' };
// Preview canvas around the dog's own 240×240 frame (in dog units): room above and at the sides
// for accessories that rise above the head while the dog moves (the duck goes up to 25.4 above
// the frame at about 11.8 s, the hat up to 16). The dog and accessories are not scaled or moved.
const ROOM = { top: 36, side: 20, bottom: 8 };

const MARKS = [
  [0, 'Начало'], [0.6, 'Поворот головы'], [1.3, 'Блеск линз'], [9.25, 'Приседание'], [10.5, 'Поза 2'], [11.75, 'Возвращение']
];

export default function App() {
  const dog = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [glasses, setGlasses] = useState(true);
  const [duck, setDuck] = useState(false);
  const [ball, setBall] = useState(false);
  const [bow, setBow] = useState(false);
  const [carrot, setCarrot] = useState(false);
  const [hat, setHat] = useState(false);
  const [info, setInfo] = useState({ time: 0, blockIndex: 0, stage: 'pose 1' });
  const [size, setSize] = useState(240);
  const [showFrame, setShowFrame] = useState(false);
  const k = size / 240;
  const [bg, setBg] = useState('white');

  const jump = t => { setPlaying(false); dog.current.seek(t); };

  return (
    <main className="player">
      <h1>Примерка: очки</h1>
      <div
        className={`stage bg-${bg}`}
        style={{
          width: (240 + 2 * ROOM.side) * k, height: (240 + ROOM.top + ROOM.bottom) * k,
          paddingTop: ROOM.top * k, paddingLeft: ROOM.side * k
        }}
      >
        {showFrame && (
          <div className="dog-frame" style={{ top: ROOM.top * k, left: ROOM.side * k, width: size, height: size }} />
        )}
        <ChristmasHat enabled={hat}>
          <Duck enabled={duck}>
            <Bow enabled={bow}>
              <Glasses enabled={glasses}>
                <Carrot enabled={carrot}>
                  <Ball enabled={ball}>
                    <DogMascot ref={dog} size={size} playing={playing} onFrame={setInfo} />
                  </Ball>
                </Carrot>
              </Glasses>
            </Bow>
          </Duck>
        </ChristmasHat>
      </div>

      <div className="row">
        <button type="button" className={playing ? '' : 'primary'} disabled={playing} onClick={() => setPlaying(true)}>
          ▶ Play
        </button>
        <button type="button" className={playing ? 'primary' : ''} disabled={!playing} onClick={() => setPlaying(false)}>
          ❚❚ Pause
        </button>
      </div>

      <div className="row" role="group" aria-label="Аксессуары">
        <button type="button" className={glasses ? 'primary' : ''} aria-pressed={glasses} onClick={() => setGlasses(v => !v)}>
          🕶️ Очки: {glasses ? 'вкл' : 'выкл'}
        </button>
        <button type="button" className={duck ? 'primary' : ''} aria-pressed={duck} onClick={() => setDuck(v => !v)}>
          🐥 Уточка: {duck ? 'вкл' : 'выкл'}
        </button>
        <button type="button" className={ball ? 'primary' : ''} aria-pressed={ball} onClick={() => setBall(v => !v)}>
          🎾 Мячик: {ball ? 'вкл' : 'выкл'}
        </button>
        <button type="button" className={bow ? 'primary' : ''} aria-pressed={bow} onClick={() => setBow(v => !v)}>
          🎀 Бантик: {bow ? 'вкл' : 'выкл'}
        </button>
        <button type="button" className={carrot ? 'primary' : ''} aria-pressed={carrot} onClick={() => setCarrot(c => !c)}>
          🥕 Морковка: {carrot ? 'вкл' : 'выкл'}
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

      <div className="row sizes" role="group" aria-label="Рамка кадра">
        <button type="button" className={showFrame ? 'primary' : ''} aria-pressed={showFrame} onClick={() => setShowFrame(v => !v)}>
          Кадр собачки 240×240: {showFrame ? 'показан' : 'скрыт'}
        </button>
      </div>

      <div className="row sizes" role="group" aria-label="Размер">
        {[240, 120, 64].map(s => (
          <button key={s} type="button" className={size === s ? 'primary' : ''} onClick={() => setSize(s)}>{s} px</button>
        ))}
      </div>
    </main>
  );
}
