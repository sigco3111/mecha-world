import { useState } from 'react'
import { useRPGStore, type ItemData } from './rpgStore'

const rarityColors: Record<string, string> = {
  common: '#888888',
  rare: '#4488ff',
  epic: '#aa44ff',
  legendary: '#ffaa00',
}

const rarityLabels: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
}

export function InventoryPanel({ onClose }: { onClose: () => void }) {
  const { inventory, equipItem, unequipItem, useConsumable } = useRPGStore()
  const [selected, setSelected] = useState<ItemData | null>(null)

  const sorted = [...inventory].sort((a, b) => {
    const order = { legendary: 0, epic: 1, rare: 2, common: 3 }
    return order[a.rarity] - order[b.rarity]
  })

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '90%', maxWidth: 600, maxHeight: '85vh',
        background: 'linear-gradient(135deg, rgba(20,25,50,0.98), rgba(10,12,30,0.98))',
        borderRadius: 16, border: '1px solid rgba(0,255,255,0.3)',
        boxShadow: '0 0 40px rgba(0,100,255,0.2)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(0,255,255,0.15)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#00ffff', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>
            📦 装备背包
          </span>
          <span onClick={onClose} style={{
            color: '#ff6666', cursor: 'pointer', fontSize: 20, padding: '0 8px',
          }}>✕</span>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Item grid */}
          <div style={{
            flex: 2, padding: 12, overflowY: 'auto',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8,
          }}>
            {sorted.map(item => (
              <div
                key={item.id}
                onClick={() => setSelected(item)}
                style={{
                  width: 70, height: 70, borderRadius: 8,
                  background: item.equipped
                    ? `linear-gradient(135deg, ${rarityColors[item.rarity]}33, ${rarityColors[item.rarity]}11)`
                    : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${selected?.id === item.id ? '#00ffff' : rarityColors[item.rarity] + '66'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', cursor: 'pointer', position: 'relative',
                  transition: 'transform 0.1s',
                  transform: selected?.id === item.id ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                {item.count > 1 && (
                  <span style={{
                    position: 'absolute', bottom: 2, right: 4,
                    fontSize: 11, color: '#fff', fontWeight: 'bold',
                    textShadow: '0 0 3px #000',
                  }}>{item.count}</span>
                )}
                {item.equipped && (
                  <span style={{
                    position: 'absolute', top: 2, left: 3,
                    fontSize: 9, color: '#00ff00',
                  }}>✓</span>
                )}
              </div>
            ))}
            {inventory.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', padding: 40 }}>
                背包是空的，去打怪吧！
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div style={{
            flex: 1, padding: 16, borderLeft: '1px solid rgba(0,255,255,0.1)',
            overflowY: 'auto', minWidth: 180,
          }}>
            {selected ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 48 }}>{selected.icon}</span>
                </div>
                <div style={{
                  color: rarityColors[selected.rarity], fontWeight: 'bold', fontSize: 14,
                  textAlign: 'center', marginBottom: 4,
                }}>{selected.name}</div>
                <div style={{
                  textAlign: 'center', fontSize: 11, color: rarityColors[selected.rarity],
                  marginBottom: 12,
                }}>{rarityLabels[selected.rarity]} · {selected.type === 'weapon' ? '武器' : selected.type === 'armor' ? '护甲' : selected.type === 'core' ? '核心' : selected.type === 'material' ? '材料' : '消耗品'}</div>
                <div style={{ fontSize: 12, color: '#aabbcc', lineHeight: 1.6, marginBottom: 12 }}>
                  {selected.description}
                </div>
                {selected.stats && (
                  <div style={{ fontSize: 12, marginBottom: 12 }}>
                    {selected.stats.attack && <div style={{ color: '#ff8844' }}>攻击 +{selected.stats.attack}</div>}
                    {selected.stats.defense && <div style={{ color: '#44aaff' }}>防御 +{selected.stats.defense}</div>}
                    {selected.stats.maxHp && <div style={{ color: '#ff4444' }}>生命 +{selected.stats.maxHp}</div>}
                    {selected.stats.maxEnergy && <div style={{ color: '#44ddff' }}>能量 +{selected.stats.maxEnergy}</div>}
                  </div>
                )}
                {(selected.type === 'weapon' || selected.type === 'armor' || selected.type === 'core') && (
                  selected.equipped ? (
                    <button
                      onClick={() => { unequipItem(selected.type as 'weapon' | 'armor' | 'core'); setSelected({ ...selected, equipped: false }) }}
                      style={btnStyle('#ff6644')}
                    >卸下</button>
                  ) : (
                    <button
                      onClick={() => { equipItem(selected.id); setSelected({ ...selected, equipped: true }) }}
                      style={btnStyle('#44ff88')}
                    >装备</button>
                  )
                )}
                {selected.type === 'consumable' && (
                  <button
                    onClick={() => {
                      useConsumable(selected.id)
                      const updated = useRPGStore.getState().inventory.find(i => i.id === selected.id)
                      if (updated) {
                        setSelected({ ...updated })
                      } else {
                        setSelected(null)
                      }
                    }}
                    disabled={selected.count <= 0}
                    style={btnStyle('#44ddff')}
                  >使用 ({selected.count})</button>
                )}
                {selected.type === 'material' && (
                  <div style={{ textAlign: 'center', color: '#888', padding: 12, fontSize: 12 }}>
                    💧 材料物品，用于装备升级
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#666', textAlign: 'center', paddingTop: 40, fontSize: 13 }}>
                选择一个装备查看详情
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function btnStyle(color: string): React.CSSProperties {
  return {
    width: '100%', padding: '10px 0', borderRadius: 8, cursor: 'pointer',
    background: color + '22', border: `1px solid ${color}`, color: color,
    fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace',
    transition: 'all 0.15s',
  }
}
