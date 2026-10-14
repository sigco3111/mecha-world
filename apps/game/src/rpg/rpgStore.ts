import { create } from 'zustand'

export interface ItemData {
  id: string
  name: string
  type: 'weapon' | 'armor' | 'core' | 'module' | 'material' | 'consumable'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  icon: string
  stats?: {
    attack?: number
    defense?: number
    maxHp?: number
    maxEnergy?: number
    critRate?: number
    critDmg?: number
  }
  count: number
  equipped?: boolean
  description: string
}

export interface QuestData {
  id: string
  title: string
  description: string
  type: 'kill' | 'collect' | 'explore' | 'talk'
  target: string
  required: number
  current: number
  reward: { gold: number; exp: number; items?: string[] }
  status: 'available' | 'active' | 'completed' | 'claimed'
}

export interface MechaConfig {
  id: string
  name: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  baseHp: number
  baseAttack: number
  baseDefense: number
  baseSpeed: number
  color: string
  accentColor: string
  skill: string
  owned: boolean
  equipped: boolean
}

interface RPGState {
  level: number
  exp: number
  expToNext: number
  gold: number
  gems: number
  inventory: ItemData[]
  quests: QuestData[]
  mechas: MechaConfig[]
  equippedWeapon: string | null
  equippedArmor: string | null
  equippedCore: string | null

  addExp: (amount: number) => void
  addGold: (amount: number) => void
  addGems: (amount: number) => void
  addItem: (item: ItemData) => void
  removeItem: (id: string) => void
  equipItem: (id: string) => void
  unequipItem: (slot: 'weapon' | 'armor' | 'core') => void
  updateQuest: (id: string, amount: number) => void
  claimQuest: (id: string) => void
  getStats: () => { attack: number; defense: number; maxHp: number; maxEnergy: number }
  unlockMecha: (id: string) => void
  equipMecha: (id: string) => void
  useConsumable: (id: string) => void
}

const expForLevel = (lv: number) => Math.floor(100 * Math.pow(1.15, lv - 1))

const initialMechas: MechaConfig[] = [
  { id: 'starter', name: '레인저 MK-I', rarity: 'common', baseHp: 1000, baseAttack: 50, baseDefense: 20, baseSpeed: 8, color: '#4488ff', accentColor: '#00ffff', skill: '돌진 베기', owned: true, equipped: true },
  { id: 'crusher', name: '록 브레이커', rarity: 'rare', baseHp: 1500, baseAttack: 80, baseDefense: 40, baseSpeed: 6, color: '#ff8844', accentColor: '#ffaa00', skill: '지진 충격', owned: false, equipped: false },
  { id: 'phantom', name: '팬텀 X-7', rarity: 'epic', baseHp: 1200, baseAttack: 100, baseDefense: 30, baseSpeed: 12, color: '#aa44ff', accentColor: '#ff44ff', skill: '분신 기습', owned: false, equipped: false },
  { id: 'titan', name: '타이탄', rarity: 'legendary', baseHp: 2500, baseAttack: 150, baseDefense: 80, baseSpeed: 5, color: '#ffdd00', accentColor: '#ffffff', skill: '천벌', owned: false, equipped: false },
]

const initialItems: ItemData[] = [
  { id: 'w_sword1', name: '합금 검', type: 'weapon', rarity: 'common', icon: '⚔️', stats: { attack: 15 }, count: 1, equipped: true, description: '튼튼하고 믿을 수 있는 기본 합금 무기.' },
  { id: 'w_gun1', name: '빔 소총', type: 'weapon', rarity: 'common', icon: '🔫', stats: { attack: 12, critRate: 0.1 }, count: 1, equipped: false, description: '빠르게 발사하지만 피해가 낮은 원거리 빔 무기.' },
  { id: 'w_blade2', name: '플라즈마 대검', type: 'weapon', rarity: 'rare', icon: '🗡️', stats: { attack: 35, critDmg: 0.5 }, count: 1, equipped: false, description: '치명타 피해가 큰 플라즈마 절단 칼날.' },
  { id: 'a_plate1', name: '복합 장갑', type: 'armor', rarity: 'common', icon: '🛡️', stats: { defense: 10, maxHp: 100 }, count: 1, equipped: true, description: '기본 방어 장갑.' },
  { id: 'a_shield2', name: '역장 방패', type: 'armor', rarity: 'rare', icon: '🛡️', stats: { defense: 25, maxHp: 250 }, count: 1, equipped: false, description: '생존력을 크게 높이는 에너지 역장 방패.' },
  { id: 'c_core1', name: '에너지 코어 I', type: 'core', rarity: 'common', icon: '🔋', stats: { maxEnergy: 50 }, count: 1, equipped: true, description: '기본 에너지 코어.' },
  { id: 'c_core2', name: '핵융합 코어 II', type: 'core', rarity: 'rare', icon: '🔋', stats: { maxEnergy: 100, attack: 10 }, count: 1, equipped: false, description: '에너지와 공격력을 높이는 핵융합 코어.' },
  // Consumables
  { id: 'potion_hp', name: '체력 물약', type: 'consumable', rarity: 'common', icon: '🧪', stats: { maxHp: 0 }, count: 5, description: '체력 300 회복.', effect: { type: 'heal', value: 300 } } as any,
  { id: 'potion_energy', name: '에너지 물약', type: 'consumable', rarity: 'common', icon: '⚡', stats: { maxHp: 0 }, count: 5, description: '에너지 50 회복.', effect: { type: 'energy', value: 50 } } as any,
  { id: 'potion_shield', name: '방패 물약', type: 'consumable', rarity: 'rare', icon: '💊', stats: { maxHp: 0 }, count: 3, description: '방패 전체 회복.', effect: { type: 'shield', value: 999 } } as any,
]

const initialQuests: QuestData[] = [
  {
    id: 'q_kill5', title: '첫 시련', description: '적 메카 5대 처치',
    type: 'kill', target: 'enemy', required: 5, current: 0,
    reward: { gold: 200, exp: 150 },
    status: 'active',
  },
  {
    id: 'q_crystal', title: '수정 협곡', description: '수정 협곡에서 에너지 수정 3개 수집',
    type: 'collect', target: 'crystal', required: 3, current: 0,
    reward: { gold: 500, exp: 300, items: ['c_core2'] },
    status: 'available',
  },
  {
    id: 'q_boss', title: '최후의 전투', description: '보스 메카 처치',
    type: 'kill', target: 'boss', required: 1, current: 0,
    reward: { gold: 1000, exp: 500 },
    status: 'available',
  },
]

export const useRPGStore = create<RPGState>((set, get) => ({
  level: 1,
  exp: 0,
  expToNext: expForLevel(1),
  gold: 500,
  gems: 50,
  inventory: initialItems,
  quests: initialQuests,
  mechas: initialMechas,
  equippedWeapon: 'w_sword1',
  equippedArmor: 'a_plate1',
  equippedCore: 'c_core1',

  addExp: (amount) => {
    set((s) => {
      let exp = s.exp + amount
      let level = s.level
      let expToNext = s.expToNext
      while (exp >= expToNext) {
        exp -= expToNext
        level++
        expToNext = expForLevel(level)
      }
      return { exp, level, expToNext }
    })
  },

  addGold: (amount) => set((s) => ({ gold: Math.max(0, s.gold + amount) })),
  addGems: (amount) => set((s) => ({ gems: Math.max(0, s.gems + amount) })),

  addItem: (item) => set((s) => {
    const existing = s.inventory.find(i => i.id === item.id)
    if (existing) {
      return {
        inventory: s.inventory.map(i =>
          i.id === item.id ? { ...i, count: i.count + item.count } : i
        ),
      }
    }
    return { inventory: [...s.inventory, item] }
  }),

  removeItem: (id) => set((s) => ({
    inventory: s.inventory.filter(i => i.id !== id),
  })),

  equipItem: (id) => set((s) => {
    const item = s.inventory.find(i => i.id === id)
    if (!item || !item.stats) return {}
    const slot = item.type === 'weapon' ? 'equippedWeapon'
               : item.type === 'armor' ? 'equippedArmor'
               : item.type === 'core' ? 'equippedCore' : null
    if (!slot) return {}
    return {
      [slot]: id,
      inventory: s.inventory.map(i => ({
        ...i,
        equipped: i.id === id || (i.type === item.type ? false : i.equipped),
      })),
    } as Partial<RPGState>
  }),

  unequipItem: (slot) => set((s) => {
    const slotKey = slot === 'weapon' ? 'equippedWeapon' : slot === 'armor' ? 'equippedArmor' : 'equippedCore'
    return {
      [slotKey]: null,
      inventory: s.inventory.map(i => {
        if (i.id === s[slotKey]) return { ...i, equipped: false }
        return i
      }),
    } as Partial<RPGState>
  }),

  updateQuest: (id, amount) => set((s) => ({
    quests: s.quests.map(q => {
      if (q.id !== id) return q
      const current = Math.min(q.required, q.current + amount)
      return { ...q, current, status: current >= q.required ? 'completed' : 'active' }
    }),
  })),

  claimQuest: (id) => set((s) => {
    const q = s.quests.find(x => x.id === id)
    if (!q || q.status !== 'completed') return {}
    // Apply rewards
    let exp = s.exp + q.reward.exp
    let level = s.level
    let expToNext = s.expToNext
    while (exp >= expToNext) { exp -= expToNext; level++; expToNext = expForLevel(level) }
    return {
      level, exp, expToNext,
      gold: s.gold + q.reward.gold,
      quests: s.quests.map(x => x.id === id ? { ...x, status: 'claimed' } : x),
    }
  }),

  getStats: () => {
    const s = get()
    const equippedMecha = s.mechas.find(m => m.equipped)
    let attack = equippedMecha?.baseAttack ?? 50
    let defense = equippedMecha?.baseDefense ?? 20
    let maxHp = equippedMecha?.baseHp ?? 1000
    let maxEnergy = 200
    for (const item of s.inventory) {
      if (item.equipped && item.stats) {
        attack += item.stats.attack ?? 0
        defense += item.stats.defense ?? 0
        maxHp += item.stats.maxHp ?? 0
        maxEnergy += item.stats.maxEnergy ?? 0
      }
    }
    // Level bonus
    const lvBonus = 1 + (s.level - 1) * 0.1
    attack = Math.floor(attack * lvBonus)
    maxHp = Math.floor(maxHp * lvBonus)
    return { attack, defense, maxHp, maxEnergy }
  },

  unlockMecha: (id) => set((s) => ({
    mechas: s.mechas.map(m => m.id === id ? { ...m, owned: true } : m),
  })),

  equipMecha: (id) => set((s) => ({
    mechas: s.mechas.map(m => ({ ...m, equipped: m.id === id })),
  })),

  useConsumable: (id) => {
    const s = get()
    const item = s.inventory.find(i => i.id === id)
    if (!item || item.type !== 'consumable' || item.count <= 0) return
    const effect = (item as any).effect
    if (!effect) return

    // Apply effect to gameStore
    const gameStore = (window as any).__gameStore
    if (gameStore) {
      if (effect.type === 'heal') {
        gameStore.getState().healPlayer(effect.value)
      } else if (effect.type === 'energy') {
        gameStore.getState().addEnergy(effect.value)
      } else if (effect.type === 'shield') {
        gameStore.getState().addShield(effect.value)
      }
    }

    // Consume the item
    if (item.count <= 1) {
      set({ inventory: s.inventory.filter(i => i.id !== id) })
    } else {
      set({ inventory: s.inventory.map(i => i.id === id ? { ...i, count: i.count - 1 } : i) })
    }
  },
}))

// Loot table for enemy drops
export function rollLoot(enemyType: string): { gold: number; exp: number; item?: ItemData } {
  const baseGold = enemyType === 'boss' ? 500 : 30 + Math.floor(Math.random() * 20)
  const baseExp = enemyType === 'boss' ? 300 : 20 + Math.floor(Math.random() * 15)
  const item = enemyType === 'boss' ? {
    id: 'legendary_core_' + Date.now(),
    name: '전설 코어 조각',
    type: 'core' as const,
    rarity: 'legendary' as const,
    icon: '💎',
    stats: { attack: 30, defense: 20, maxHp: 300 },
    count: 1,
    description: '거대한 에너지를 품은 전설 코어 조각.',
  } : Math.random() < 0.15 ? {
    id: 'mat_scrap_' + Date.now(),
    name: '메카 조각',
    type: 'material' as const,
    rarity: 'common' as const,
    icon: '🔩',
    count: 1,
    description: '적 메카가 떨어뜨린 업그레이드용 금속 조각.',
  } : undefined
  return { gold: baseGold, exp: baseExp, item }
}
