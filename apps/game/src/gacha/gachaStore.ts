import { create } from 'zustand'
import { useRPGStore, type MechaConfig, type ItemData } from '../rpg/rpgStore'

export interface GachaPool {
  id: string
  name: string
  cost: { currency: 'gems' | 'gold'; amount: number }
  banner: string
  rates: { legendary: number; epic: number; rare: number; common: number }
  items: {
    mechas: string[]   // mecha IDs
    weapons: { name: string; rarity: string; attack: number; icon: string }[]
    materials: { name: string; rarity: string; icon: string }[]
  }
  pityCounter: number
  guaranteedAt: number  // guaranteed legendary after this many pulls
}

export interface PullResult {
  type: 'mecha' | 'weapon' | 'material'
  name: string
  rarity: string
  icon: string
  isNew: boolean
  mechaData?: MechaConfig
  itemData?: ItemData
}

interface GachaState {
  pools: GachaPool[]
  lastPulls: PullResult[] | null
  totalPulls: number
  showAnimation: boolean

  pull: (poolId: string, count: number) => PullResult[]
  clearLastPulls: () => void
}

const pools: GachaPool[] = [
  {
    id: 'standard',
    name: '标准祈愿',
    cost: { currency: 'gems', amount: 50 },
    banner: '🎯 所有机甲与装备均可能获得',
    rates: { legendary: 1, epic: 9, rare: 30, common: 60 },
    items: {
      mechas: ['crusher', 'phantom', 'titan'],
      weapons: [
        { name: '等离子剑', rarity: 'epic', attack: 45, icon: '⚔️' },
        { name: '电磁炮', rarity: 'rare', attack: 30, icon: '🔫' },
        { name: '合金战斧', rarity: 'rare', attack: 25, icon: '🪓' },
        { name: '标准刀刃', rarity: 'common', attack: 10, icon: '🔪' },
      ],
      materials: [
        { name: '稀有合金', rarity: 'epic', icon: '🧱' },
        { name: '能量结晶', rarity: 'rare', icon: '🔮' },
        { name: '金属碎片', rarity: 'common', icon: '🔩' },
      ],
    },
    pityCounter: 0,
    guaranteedAt: 90,
  },
  {
    id: 'legendary',
    name: '传说祈愿',
    cost: { currency: 'gems', amount: 100 },
    banner: '⭐ 泰坦之神 出率UP！传说率3%',
    rates: { legendary: 3, epic: 15, rare: 35, common: 47 },
    items: {
      mechas: ['titan', 'phantom', 'crusher'],
      weapons: [
        { name: '神之审判', rarity: 'legendary', attack: 80, icon: '⚡' },
        { name: '毁灭者', rarity: 'epic', attack: 50, icon: '💢' },
        { name: '量子炮', rarity: 'rare', attack: 35, icon: '🌟' },
      ],
      materials: [
        { name: '传说核心', rarity: 'legendary', icon: '💎' },
        { name: '暗物质', rarity: 'epic', icon: '🌌' },
      ],
    },
    pityCounter: 0,
    guaranteedAt: 60,
  },
]

const mechaDB: Record<string, MechaConfig> = {
  crusher: { id: 'crusher', name: '碎岩者', rarity: 'rare', baseHp: 1500, baseAttack: 80, baseDefense: 40, baseSpeed: 6, color: '#ff8844', accentColor: '#ffaa00', skill: '地裂冲击', owned: false, equipped: false },
  phantom: { id: 'phantom', name: '幻影 X-7', rarity: 'epic', baseHp: 1200, baseAttack: 100, baseDefense: 30, baseSpeed: 12, color: '#aa44ff', accentColor: '#ff44ff', skill: '分身突袭', owned: false, equipped: false },
  titan: { id: 'titan', name: '泰坦之神', rarity: 'legendary', baseHp: 2500, baseAttack: 150, baseDefense: 80, baseSpeed: 5, color: '#ffdd00', accentColor: '#ffffff', skill: '天罚', owned: false, equipped: false },
}

function rollRarity(rates: GachaPool['rates']): string {
  const r = Math.random() * 100
  if (r < rates.legendary) return 'legendary'
  if (r < rates.legendary + rates.epic) return 'epic'
  if (r < rates.legendary + rates.epic + rates.rare) return 'rare'
  return 'common'
}

export const useGachaStore = create<GachaState>((set, get) => ({
  pools,
  lastPulls: null,
  totalPulls: 0,
  showAnimation: false,

  pull: (poolId, count) => {
    const pool = get().pools.find(p => p.id === poolId)
    if (!pool) return []
    const rpg = useRPGStore.getState()
    const totalCost = pool.cost.amount * count
    if (pool.cost.currency === 'gems' && rpg.gems < totalCost) return []
    if (pool.cost.currency === 'gold' && rpg.gold < totalCost) return []

    // Deduct currency
    if (pool.cost.currency === 'gems') rpg.addGems(-totalCost)
    else rpg.addGold(-totalCost)

    const results: PullResult[] = []
    let newPity = pool.pityCounter

    for (let i = 0; i < count; i++) {
      newPity++
      // Pity: guaranteed legendary at guaranteedAt
      let rarity = newPity >= pool.guaranteedAt ? 'legendary' : rollRarity(pool.rates)
      if (rarity === 'legendary') newPity = 0

      // Decide type: mecha, weapon, or material
      const typeRoll = Math.random()
      let result: PullResult

      if (typeRoll < 0.3) {
        // Mecha
        const availableMechas = pool.items.mechas
        const mechaId = availableMechas[Math.floor(Math.random() * availableMechas.length)]
        const mecha = mechaDB[mechaId]
        if (!mecha) continue
        const alreadyOwned = rpg.mechas.find(m => m.id === mechaId)?.owned
        if (!alreadyOwned) rpg.unlockMecha(mechaId)
        result = {
          type: 'mecha', name: mecha.name, rarity: mecha.rarity, icon: '🤖',
          isNew: !alreadyOwned, mechaData: mecha,
        }
      } else if (typeRoll < 0.65) {
        // Weapon
        const weapons = pool.items.weapons.filter(w => w.rarity === rarity || (rarity === 'common' && w.rarity === 'common'))
        const weapon = weapons.length > 0 ? weapons[Math.floor(Math.random() * weapons.length)] : pool.items.weapons[0]
        const itemId = 'w_gacha_' + Date.now() + '_' + i
        const item: ItemData = {
          id: itemId, name: weapon.name, type: 'weapon', rarity: weapon.rarity as any,
          icon: weapon.icon, stats: { attack: weapon.attack }, count: 1,
          description: `通过祈愿获得的${weapon.name}。`,
        }
        rpg.addItem(item)
        result = {
          type: 'weapon', name: weapon.name, rarity: weapon.rarity, icon: weapon.icon,
          isNew: true, itemData: item,
        }
      } else {
        // Material
        const materials = pool.items.materials.filter(m => m.rarity === rarity || (rarity === 'common' && !materials2(pool, rarity).length))
        const mat = materials.length > 0 ? materials[0] : pool.items.materials[0]
        const itemId = 'm_gacha_' + Date.now() + '_' + i
        const item: ItemData = {
          id: itemId, name: mat.name, type: 'material', rarity: mat.rarity as any,
          icon: mat.icon, count: 1, description: `祈愿获得的材料。`,
        }
        rpg.addItem(item)
        result = {
          type: 'material', name: mat.name, rarity: mat.rarity, icon: mat.icon,
          isNew: true, itemData: item,
        }
      }
      results.push(result)
    }

    // Update pity counter
    set((s) => ({
      pools: s.pools.map(p => p.id === poolId ? { ...p, pityCounter: newPity } : p),
      lastPulls: results,
      totalPulls: s.totalPulls + count,
      showAnimation: true,
    }))

    return results
  },

  clearLastPulls: () => set({ lastPulls: null, showAnimation: false }),
}))

function materials2(pool: GachaPool, rarity: string) {
  return pool.items.materials.filter(m => m.rarity === rarity)
}
