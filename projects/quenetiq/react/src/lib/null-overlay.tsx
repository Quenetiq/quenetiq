import type { ReactNode } from 'react';
import { useEpicFetus } from './use-epic-fetus';

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: '0', zIndex: 99999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  overlayNull: {
    background: 'rgba(0,0,0,0.92)',
  },
  overlayError: {
    background: 'rgba(80,0,0,0.92)',
  },
  content: {
    textAlign: 'center',
  },
  icon: {
    fontSize: '6rem', marginBottom: '1rem',
  },
  nullSym: {
    color: '#ff0',
    textShadow: '0 0 20px #ff0, 0 0 40px #ff0, 0 0 80px #f80',
  },
  errSym: {
    color: '#f44',
    textShadow: '0 0 20px #f44, 0 0 40px #f44, 0 0 80px #a00',
  },
  titleNull: {
    fontSize: '3rem', fontWeight: 900, letterSpacing: '0.15em',
    marginBottom: '.75rem', textTransform: 'uppercase',
    color: '#ff0',
    textShadow: '0 0 20px #ff0, 4px 0 rgba(255,0,0,0.5), -4px 0 rgba(0,0,255,0.5)',
  },
  titleError: {
    fontSize: '3rem', fontWeight: 900, letterSpacing: '0.15em',
    marginBottom: '.75rem', textTransform: 'uppercase',
    color: '#f44',
    textShadow: '0 0 20px #f44, 4px 0 rgba(255,255,0,0.5), -4px 0 rgba(255,0,0,0.5)',
  },
  message: {
    fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)',
    fontFamily: 'monospace', marginBottom: '1rem',
    whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const,
  },
  sub: {
    fontSize: '.85rem', color: 'rgba(255,255,255,0.4)',
    letterSpacing: '.3em', textTransform: 'uppercase',
  },
};

export function NullOverlay(): ReactNode {
  const event = useEpicFetus();
  if (!event) return null;

  const isNull = event.type === 'null-value';
  const title = isNull ? 'NULL DETECTED' : 'У ВАС ОШИБКА В КВЕРИ';
  const message = isNull ? (event.path ?? 'unknown') : event.message;

  return (
    <div style={{ ...s['overlay'], ...(isNull ? s['overlayNull'] : s['overlayError']) }}>
      <div style={s['content']}>
        <div style={s['icon']}>
          {isNull ? (
            <span style={s['nullSym']}>&empty;</span>
          ) : (
            <span style={s['errSym']}>&#9888;</span>
          )}
        </div>
        <div style={isNull ? s['titleNull'] : s['titleError']}>{title}</div>
        <div style={s['message']}>{message}</div>
        <div style={s['sub']}>THE DATA IS CORRUPTED</div>
      </div>
    </div>
  );
}
