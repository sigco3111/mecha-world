import { create } from 'zustand'

export type EnemyType = 'grunt' | 'soldier' | 'elite' | 'boss'

export type EnemyState = 'idle' | 'patrol' | 'alert' | 'chase' | 'attack_windup' | 'attack_active' | 'attack_recover' | 'stagger' | 'dead'

export type EnemyEntity = {
  id: string
  type: EnemyType
  position: [number, number, number]
  rotation: number
  hp: number
  maxHp: number
  state: EnemyState
  stateTimer: number
  attackCooldown: number
  velocity: [number, number, number]
  spawnPos: [number, number, number]
  // stats
  moveSpeed: number
  detectRange: number
  attackRange: number
  damage: number
  ranged: boolean
  scale: number
}

interface EnemyStore {
  enemies: EnemyEntity[]
  bossActive: boolean
  bossHp: number
  bossMaxHp: number
  bossPhase: number
  killCount: number
  waveNumber: number

  spawnEnemy: (type: EnemyType, pos: [number, number, number]) => string
  removeEnemy: (id: string) => void
  damageEnemy: (id: string, amount: number) => void
  getAliveEnemies: () => EnemyEntity[]
  setBossActive: (active: boolean, hp?: number) => void
  damageBoss: (amount: number) => void
  addKill: () => void
  nextWave: () => void
  clearAll: () => void
}

function makeEnemy(type: EnemyType, pos: [number, number, number]): EnemyEntity {
  const id = `${type}-${Date.now()}-${Math.random().toFixed(4)}`
  const configs = {
    grunt:   { hp: 200, speed: 6,  detect: 18, range: 3.5, dmg: 15, ranged: false, scale: 0.9 },
    soldier: { hp: 350, speed: 5,  detect: 22, range: 18,  dmg: 25, ranged: true,  scale: 1.0 },
    elite:   { hp: 600, speed: 7,  detect: 25, range: 4.0, dmg: 40, ranged: false, scale: 1.2 },
    boss:    { hp: 5000, speed: 4, detect: 99, range: 6.0, dmg: 60, ranged: true,  scale: 2.5 },
  }
  const c = configs[type]
  return {
    id, type, position: [...pos], rotation: 0,
    hp: c.hp, maxHp: c.hp,
    state: 'idle', stateTimer: 1 + Math.random() * 2,
    attackCooldown: 0, velocity: [0, 0, 0],
    spawnPos: [...pos],
    moveSpeed: c.speed, detectRange: c.detect,
    attackRange: c.range, damage: c.dmg, ranged: c.ranged,
    scale: c.scale,
  }
}

export const useEnemyStore = create<EnemyStore>((set, get) => ({
  enemies: [],
  bossActive: false, bossHp: 0, bossMaxHp: 5000, bossPhase: 1,
  killCount: 0, waveNumber: 1,

  spawnEnemy: (type, pos) => {
    const enemy = makeEnemy(type, pos)
    set((s) => ({ enemies: [...s.enemies, enemy].slice(-30) }))
    return enemy.id
  },

  removeEnemy: (id) => set((s) => ({
    enemies: s.enemies.filter(e => e.id !== id)
  })),

  damageEnemy: (id, amount) => set((s) => ({
    enemies: s.enemies.map(e =>
      e.id === id ? { ...e, hp: Math.max(0, e.hp - amount) } : e
    )
  })),

  getAliveEnemies: () => get().enemies.filter(e => e.hp > 0),

  setBossActive: (active, hp) => set({
    bossActive: active,
    bossHp: hp ?? 0,
    bossMaxHp: hp ?? 5000,
    bossPhase: 1,
  }),

  damageBoss: (amount) => set((s) => {
    const newHp = Math.max(0, s.bossHp - amount)
    const phase = newHp > s.bossMaxHp * 0.6 ? 1 : newHp > s.bossMaxHp * 0.3 ? 2 : 3
    return { bossHp: newHp, bossPhase: phase }
  }),

  addKill: () => set((s) => ({ killCount: s.killCount + 1 })),

  nextWave: () => set((s) => ({ waveNumber: s.waveNumber + 1 })),

  clearAll: () => set({ enemies: [] }),
}))
