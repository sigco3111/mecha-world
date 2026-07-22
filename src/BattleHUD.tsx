import { useEffect, useState } from 'react'
import { useGameStore } from './stores/gameStore'
import { isTouchDevice } from './controls/TouchControls'
import { cameraMode } from './Player'

// === 血条/护盾/能量 ===
function StatusBar({ value, max, color, bgColor, icon }: {
  value: number; max: number; color: string; bgColor: string; icon: string
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
function SkillIcon({ name, hotkey, ready }: {
  name: string; hotkey: string; ready: boolean
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

// === 大招屏幕特效 ===
function UltFlash({ ultCastTime }: { ultCastTime: number }) {
  const [show, setShow] = useState(false)
  
  useEffect(() => {
    if (ultCastTime > 0) {
      setShow(true)
      const t = setTimeout(() => setShow(false), 1500)
      return () => clearTimeout(t)
    }
  }, [ultCastTime])
  
  if (!show) return null
  
  return (
    <>
      {/* 初始爆发 — 白色闪光 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 400,
        background: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, rgba(255,200,0,0.4) 30%, transparent 70%)',
        animation: 'ultFade 0.3s ease-out forwards',
      }} />
      {/* 金色光环扩散 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 399,
        background: 'radial-gradient(circle at center, transparent 20%, rgba(255,180,0,0.3) 40%, transparent 60%)',
        animation: 'ultRing 1s ease-out forwards',
      }} />
      {/* 大招文字 */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none', zIndex: 401,
        animation: 'ultText 1.5s ease-out forwards',
      }}>
        <div style={{
          fontSize: 64, fontWeight: 900, color: '#ffdd00',
          textShadow: '0 0 30px rgba(255,200,0,1), 4px 4px 0 #000',
          fontFamily: 'Impact, sans-serif', textAlign: 'center',
        }}>
          OVERDRIVE
        </div>
      </div>
      <style>{`
        @keyframes ultFade {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes ultRing {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes ultText {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(2) rotate(-5deg); }
          15% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
      `}</style>
      <Crosshair />
      <ViewModeIndicator />
    </>
  )
}



// === 伤害数字飘字 ===
function DamageNumberLayer() {
  const damageNumbers = useGameStore(s => s.damageNumbers)
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 33)
    return () => clearInterval(interval)
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

// === 准星 (FPS模式时显示) ===
function Crosshair() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    let raf: number
    const tick = () => { forceUpdate(n => n + 1); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!cameraMode.firstPerson) return null

  const size = 28
  const center = size / 2
  const gap = 5
  const len = 8
  const color = '#00ffff'

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: size, height: size, zIndex: 110, pointerEvents: 'none',
    }}>
      {/* Center dot */}
      <div style={{
        position: 'absolute', left: center - 1, top: center - 1,
        width: 2, height: 2, borderRadius: '50%',
        background: color, boxShadow: `0 0 4px ${color}`,
      }} />
      {/* Top line */}
      <div style={{ position: 'absolute', left: center, top: center - gap - len, width: 2, height: len, background: color, boxShadow: `0 0 3px ${color}` }} />
      {/* Bottom line */}
      <div style={{ position: 'absolute', left: center, top: center + gap, width: 2, height: len, background: color, boxShadow: `0 0 3px ${color}` }} />
      {/* Left line */}
      <div style={{ position: 'absolute', left: center - gap - len, top: center, width: len, height: 2, background: color, boxShadow: `0 0 3px ${color}` }} />
      {/* Right line */}
      <div style={{ position: 'absolute', left: center + gap, top: center, width: len, height: 2, background: color, boxShadow: `0 0 3px ${color}` }} />
      {/* Outer ring */}
      <div style={{
        position: 'absolute', inset: -8,
        border: `1px solid ${color}33`, borderRadius: '50%',
      }} />
    </div>
  )
}

// === 视角模式指示器 ===
function ViewModeIndicator() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    let raf: number
    const tick = () => { forceUpdate(n => n + 1); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{
      position: 'absolute', top: 60, right: 20, zIndex: 110,
      background: 'rgba(0,0,0,0.5)', borderRadius: 6,
      padding: '4px 10px', pointerEvents: 'none',
      border: `1px solid ${cameraMode.firstPerson ? '#ff44ff44' : '#44ff8844'}`,
    }}>
      <span style={{
        fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold',
        color: cameraMode.firstPerson ? '#ff44ff' : '#44ff88',
      }}>
        {cameraMode.firstPerson ? '🎯 FPS' : '👁️ TPS'}  [V切换]
      </span>
    </div>
  )
}

// === 主HUD ===
export function BattleHUD() {
  const player = useGameStore(s => s.player)
  const weapon = useGameStore(s => s.weapon)
  const hitFlash = useGameStore(s => s.playerHitFlash)
  const ultCastTime = useGameStore(s => s.ultCastTime)
  const [touch, setTouch] = useState(false)
  useEffect(() => { setTouch(isTouchDevice()) }, [])

  return (
    <>
      <HitFlash intensity={hitFlash} />
      <UltFlash ultCastTime={ultCastTime} />

      {/* 左下角 — 状态条 */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20, zIndex: 100,
        pointerEvents: 'none',
      }}>
        <StatusBar value={player.hp} max={player.maxHp} color="#ff4444" bgColor="#330011" icon="♥" />
        <StatusBar value={player.shield} max={player.maxShield} color="#44aaff" bgColor="#001133" icon="🛡" />
        <StatusBar value={player.energy} max={player.maxEnergy} color="#ffdd00" bgColor="#332200" icon="⚡" />
      </div>

      {/* 右下角 — 桌面技能图标（触摸设备不显示，用TouchControls替代） */}
      {!touch && (
        <div style={{
          position: 'absolute', bottom: 20, right: 20, zIndex: 100,
          display: 'flex', gap: 12, alignItems: 'flex-end',
        }}>
          <SkillIcon name="👊" hotkey="J / 左键" ready={true} />
          <SkillIcon name="🔫" hotkey="K / 右键" ready={weapon.rangedAmmo > 0} />
          <SkillIcon name="💨" hotkey="SPACE" ready={player.energy > 10} />
          <SkillIcon name="🌟" hotkey="R" ready={player.energy >= 100} />
        </div>
      )}

      <AmmoCounter ammo={weapon.rangedAmmo} max={weapon.maxAmmo} />
      <ComboCounter combo={player.combo} timer={player.comboTimer} />
      <DamageNumberLayer />
    </>
  )
}

