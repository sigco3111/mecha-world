import { useState } from 'react'
import { useRPGStore, type MechaConfig } from './rpgStore'

const rarityColors: Record<string, string> = {
  common: '#888888',
  rare: '#4488ff',
  epic: '#aa44ff',
  legendary: '#ffaa00',
}

export function MechaSelectPanel({ onClose }: { onClose: () => void }) {
  const { mechas, equipMecha, unlockMecha, gems } = useRPGStore()
  const [selected, setSelected] = useState<MechaConfig | null>(mechas[0])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '92%', maxWidth: 650, maxHeight: '85vh',
        background: 'linear-gradient(135deg, rgba(30,20,50,0.98), rgba(15,10,30,0.98))',
        borderRadius: 16, border: '1px solid rgba(170,68,255,0.3)',
        boxShadow: '0 0 40px rgba(170,68,255,0.2)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(170,68,255,0.15)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#cc88ff', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>
            🤖 메카 도감
          </span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ color: '#44ddff', fontSize: 13 }}>💎 {gems}</span>
            <span onClick={onClose} style={{ color: '#ff6666', cursor: 'pointer', fontSize: 20 }}>✕</span>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Mecha list */}
          <div style={{ width: 180, overflowY: 'auto', padding: 8, borderRight: '1px solid rgba(170,68,255,0.1)' }}>
            {mechas.map(m => (
              <div
                key={m.id}
                onClick={() => setSelected(m)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8,
                  cursor: 'pointer', marginBottom: 4,
                  background: selected?.id === m.id ? 'rgba(170,68,255,0.15)' : 'transparent',
                  border: selected?.id === m.id ? '1px solid rgba(170,68,255,0.4)' : '1px solid transparent',
                }}
              >
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: m.owned ? m.color : '#333',
                  boxShadow: m.owned ? `0 0 8px ${m.color}` : 'none',
                }} />
                <span style={{
                  color: m.owned ? '#ddddee' : '#555566',
                  fontSize: 12,
                }}>
                  {m.name}
                  {!m.owned && ' 🔒'}
                </span>
              </div>
            ))}
          </div>

          {/* Detail */}
          <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
            {selected && (
              <div>
                {/* Mecha 3D-ish preview */}
                <div style={{
                  textAlign: 'center', marginBottom: 20, position: 'relative', height: 120,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `radial-gradient(circle, ${selected.color}22, transparent 70%)`,
                  borderRadius: 12,
                }}>
                  <MechaIcon color={selected.owned ? selected.color : '#444'} size={80} />
                  {selected.equipped && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: '#44ff88', color: '#000', padding: '2px 8px',
                      borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                    }}>사용 중</div>
                  )}
                </div>

                <div style={{ textAlign: 'center', marginBottom: 4 }}>
                  <span style={{
                    fontSize: 18, fontWeight: 'bold',
                    color: selected.owned ? rarityColors[selected.rarity] : '#666',
                  }}>{selected.name}</span>
                </div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 11, color: rarityColors[selected.rarity] }}>
                    {selected.rarity === 'common' ? '일반' : selected.rarity === 'rare' ? '희귀' : selected.rarity === 'epic' ? '영웅' : '전설'}
                  </span>
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16,
                }}>
                  <StatCard label="체력" value={selected.baseHp} icon="❤️" color="#ff4444" locked={!selected.owned} />
                  <StatCard label="공격" value={selected.baseAttack} icon="⚔️" color="#ff8844" locked={!selected.owned} />
                  <StatCard label="방어" value={selected.baseDefense} icon="🛡️" color="#44aaff" locked={!selected.owned} />
                  <StatCard label="속도" value={selected.baseSpeed} icon="💨" color="#44ddff" locked={!selected.owned} />
                </div>

                {/* Skill */}
                <div style={{
                  background: 'rgba(170,68,255,0.1)', borderRadius: 8, padding: 10, marginBottom: 16,
                  border: '1px solid rgba(170,68,255,0.2)',
                }}>
                  <div style={{ fontSize: 11, color: '#aa66cc', marginBottom: 4 }}>특수 스킬</div>
                  <div style={{ fontSize: 14, color: '#cc88ff', fontWeight: 'bold' }}>{selected.skill}</div>
                </div>

                {/* Actions */}
                {selected.owned ? (
                  selected.equipped ? (
                    <div style={{ textAlign: 'center', color: '#44ff88', padding: 12 }}>
                      ✓ 현재 장착 중
                    </div>
                  ) : (
                    <button onClick={() => equipMecha(selected.id)} style={btnStyle('#44ff88')}>
                      이 메카 장착
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => { unlockMecha(selected.id) }}
                    disabled={gems < 100}
                    style={btnStyle(gems >= 100 ? '#ffaa00' : '#555555')}
                  >
                    {gems >= 100 ? `해금 (💎 100)` : '다이아 부족 (100개 필요)'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, locked }: { label: string; value: number; icon: string; color: string; locked: boolean }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 10, color: '#888' }}>{label}</div>
      <div style={{ fontSize: 16, color: locked ? '#555' : color, fontWeight: 'bold', fontFamily: 'monospace' }}>
        {locked ? '???' : value}
      </div>
    </div>
  )
}

function MechaIcon({ color, size }: { color: string; size: number }) {
  return (
    <div style={{
      width: size, height: size * 1.3,
      position: 'relative',
    }}>
      {/* Head */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: size * 0.5, height: size * 0.4, borderRadius: 4,
        background: color, boxShadow: `0 0 15px ${color}88`,
      }} />
      {/* Body */}
      <div style={{
        position: 'absolute', top: size * 0.4, left: '50%', transform: 'translateX(-50%)',
        width: size * 0.7, height: size * 0.5, borderRadius: 6,
        background: color, opacity: 0.8,
      }} />
      {/* Eyes glow */}
      <div style={{
        position: 'absolute', top: size * 0.1, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: size * 0.12,
      }}>
        <div style={{ width: size * 0.08, height: size * 0.08, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px #ff0' }} />
        <div style={{ width: size * 0.08, height: size * 0.08, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px #ff0' }} />
      </div>
    </div>
  )
}

function btnStyle(color: string): React.CSSProperties {
  return {
    width: '100%', padding: '12px 0', borderRadius: 8, cursor: 'pointer',
    background: color + '22', border: `1px solid ${color}`, color: color,
    fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace',
  }
}
