import { useRef, useEffect, useState, useCallback } from 'react'

// Global touch state accessible from Player.tsx
export const touchState = {
  moveX: 0,       // -1 to 1
  moveY: 0,       // -1 to 1
  cameraDX: 0,    // delta for camera rotation
  cameraDY: 0,
  attackMelee: false,
  attackRanged: false,
  boost: false,
  jump: false,
  ult: false,
  toggleView: false,  // FPS/TPS toggle
}

// ============================================================
// Virtual Joystick — left side of screen
// ============================================================
export function VirtualJoystick() {
  const [active, setActive] = useState(false)
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const touchId = useRef<number | null>(null)
  const maxRadius = 60

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchId.current !== null) return
    const t = e.changedTouches[0]
    // Only respond to touches on left half of screen
    if (t.clientX > window.innerWidth / 2) return
    touchId.current = t.identifier
    setActive(true)
    setOrigin({ x: t.clientX, y: t.clientY })
    setKnob({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (touchId.current === null) return
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i]
        if (t.identifier === touchId.current) {
          let dx = t.clientX - origin.x
          let dy = t.clientY - origin.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius
            dy = (dy / dist) * maxRadius
          }
          setKnob({ x: dx, y: dy })
          // Dead zone
          const norm = dist > 15 ? 1 : 0
          touchState.moveX = (dx / maxRadius) * norm
          touchState.moveY = (-dy / maxRadius) * norm // invert Y for forward
        }
      }
    }
    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) {
          touchId.current = null
          setActive(false)
          touchState.moveX = 0
          touchState.moveY = 0
          setKnob({ x: 0, y: 0 })
        }
      }
    }
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)
    return () => {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [origin])

  if (!active) {
    // Show a hint circle in bottom-left
    return (
      <div
        onTouchStart={onTouchStart}
        style={{
          position: 'absolute', bottom: 0, left: 0,
          width: '50%', height: '60%',
          zIndex: 90, pointerEvents: 'auto',
        }}
      >
        <div style={{
          position: 'absolute', bottom: 80, left: 80,
          width: 120, height: 120, borderRadius: '50%',
          border: '2px solid rgba(0,255,255,0.2)',
          background: 'radial-gradient(circle, rgba(0,50,100,0.1), transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(0,255,255,0.3)', fontSize: 12, fontFamily: 'monospace',
        }}>
          MOVE
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 90, pointerEvents: 'none' }}>
      {/* Outer ring */}
      <div style={{
        position: 'absolute',
        left: origin.x - maxRadius, top: origin.y - maxRadius,
        width: maxRadius * 2, height: maxRadius * 2,
        borderRadius: '50%',
        border: '2px solid rgba(0,255,255,0.5)',
        background: 'radial-gradient(circle, rgba(0,100,200,0.1), rgba(0,0,0,0.2))',
      }} />
      {/* Knob */}
      <div style={{
        position: 'absolute',
        left: origin.x - 30 + knob.x, top: origin.y - 30 + knob.y,
        width: 60, height: 60, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,255,255,0.6), rgba(0,150,255,0.3))',
        border: '2px solid rgba(0,255,255,0.8)',
        boxShadow: '0 0 20px rgba(0,255,255,0.4)',
      }} />
    </div>
  )
}

// ============================================================
// Skill Buttons — right side of screen
// ============================================================
export function TouchSkillButtons() {
  const press = (key: string, down: boolean) => {
    if (key === 'melee') touchState.attackMelee = down
    if (key === 'ranged') touchState.attackRanged = down
    if (key === 'jump') touchState.jump = down
    if (key === 'boost') touchState.boost = down
    if (key === 'ult') touchState.ult = down
  }

  const SkillBtn = ({ icon, label, k, color }: { icon: string; label: string; k: string; color: string }) => {
    const [held, setHeld] = useState(false)
    return (
      <div
        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setHeld(true); press(k, true) }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setHeld(false); press(k, false) }}
        onTouchCancel={() => { setHeld(false); press(k, false) }}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: held
            ? `radial-gradient(circle, ${color}cc, ${color}66)`
            : `radial-gradient(circle, rgba(40,50,80,0.7), rgba(20,25,45,0.5))`,
          border: `2px solid ${color}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: held ? `0 0 20px ${color}88` : '0 0 8px rgba(0,0,0,0.5)',
          transition: 'transform 0.05s',
          transform: held ? 'scale(0.92)' : 'scale(1)',
          pointerEvents: 'auto',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span style={{ fontSize: 8, color: '#88aaff', marginTop: 1 }}>{label}</span>
      </div>
    )
  }

  // FPS/TPS View Toggle Button
  const ViewToggleBtn = () => {
    const [fps, setFps] = useState(false)
    return (
      <div
        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setFps(!fps); touchState.toggleView = true }}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: fps
            ? 'radial-gradient(circle, rgba(255,68,255,0.6), rgba(150,0,150,0.3))'
            : 'radial-gradient(circle, rgba(40,50,80,0.7), rgba(20,25,45,0.5))',
          border: `2px solid ${fps ? '#ff44ff' : '#6688aa'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: fps ? '0 0 20px rgba(255,68,255,0.4)' : '0 0 8px rgba(0,0,0,0.5)',
          pointerEvents: 'auto', userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        <span style={{ fontSize: 24 }}>{fps ? '🎯' : '👁️'}</span>
        <span style={{ fontSize: 8, color: '#88aaff', marginTop: 1 }}>{fps ? 'FPS' : 'TPS'}</span>
      </div>
    )
  }

  return (
    <div style={{
      position: 'absolute', bottom: 25, right: 25,
      display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
      zIndex: 95, pointerEvents: 'none',
    }}>
      {/* Top row: boost + ult */}
      <div style={{ display: 'flex', gap: 10 }}>
        <SkillBtn icon="💨" label="冲刺" k="boost" color="#44aaff" />
        <SkillBtn icon="🌟" label="大招" k="ult" color="#ff44ff" />
      </div>
      {/* Bottom row: melee + ranged + view toggle */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <SkillBtn icon="👊" label="近战" k="melee" color="#ff8800" />
        <SkillBtn icon="🔫" label="射击" k="ranged" color="#00ffff" />
        <ViewToggleBtn />
      </div>
      {/* Jump button below */}
      <div style={{ position: 'absolute', bottom: 0, right: 74 }}>
        <SkillBtn icon="🚀" label="喷气" k="jump" color="#ffdd00" />
      </div>
    </div>
  )
}

// ============================================================
// Camera Drag — right half of screen (when not touching buttons)
// ============================================================
export function TouchCameraDrag() {
  const touchId = useRef<number | null>(null)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (touchId.current !== null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        // Right half of screen, but not on UI elements
        if (t.clientX > window.innerWidth / 2) {
          const target = e.target as HTMLElement
          // Don't capture if touching a button
          if (target?.style?.pointerEvents === 'auto' || target?.closest('[data-skill]')) continue
          touchId.current = t.identifier
          lastPos.current = { x: t.clientX, y: t.clientY }
          break
        }
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (touchId.current === null) return
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i]
        if (t.identifier === touchId.current) {
          touchState.cameraDX = t.clientX - lastPos.current.x
          touchState.cameraDY = t.clientY - lastPos.current.y
          lastPos.current = { x: t.clientX, y: t.clientY }
        }
      }
    }
    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) {
          touchId.current = null
          touchState.cameraDX = 0
          touchState.cameraDY = 0
        }
      }
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return null
}

// ============================================================
// Main export — detect touch device and render all controls
// ============================================================
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export function TouchControls() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => { setIsTouch(isTouchDevice()) }, [])
  if (!isTouch) return null
  return (
    <>
      <VirtualJoystick />
      <TouchSkillButtons />
      <TouchCameraDrag />
    </>
  )
}
