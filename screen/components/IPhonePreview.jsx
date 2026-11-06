import { useEffect, useState } from 'react';

// iPhone 16 Pro screen: 402 × 874 pt, 12 pt bezel. On narrow viewports (a real phone)
// the same screen is scaled to the full width, without the device frame.
const SCREEN_W = 402;
const SCREEN_H = 874;
const DEVICE_W = SCREEN_W + 24;
const DEVICE_H = SCREEN_H + 24;
const PANEL_H = 52;   // preview panel under the device (Restart)

function useViewport() {
  const get = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [v, setV] = useState(get);
  useEffect(() => {
    const onResize = () => setV(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return v;
}

// Preview panel (outside the phone): Restart resets the test state of the shop.
function PreviewPanel({ onRestart }) {
  if (!onRestart) return null;
  return (
    <div className="preview-panel">
      <button type="button" className="preview-restart" onClick={onRestart} title="Reset balance, purchases and worn items">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12.6 1.6v3.2H9.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Restart
      </button>
    </div>
  );
}

export default function IPhonePreview({ children, onRestart }) {
  const v = useViewport();

  if (v.w <= 500) {
    const scale = v.w / SCREEN_W;
    return (
      <div className="full-wrap">
        <div className="full" style={{ height: SCREEN_H * scale }}>
          <div className="screen bare" style={{ transform: `scale(${scale})` }}>{children}</div>
        </div>
        <PreviewPanel onRestart={onRestart} />
      </div>
    );
  }

  const panel = onRestart ? PANEL_H : 0;
  const scale = Math.min(1, (v.h - 32 - panel) / DEVICE_H, (v.w - 32) / DEVICE_W);
  const margin = `${(DEVICE_H * scale - DEVICE_H) / 2}px ${(DEVICE_W * scale - DEVICE_W) / 2}px`;
  return (
    <div className="stage">
      <div className="device" style={{ transform: `scale(${scale})`, margin }}>
        <div className="screen">
          {children}
          <div className="island" />
        </div>
      </div>
      <PreviewPanel onRestart={onRestart} />
    </div>
  );
}
