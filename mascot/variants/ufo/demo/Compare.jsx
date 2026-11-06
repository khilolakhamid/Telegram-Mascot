import { useEffect, useRef, useState } from 'react';
import { SKINS } from '../../index.js';

// Side-by-side check of the two skins on one shared clock: both dogs are seeked to the same time
// every frame, so any difference you see is the visual model, never the timing.
const TOTAL = 12;
const FRAME = 1 / 60;
const BLOCKS = ['pose 1', 'pose 1', 'pose 1', 'play pose'];
const STAGES = { 'pose 1': 'pose 1', crouch: 'crouch', 'pose 2': 'pose 2', return: 'return' };
const ORDER = ['original', 'ufo'];

export default function Compare() {
  const refs = { original: useRef(null), ufo: useRef(null) };
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);
  const [info, setInfo] = useState({ blockIndex: 0, stage: 'pose 1' });
  const [bg, setBg] = useState('white');
  const clock = useRef({ t: 0, last: 0 });

  const seekAll = t => {
    const tt = ((t % TOTAL) + TOTAL) % TOTAL;
    clock.current.t = tt;
    ORDER.forEach(k => refs[k].current && refs[k].current.seek(tt));
    setTime(tt);
  };

  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    clock.current.last = performance.now();
    const tick = now => {
      const dt = Math.min(0.1, (now - clock.current.last) / 1000);
      clock.current.last = now;
      seekAll(clock.current.t + dt * speed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed]);

  const step = d => { setPlaying(false); seekAll(clock.current.t + d); };

  return (
    <main className="compare">
      <div className="stages">
        {ORDER.map(k => {
          const { Component, name } = SKINS[k];
          return (
            <figure key={k} className="dog">
              <div className={`stage bg-${bg}`}>
                <Component ref={refs[k]} size={240} playing={false} onFrame={k === 'original' ? setInfo : undefined} />
              </div>
              <figcaption>{name}</figcaption>
            </figure>
          );
        })}
      </div>

      <div className="panel">
        <div className="row">
          <button type="button" className={playing ? '' : 'primary'} disabled={playing} onClick={() => setPlaying(true)}>▶ Play</button>
          <button type="button" className={playing ? 'primary' : ''} disabled={!playing} onClick={() => setPlaying(false)}>❚❚ Pause</button>
          <button type="button" aria-label="Previous frame" onClick={() => step(-FRAME)}>◀ frame</button>
          <button type="button" aria-label="Next frame" onClick={() => step(FRAME)}>frame ▶</button>
        </div>

        <label className="scrub">
          <span>0 s</span>
          <input type="range" min="0" max={TOTAL * 1000 - 1} value={Math.round(time * 1000)} aria-label="Position in the sequence"
                 onChange={e => { setPlaying(false); seekAll(e.target.value / 1000); }} />
          <span>12 s</span>
        </label>

        <div className="meta">
          {time.toFixed(2)} / 12.00 s · block {info.blockIndex + 1}/4 ({BLOCKS[info.blockIndex]}) · {STAGES[info.stage] || info.stage}
        </div>

        <div className="row small">
          <span className="label">Speed</span>
          {[1, 0.5, 0.25].map(v => (
            <button key={v} type="button" className={speed === v ? 'primary' : ''} onClick={() => setSpeed(v)}>{v === 1 ? '1×' : v === 0.5 ? '½×' : '¼×'}</button>
          ))}
        </div>
        <div className="row small">
          <span className="label">Antennas</span>
          <button type="button" onClick={() => { setPlaying(false); seekAll(4.6); }}>at rest</button>
          <button type="button" onClick={() => { seekAll(3.35); setSpeed(0.5); setPlaying(true); }}>head turn</button>
          <button type="button" onClick={() => { seekAll(11.4); setSpeed(0.5); setPlaying(true); }}>return and settle</button>
        </div>
        <div className="row small">
          <span className="label">Jump to</span>
          <button type="button" onClick={() => { setPlaying(false); seekAll(9.25); }}>crouch</button>
          <button type="button" onClick={() => { setPlaying(false); seekAll(10.5); }}>pose 2</button>
          <button type="button" onClick={() => { setPlaying(false); seekAll(11.75); }}>return</button>
          <button type="button" onClick={() => { seekAll(8.6); setSpeed(0.25); setPlaying(true); }}>watch slowly</button>
        </div>
        <div className="row small">
          <span className="label">Background</span>
          {[['white', 'White'], ['dark', 'Dark'], ['checker', 'Transparency']].map(([k, label]) => (
            <button key={k} type="button" className={bg === k ? 'primary' : ''} onClick={() => setBg(k)}>{label}</button>
          ))}
        </div>
      </div>
    </main>
  );
}
