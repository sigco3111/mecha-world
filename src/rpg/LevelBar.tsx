import { useRPGStore } from './rpgStore'

export function LevelBar() {
  const { level, exp, expToNext, gold, gems } = useRPGStore()
  const pct = Math.min(100, (exp / expToNext) * 100)

  return (
    <div style={{
      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 90, display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Level badge */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'linear-gradient(135deg, #ffaa00, #ff6600)',
        border: '2px solid #ffdd44', boxShadow: '0 0 12px rgba(255,170,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <span style={{ fontSize: 8, color: '#ffdd88' }}>LV</span>
        <span style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', lineHeight: 1 }}>{level}</span>
      </div>

      {/* EXP bar */}
      <div style={{
        width: 180, height: 12, borderRadius: 6,
        background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,255,255,0.3)',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          width: pct + '%', height: '100%',
          background: 'linear-gradient(90deg, #00ff88, #00ddff)',
          borderRadius: 6, transition: 'width 0.5s',
          boxShadow: '0 0 8px rgba(0,255,136,0.5)',
        }} />
        <span style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          fontSize: 9, color: '#fff', fontFamily: 'monospace', textShadow: '0 0 3px #000',
        }}>
          {exp} / {expToNext}
        </span>
      </div>

      {/* Gold */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '4px 10px',
        border: '1px solid rgba(255,200,0,0.3)',
      }}>
        <span style={{ fontSize: 14 }}>💰</span>
        <span style={{ color: '#ffcc44', fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' }}>
          {gold.toLocaleString()}
        </span>
      </div>

      {/* Gems */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '4px 10px',
        border: '1px solid rgba(68,221,255,0.3)',
      }}>
        <span style={{ fontSize: 14 }}>💎</span>
        <span style={{ color: '#44ddff', fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' }}>
          {gems}
        </span>
      </div>
    </div>
  )
}
