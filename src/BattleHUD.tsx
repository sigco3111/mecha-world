import { useEffect, useState, useRef } from 'react'
import { useGameStore } from './stores/gameStore'

// 屏幕坐标投影
function useScreenProject() {
  const camera = useRef<any>(null)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    let raf: number
    const tick = () => { forceUpdate(n => n + 1); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return null
}

// === 血条/护盾/能量 ===
function StatusBar({ label, value, max, color, bgColor, icon }: {
  label: string; value: number; max: number; color: string; bgColor: string; icon: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
      <div style={{
        position: 'relative', width: 200, height: 14,
        background: bgColor, borderRadius: 7, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.2)',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          transition: 'width 0.2s',
          boxShadow: `0 0 8px ${color}66`,
        }} />
      </div>
      <span style={{ fontSize: 11, color: color, fontFamily: 'monospace', minWidth: 60 }}>
        {Math.ceil(value)}/{max}
      </span>
    </div>
  )
}

// === 连击计数器 ===
function ComboCounter({ combo, timer }: { combo: number; timer: number }) {
  if (combo < 2) return null
  const scale = 1 + Math.min(timer, 0.3)
  return (
    <div style={{
      position: 'absolute', top: '20%', left: '50%',
      transform: `translate(-50%, -50%) scale(${scale})`,
      pointerEvents: 'none', textAlign: 'center',
    }}>
      <div style={{
        fontSize: 48, fontWeight: 900, color: '#ffdd00',
        textShadow: '0 0 20px rgba(255,200,0,0.8), 2px 2px 0 #000',
        fontFamily: 'Impact, sans-serif',
      }}>
        {combo}
      </div>
      <div style={{
        fontSize: 14, color: '#ff8800', fontWeight: 'bold',
        textShadow: '1px 1px 0 #000', letterSpacing: 3,
      }}>
        COMBO
      </div>
    </div>
  )
}

// === 技能图标 ===
function SkillIcon({ name, hotkey, ready, cd }: {
  name: string; hotkey: string; ready: boolean; cd?: number
}) {
  return (
    <div style={{
      position: 'relative', width: 54, height: 54, borderRadius: 12,
      background: ready ? 'radial-gradient(circle, rgba(0,255,255,0.3), rgba(0,100,200,0.2))' : 'rgba(40,40,60,0.6)',
      border: `2px solid ${ready ? '#00ffff' : '#444466'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      boxShadow: ready ? '0 0 12px rgba(0,255,255,0.4)' : 'none',
    }}>
      <span style={{ fontSize: 22 }}>{name}</span>
      <span style={{ fontSize: 8, color: '#88aaff', marginTop: 2 }}>{hotkey}</span>
    </div>
  )
}

// === 弹药计数 ===
function AmmoCounter({ ammo, max }: { ammo: number; max: number }) {
  const pct = ammo / max
  return (
    <div style={{
      position: 'absolute', bottom: 75, right: 20,
      color: '#00ffff', fontFamily: 'monospace', textAlign: 'right',
    }}>
      <div style={{ fontSize: 28, fontWeight: 'bold', textShadow: '0 0 8px rgba(0,255,255,0.6)' }}>
        {ammo}
      </div>
      <div style={{ fontSize: 10, color: '#446688' }}>/ {max} 弹药</div>
    </div>
  )
}

// === 玩家受击红闪 ===
function HitFlash({ intensity }: { intensity: number }) {
  if (intensity <= 0) return null
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 200,
      boxShadow: `inset 0 0 ${100 * intensity}px rgba(255,0,0,${0.6 * intensity})`,
    }} />
  )
}

// === 伤害数字飘字 ===
function DamageNumberLayer() {
  const damageNumbers = useGameStore(s => s.damageNumbers)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let raf: number
    const loop = () => { setTick(t => t + 1); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // 获取相机 — 通过canvas元素
  const canvas = document.querySelector('canvas')
  // @ts-ignore
  const camera = canvas?.__r3f?.root?.getState?.()?.camera
  if (!camera) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 150 }}>
      {damageNumbers.map(d => {
        const age = (Date.now() - d.born) / 1000
        if (age > 1.2) return null
        // 用简化投影
        const pos = { x: d.position[0], y: d.position[1], z: d.position[2] }
        const projected = project3D(pos, camera)
        if (!projected) return null

        const opacity = Math.max(0, 1 - age / 1.2)
        const yOffset = age * 60
        const scale = d.crit ? 1.5 : 1

        return (
          <div key={d.id} style={{
            position: 'absolute',
            left: projected.x, top: projected.y - yOffset,
            transform: `translate(-50%, -50%) scale(${scale + age * 0.3})`,
            opacity,
            fontSize: d.crit ? 32 : 24,
            fontWeight: 900,
            color: d.crit ? '#ff4444' : '#ffdd00',
            textShadow: '2px 2px 0 #000, 0 0 10px rgba(255,200,0,0.8)',
            fontFamily: 'Impact, sans-serif',
          }}>
            {d.crit && '※'}{d.value}
          </div>
        )
      })}
    </div>
  )
}

// 3D转2D投影
function project3D(pos: { x: number; y: number; z: number }, camera: any): { x: number; y: number } | null {
  if (!camera) return null
  try {
    const v = new (window as any).THREE.Vector3(pos.x, pos.y, pos.z)
    v.project(camera)
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
    }
  } catch {
    return null
  }
}

// === 主HUD ===
export function BattleHUD() {
  const player = useGameStore(s => s.player)
  const weapon = useGameStore(s => s.weapon)
  const hitFlash = useGameStore(s => s.playerHitFlash)

  return (
    <>
      <HitFlash intensity={hitFlash} />

      {/* 左下角 — 状态条 */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20, zIndex: 100,
        pointerEvents: 'none',
      }}>
        <StatusBar label="HP" value={player.hp} max={player.maxHp} color="#ff4444" bgColor="#330011" icon="♥" />
        <StatusBar label="SHIELD" value={player.shield} max={player.maxShield} color="#44aaff" bgColor="#001133" icon="🛡" />
        <StatusBar label="ENERGY" value={player.energy} max={player.maxEnergy} color="#ffdd00" bgColor="#332200" icon="⚡" />
      </div>

      {/* 右下角 — 技能按钮 */}
      <div style={{
        position: 'absolute', bottom: 20, right: 20, zIndex: 100,
        display: 'flex', gap: 12, alignItems: 'flex-end',
      }}>
        <SkillIcon name="👊" hotkey="J / 左键" ready={true} />
        <SkillIcon name="🔫" hotkey="K / 右键" ready={weapon.rangedAmmo > 0} cd={0.12} />
        <SkillIcon name="💨" hotkey="SPACE" ready={player.energy > 10} />
        <SkillIcon name="🌟" hotkey="R" ready={player.energy >= 100} />
      </div>

      <AmmoCounter ammo={weapon.rangedAmmo} max={weapon.maxAmmo} />
      <ComboCounter combo={player.combo} timer={player.comboTimer} />
      <DamageNumberLayer />
    </>
  )
}
