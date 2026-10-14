import { useState } from 'react'
import { useGachaStore, type PullResult } from './gachaStore'
import { useRPGStore } from '../rpg/rpgStore'

const rarityColors: Record<string, string> = {
  common: '#888888',
  rare: '#4488ff',
  epic: '#aa44ff',
  legendary: '#ffaa00',
}

const rarityGlow: Record<string, string> = {
  common: 'rgba(136,136,136,0.4)',
  rare: 'rgba(68,136,255,0.5)',
  epic: 'rgba(170,68,255,0.6)',
  legendary: 'rgba(255,170,0,0.7)',
}

export function GachaPanel({ onClose }: { onClose: () => void }) {
  const { pools, lastPulls, showAnimation, pull, clearLastPulls } = useGachaStore()
  const { gems } = useRPGStore()
  const [selectedPool, setSelectedPool] = useState(pools[0])

  if (showAnimation && lastPulls) {
    return <PullReveal results={lastPulls} onClose={clearLastPulls} />
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.9)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '92%', maxWidth: 550,
        background: 'linear-gradient(135deg, rgba(30,20,50,0.98), rgba(15,10,30,0.98))',
        borderRadius: 16, border: `2px solid ${rarityColors[selectedPool.id === 'legendary' ? 'legendary' : 'epic']}55`,
        boxShadow: '0 0 40px rgba(170,68,255,0.2)',
        padding: 0, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(170,68,255,0.15)',
        }}>
          <span style={{ color: '#cc88ff', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>
            🎰 뽑기 시스템
          </span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ color: '#44ddff', fontSize: 13 }}>💎 {gems}</span>
            <span onClick={onClose} style={{ color: '#ff6666', cursor: 'pointer', fontSize: 20 }}>✕</span>
          </div>
        </div>

        {/* Banner selection */}
        <div style={{ display: 'flex', gap: 8, padding: 12 }}>
          {pools.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedPool(p)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                background: selectedPool.id === p.id
                  ? `linear-gradient(135deg, ${rarityColors[p.id === 'legendary' ? 'legendary' : 'epic']}33, transparent)`
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedPool.id === p.id ? rarityColors[p.id === 'legendary' ? 'legendary' : 'epic'] : 'transparent'}`,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 'bold', color: rarityColors[p.id === 'legendary' ? 'legendary' : 'epic'] }}>
                {p.name}
              </div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                💎 {p.cost.amount}/회
              </div>
            </div>
          ))}
        </div>

        {/* Banner display */}
        <div style={{
          margin: '0 12px 12px', padding: 20, borderRadius: 12, textAlign: 'center',
          background: `radial-gradient(circle, ${rarityGlow[selectedPool.id === 'legendary' ? 'legendary' : 'epic']}, transparent 80%)`,
          minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {selectedPool.id === 'legendary' ? '⭐' : '🎯'}
          </div>
          <div style={{ color: '#ccddff', fontSize: 12 }}>{selectedPool.banner}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11 }}>
            <span style={{ color: '#ffaa00' }}>전설 {selectedPool.rates.legendary}%</span>
            <span style={{ color: '#aa44ff' }}>영웅 {selectedPool.rates.epic}%</span>
            <span style={{ color: '#4488ff' }}>희귀 {selectedPool.rates.rare}%</span>
          </div>
          <div style={{ fontSize: 10, color: '#667788', marginTop: 6 }}>
            확정 보장：{selectedPool.guaranteedAt}회에 전설 확정 | 현재：{selectedPool.pityCounter}회
          </div>
        </div>

        {/* Pull buttons */}
        <div style={{ display: 'flex', gap: 10, padding: '0 12px 16px' }}>
          <button
            onClick={() => pull(selectedPool.id, 1)}
            disabled={gems < selectedPool.cost.amount}
            style={pullBtnStyle(gems >= selectedPool.cost.amount, '#8866cc')}
          >
            뽑기 ×1
            <div style={{ fontSize: 11, opacity: 0.8 }}>💎 {selectedPool.cost.amount}</div>
          </button>
          <button
            onClick={() => pull(selectedPool.id, 10)}
            disabled={gems < selectedPool.cost.amount * 10}
            style={pullBtnStyle(gems >= selectedPool.cost.amount * 10, '#cc88ff')}
          >
            뽑기 ×10
            <div style={{ fontSize: 11, opacity: 0.8 }}>💎 {selectedPool.cost.amount * 10}</div>
          </button>
        </div>
      </div>
    </div>
  )
}

function PullReveal({ results, onClose }: { results: PullResult[]; onClose: () => void }) {
  const [revealed, setRevealed] = useState(0)

  // Auto reveal one by one
  if (revealed < results.length) {
    const result = results[revealed]
    const color = rarityColors[result.rarity]
    return (
      <div
        onClick={() => setRevealed(r => r + 1)}
        style={{
          position: 'absolute', inset: 0, zIndex: 210,
          background: `radial-gradient(circle, ${rarityGlow[result.rarity]}, rgba(0,0,0,0.95))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
      >
        <div style={{
          textAlign: 'center', animation: 'gachaReveal 0.3s ease-out',
        }}>
          {/* Light rays */}
          <div style={{
            fontSize: 80, marginBottom: 16,
            filter: `drop-shadow(0 0 20px ${color})`,
          }}>
            {result.icon}
          </div>
          <div style={{
            color: color, fontSize: 24, fontWeight: 'bold',
            textShadow: `0 0 10px ${color}`, marginBottom: 8,
          }}>
            {result.name}
          </div>
          <div style={{ color: color, fontSize: 12, marginBottom: 4 }}>
            {result.rarity === 'legendary' ? '★★★★ 전설' : result.rarity === 'epic' ? '★★★ 영웅' : result.rarity === 'rare' ? '★★ 희귀' : '★ 일반'}
          </div>
          {result.isNew && (
            <div style={{
              color: '#44ff88', fontSize: 16, fontWeight: 'bold',
              animation: 'pulse 1s infinite',
            }}>✦ NEW ✦</div>
          )}
          <div style={{ color: '#8899aa', fontSize: 12, marginTop: 24 }}>
            {revealed + 1 < results.length ? '클릭하여 계속 ▶' : '클릭하여 완료 ✓'}
          </div>
        </div>
        <style>{`
          @keyframes gachaReveal { 0% { transform: scale(0.5); opacity: 0 } 50% { transform: scale(1.1) } 100% { transform: scale(1); opacity: 1 } }
          @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
        `}</style>
      </div>
    )
  }

  // Summary
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 210,
      background: 'rgba(0,0,0,0.95)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    }} onClick={onClose}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ color: '#cc88ff', fontSize: 18, marginBottom: 16 }}>뽑기 결과</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {results.map((r, i) => (
            <div key={i} style={{
              width: 60, height: 60, borderRadius: 8,
              border: `2px solid ${rarityColors[r.rarity]}`,
              background: rarityColors[r.rarity] + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>
              {r.icon}
            </div>
          ))}
        </div>
        <div style={{ color: '#667788', fontSize: 12, marginTop: 24 }}>클릭하여 닫기</div>
      </div>
    </div>
  )
}

function pullBtnStyle(enabled: boolean, color: string): React.CSSProperties {
  return {
    flex: 1, padding: '12px 0', borderRadius: 10, cursor: enabled ? 'pointer' : 'not-allowed',
    background: enabled ? color + '22' : 'rgba(40,40,50,0.3)',
    border: `1px solid ${enabled ? color : '#333'}`,
    color: enabled ? color : '#555', fontSize: 14, fontWeight: 'bold',
    fontFamily: 'monospace',
  }
}
