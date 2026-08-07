import { useState } from 'react'
import { useRPGStore, type ItemData } from '../rpg/rpgStore'

interface ShopItem {
  id: string
  name: string
  icon: string
  description: string
  price: { currency: 'gold' | 'gems'; amount: number }
  type: 'item' | 'consumable'
  itemData?: Partial<ItemData>
}

const shopItems: ShopItem[] = [
  { id: 'hp_potion', name: '生命药剂', icon: '❤️‍🩹', description: '恢复500生命', price: { currency: 'gold', amount: 100 }, type: 'consumable' },
  { id: 'energy_potion', name: '能量药剂', icon: '⚡', description: '恢复100能量', price: { currency: 'gold', amount: 80 }, type: 'consumable' },
  { id: 'repair_kit', name: '修理包', icon: '🔧', description: '恢复全部生命和能量', price: { currency: 'gold', amount: 300 }, type: 'consumable' },
  { id: 'weapon_sword2', name: '高频刀刃', icon: '⚔️', description: '攻击+25 稀有武器', price: { currency: 'gems', amount: 30 }, type: 'item',
    itemData: { name: '高频刀刃', type: 'weapon', rarity: 'rare', icon: '⚔️', stats: { attack: 25 } } },
  { id: 'weapon_hammer', name: '冲击战锤', icon: '🔨', description: '攻击+40 史诗武器', price: { currency: 'gems', amount: 60 }, type: 'item',
    itemData: { name: '冲击战锤', type: 'weapon', rarity: 'epic', icon: '🔨', stats: { attack: 40 } } },
  { id: 'armor_heavy', name: '重型装甲', icon: '🦾', description: '防御+30 生命+200', price: { currency: 'gems', amount: 50 }, type: 'item',
    itemData: { name: '重型装甲', type: 'armor', rarity: 'epic', icon: '🦾', stats: { defense: 30, maxHp: 200 } } },
]

const gemPacks = [
  { id: 'gems_s', name: '少量钻石', icon: '💎', amount: 100, price: '¥6', desc: '入门首选' },
  { id: 'gems_m', name: '中等钻石', icon: '💎', amount: 560, price: '¥30', desc: '性价比高', popular: true },
  { id: 'gems_l', name: '大量钻石', icon: '💎', amount: 1200, price: '¥68', desc: '月卡玩家推荐' },
  { id: 'gems_xl', name: '巨量钻石', icon: '💎', amount: 3300, price: '¥168', desc: '重氪首选' },
]

export function ShopPanel({ onClose }: { onClose: () => void }) {
  const { gold, gems, addGold, addGems, addItem } = useRPGStore()
  const [tab, setTab] = useState<'items' | 'gems'>('items')
  const [purchased, setPurchased] = useState<string | null>(null)

  const buyItem = (item: ShopItem) => {
    if (item.price.currency === 'gold' && gold < item.price.amount) return
    if (item.price.currency === 'gems' && gems < item.price.amount) return
    if (item.price.currency === 'gold') addGold(-item.price.amount)
    else addGems(-item.price.amount)
    if (item.itemData) {
      addItem({ ...item.itemData, id: item.id + '_' + Date.now(), count: 1, description: item.description } as ItemData)
    } else {
      // Consumable: just show feedback
      addItem({ id: item.id + '_' + Date.now(), name: item.name, type: 'consumable', rarity: 'common', icon: item.icon, count: 1, description: item.description } as ItemData)
    }
    setPurchased(item.name)
    setTimeout(() => setPurchased(null), 1500)
  }

  const buyGems = (pack: typeof gemPacks[0]) => {
    addGems(pack.amount)
    setPurchased(pack.name + ' +' + pack.amount + '💎')
    setTimeout(() => setPurchased(null), 2000)
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.9)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '92%', maxWidth: 580, maxHeight: '85vh',
        background: 'linear-gradient(135deg, rgba(20,30,50,0.98), rgba(10,15,30,0.98))',
        borderRadius: 16, border: '1px solid rgba(0,255,200,0.3)',
        boxShadow: '0 0 40px rgba(0,255,200,0.15)',
        display: 'flex', flexDirection: 'column', position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,255,200,0.15)',
        }}>
          <span style={{ color: '#00ffcc', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>
            🛒 商店
          </span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ color: '#ffcc44', fontSize: 13 }}>💰 {gold}</span>
            <span style={{ color: '#44ddff', fontSize: 13 }}>💎 {gems}</span>
            <span onClick={onClose} style={{ color: '#ff6666', cursor: 'pointer', fontSize: 20 }}>✕</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: 12 }}>
          <div onClick={() => setTab('items')} style={tabBtn(tab === 'items', '#00ffcc')}>道具装备</div>
          <div onClick={() => setTab('gems')} style={tabBtn(tab === 'gems', '#44ddff')}>充值钻石</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
          {tab === 'items' && shopItems.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8,
              background: 'rgba(255,255,255,0.03)', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ fontSize: 32, width: 44, textAlign: 'center' }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: '#ddeeff', fontWeight: 'bold' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: '#8899aa' }}>{item.description}</div>
              </div>
              <button
                onClick={() => buyItem(item)}
                style={{
                  padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                  background: item.price.currency === 'gold' ? 'rgba(255,200,0,0.15)' : 'rgba(68,221,255,0.15)',
                  border: `1px solid ${item.price.currency === 'gold' ? '#ffcc44' : '#44ddff'}`,
                  color: item.price.currency === 'gold' ? '#ffcc44' : '#44ddff',
                  fontSize: 12, fontWeight: 'bold',
                }}
              >
                {item.price.currency === 'gold' ? '💰' : '💎'} {item.price.amount}
              </button>
            </div>
          ))}

          {tab === 'gems' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {gemPacks.map(pack => (
                <div key={pack.id} style={{
                  padding: 16, borderRadius: 12, textAlign: 'center',
                  background: pack.popular
                    ? 'linear-gradient(135deg, rgba(68,221,255,0.15), rgba(0,100,200,0.08))'
                    : 'rgba(255,255,255,0.03)',
                  border: pack.popular ? '2px solid #44ddff' : '1px solid rgba(255,255,255,0.08)',
                  position: 'relative',
                }}>
                  {pack.popular && (
                    <div style={{
                      position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                      background: '#44ddff', color: '#000', padding: '2px 8px',
                      borderRadius: 4, fontSize: 9, fontWeight: 'bold',
                    }}>推荐</div>
                  )}
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{pack.icon}</div>
                  <div style={{ color: '#44ddff', fontSize: 20, fontWeight: 'bold' }}>{pack.amount}</div>
                  <div style={{ color: '#8899aa', fontSize: 11, marginBottom: 8 }}>{pack.desc}</div>
                  <button
                    onClick={() => buyGems(pack)}
                    style={{
                      width: '100%', padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                      background: 'linear-gradient(90deg, #ff8844, #ffcc44)',
                      border: 'none', color: '#000', fontSize: 14, fontWeight: 'bold',
                    }}
                  >
                    {pack.price}
                  </button>
                </div>
              ))}
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#555', fontSize: 11, padding: 8 }}>
                * 演示版本 — 实际支付需接入微信/支付宝 SDK
              </div>
            </div>
          )}
        </div>

        {/* Purchase notification */}
        {purchased && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,255,136,0.9)', color: '#000', padding: '8px 20px',
            borderRadius: 8, fontSize: 13, fontWeight: 'bold',
            animation: 'slideUp 0.3s ease-out',
          }}>
            ✓ 购买成功：{purchased}
          </div>
        )}
      </div>
    </div>
  )
}

function tabBtn(active: boolean, color: string): React.CSSProperties {
  return {
    flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 8, cursor: 'pointer',
    background: active ? color + '22' : 'transparent',
    border: `1px solid ${active ? color : 'transparent'}`,
    color: active ? color : '#667788', fontSize: 13, fontWeight: 'bold',
  }
}
