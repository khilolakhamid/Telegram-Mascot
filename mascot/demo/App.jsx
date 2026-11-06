import { useRef, useState } from 'react';
import { DogMascot } from '../index.js';

// Demo page: shows the mascot with Play/Pause and the position in the 12-second sequence.
// The mascot itself does not depend on anything here.
const BLOCK_NAMES = ['pose 1', 'pose 1', 'pose 1', 'play pose'];
const STAGE_NAMES = { 'pose 1': 'pose 1', crouch: 'crouch', 'pose 2': 'pose 2', return: 'return' };

export default function App() {
  const dog = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [info, setInfo] = useState({ time: 0, blockIndex: 0, stage: 'pose 1' });
  const [size, setSize] = useState(240);
  const [bg, setBg] = useState('white');

  return (
    <main className="player">
      <div className={`stage bg-${bg}`} style={{ width: size, height: size }}>
        <DogMascot ref={dog} size={size} playing={playing} onFrame={setInfo} />
      </div>

      <div className="row">
        <button type="button" className={playing ? '' : 'primary'} disabled={playing} onClick={() => setPlaying(true)}>
          ▶ Play
        </button>
        <button type="button" className={playing ? 'primary' : ''} disabled={!playing} onClick={() => setPlaying(false)}>
          ❚❚ Pause
        </button>
      </div>

      <label className="scrub">
        <span>0 s</span>
        <input
          type="range" min="0" max="12000" value={Math.round(info.time * 1000)}
          aria-label="Position in the sequence"
          onChange={e => { setPlaying(false); dog.current.seek(e.target.value / 1000); }}
        />
        <span>12 s</span>
      </label>

      <div className="meta">
        {info.time.toFixed(2)} / 12.00 s · block {info.blockIndex + 1}/4 ({BLOCK_NAMES[info.blockIndex]}) · {STAGE_NAMES[info.stage] || info.stage}
      </div>

      <div className="row sizes" role="group" aria-label="Background">
        {[['white', 'White'], ['dark', 'Dark'], ['color', 'Colour'], ['checker', 'Transparency']].map(([k, label]) => (
          <button key={k} type="button" className={bg === k ? 'primary' : ''} onClick={() => setBg(k)}>{label}</button>
        ))}
      </div>

      <div className="row sizes" role="group" aria-label="Size">
        {[240, 120, 64].map(s => (
          <button key={s} type="button" className={size === s ? 'primary' : ''} onClick={() => setSize(s)}>{s} px</button>
        ))}
      </div>
    </main>
  );
}
