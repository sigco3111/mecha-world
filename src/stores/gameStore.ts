import { create } from 'zustand'

export type PlayerStats = {
  hp: number
  maxHp: number
  energy: number
  maxEnergy: number
  shield: number
  maxShield: number
  attack: number
  defense: number
  score: number
  combo: number
  comboTimer: number
}

export type WeaponState = {
  type: 'melee' | 'ranged'
  meleeCooldown: number
  rangedCooldown: number
  rangedAmmo: number
  maxAmmo: number
}

export type DamageNumber = {
  id: string
  value: number
  position: [number, number, number]
  born: number
  crit: boolean
}

export type ProjectileData = {
  id: string
  position: [number, number, number]
  velocity: [number, number, number]
  damage: number
  ownerId: 'player' | 'enemy'
  lifetime: number
}

export type ImpactData = {
  id: string
  position: [number, number, number]
  type: 'melee' | 'energy' | 'explosion'
  born: number
}

interface GameStore {
  player: PlayerStats
  weapon: WeaponState
  targetId: string | null
  damageNumbers: DamageNumber[]
  projectiles: ProjectileData[]
  impacts: ImpactData[]
  playerHitFlash: number

  takeDamage: (amount: number) => void
  dealDamage: (targetId: string, amount: number, position: [number, number, number], crit?: boolean) => void
  useEnergy: (amount: number) => boolean
  regenEnergy: (dt: number) => void
  addCombo: () => void
  resetCombo: () => void
  tickCombo: (dt: number) => void
  fireRanged: () => boolean
  setTarget: (id: string | null) => void
  clearDamageNumber: (id: string) => void
  addProjectile: (p: ProjectileData) => void
  updateProjectiles: (dt: number) => void
  removeProjectile: (id: string) => void
  addImpact: (position: [number, number, number], type: 'melee' | 'energy' | 'explosion') => void
  clearImpact: (id: string) => void
  triggerHitFlash: () => void
  decayHitFlash: (dt: number) => void
  resetPlayer: () => void
}

const initialStats: PlayerStats = {
  hp: 1000, maxHp: 1000,
  energy: 100, maxEnergy: 100,
  shield: 200, maxShield: 200,
  attack: 50, defense: 10,
  score: 0, combo: 0, comboTimer: 0,
}

const initialWeapon: WeaponState = {
  type: 'melee',
  meleeCooldown: 0,
  rangedCooldown: 0,
  rangedAmmo: 30,
  maxAmmo: 30,
}

export const useGameStore = create<GameStore>((set, get) => ({
  player: { ...initialStats },
  world: {
    timeOfDay: 8, // start at 8AM
    weather: 'clear',
    paused: false,
  },
  weapon: { ...initialWeapon },
  targetId: null,
  damageNumbers: [],
  projectiles: [],
  impacts: [],
  playerHitFlash: 0,

  takeDamage: (amount) => set((s) => {
    const dmg = Math.max(1, amount - s.player.defense)
    let shieldAfter = Math.max(0, s.player.shield - dmg)
    const overflow = dmg - s.player.shield
    const hpDmg = shieldAfter === 0 ? Math.max(0, overflow) : 0
    return {
      player: {
        ...s.player,
        shield: shieldAfter,
        hp: Math.max(0, s.player.hp - hpDmg),
      },
      playerHitFlash: 1,
    }
  }),

  dealDamage: (targetId, amount, position, crit = false) => set((s) => ({
    damageNumbers: [
      ...s.damageNumbers,
      { id: `${Date.now()}-${Math.random()}`, value: amount, position, born: Date.now(), crit }
    ].slice(-30)
  })),

  useEnergy: (amount) => {
    const { player } = get()
    if (player.energy < amount) return false
    set((s) => ({ player: { ...s.player, energy: s.player.energy - amount } }))
    return true
  },

  regenEnergy: (dt) => set((s) => ({
    player: { ...s.player, energy: Math.min(s.player.maxEnergy, s.player.energy + 15 * dt) }
  })),

  addCombo: () => set((s) => ({
    player: { ...s.player, combo: s.player.combo + 1, comboTimer: 3 }
  })),

  resetCombo: () => set((s) => ({ player: { ...s.player, combo: 0 } })),

  tickCombo: (dt) => set((s) => {
    if (s.player.comboTimer <= 0 && s.player.combo > 0) return { player: { ...s.player, combo: 0 } }
    return { player: { ...s.player, comboTimer: Math.max(0, s.player.comboTimer - dt) } }
  }),

  fireRanged: () => {
    const { weapon } = get()
    if (weapon.rangedAmmo <= 0) return false
    set((s) => ({ weapon: { ...s.weapon, rangedAmmo: s.weapon.rangedAmmo - 1 } }))
    return true
  },

  setTarget: (id) => set({ targetId: id }),

  clearDamageNumber: (id) => set((s) => ({
    damageNumbers: s.damageNumbers.filter((d) => d.id !== id)
  })),

  addProjectile: (p) => set((s) => ({
    projectiles: [...s.projectiles, p].slice(-50)
  })),

  updateProjectiles: (dt) => set((s) => ({
    projectiles: s.projectiles.map(p => ({
      ...p,
      position: [p.position[0] + p.velocity[0] * dt, p.position[1] + p.velocity[1] * dt, p.position[2] + p.velocity[2] * dt],
      lifetime: p.lifetime - dt,
    })).filter(p => p.lifetime > 0)
  })),

  removeProjectile: (id) => set((s) => ({
    projectiles: s.projectiles.filter(p => p.id !== id)
  })),

  addImpact: (position, type) => set((s) => ({
    impacts: [...s.impacts, { id: `${Date.now()}-${Math.random()}`, position, type, born: Date.now() }].slice(-20)
  })),

  clearImpact: (id) => set((s) => ({
    impacts: s.impacts.filter(i => i.id !== id)
  })),

  triggerHitFlash: () => set({ playerHitFlash: 1 }),

  decayHitFlash: (dt) => set((s) => ({ playerHitFlash: Math.max(0, s.playerHitFlash - dt * 2) })),

  resetPlayer: () => set({ player: { ...initialStats }, weapon: { ...initialWeapon } }),
  setWeather: (w) => set((s) => ({ world: { ...s.world, weather: w } })),
  setTimeOfDay: (t) => set((s) => ({ world: { ...s.world, timeOfDay: t } })),
}))
