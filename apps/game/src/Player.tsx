import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { MechaModel } from './MechaModel'
import type { MechaHandle } from './MechaModel'
import { useGameStore } from './stores/gameStore'
import { useEnemyStore } from './stores/enemyStore'
import { useRPGStore } from './rpg/rpgStore'
import { checkMeleeHit, createProjectileData } from './combat/CombatLogic'
import { knockbackEnemy, staggerEnemy } from './enemies/EnemyAI'
import { touchState } from './controls/TouchControls'
import { getTerrainHeight } from './world/Terrain'

const keys: Record<string, boolean> = {}
let mouseLeftDown = false
let mouseRightDown = false

export function getKeyboardState() { return keys }
export function getMouseState() { return { left: mouseLeftDown, right: mouseRightDown } }

// Global camera mode state — accessible from BattleHUD for the toggle button
export const cameraMode = { firstPerson: false }

interface PlayerProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>
}

export function Player({ playerPosRef }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const mechaRef = useRef<MechaHandle>(null)
  const velocity = useRef(new THREE.Vector3())
  const { camera } = useThree()

  // Read equipped mecha config for dynamic color
  const equippedMecha = useRPGStore(s => s.mechas.find(m => m.equipped) ?? s.mechas[0])
  const mechaColor = equippedMecha?.color ?? '#4a9eff'
  const mechaAccent = equippedMecha?.accentColor ?? '#00ffff'
  const mechaWeapon = useRPGStore(s => s.equippedWeapon)

  const attackState = useRef({ comboCount: 0, lastAttack: 0, active: false })
  const fireState = useRef({ lastFire: 0 })
  const ultState = useRef({ lastCast: 0 })
  const smoothCameraPos = useRef(new THREE.Vector3(0, 10, 20))
  const cameraTarget = useRef(new THREE.Vector3())
  const cameraAngle = useRef({ theta: 0, phi: 0.35 })
  const mouseControl = useRef({ active: false })
  // FPS toggle edge detection
  const prevTogglePressed = useRef(false)

  // FPS toggle (V key or touch toggle button)

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      keys[e.code] = true
      if (e.code === 'Tab') e.preventDefault()
    }
    const ku = (e: KeyboardEvent) => { keys[e.code] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  useEffect(() => {
    const md = (e: MouseEvent) => {
      if (e.button === 0) mouseLeftDown = true
      if (e.button === 2) mouseRightDown = true
      mouseControl.current.active = true
    }
    const mu = (e: MouseEvent) => {
      if (e.button === 0) mouseLeftDown = false
      if (e.button === 2) mouseRightDown = false
      mouseControl.current.active = false
    }
    const mm = (e: MouseEvent) => {
      if (mouseControl.current.active) {
        cameraAngle.current.theta -= e.movementX * 0.005
        cameraAngle.current.phi = Math.max(0.05, Math.min(1.2, cameraAngle.current.phi + e.movementY * 0.005))
      }
    }
    const ctx = (e: Event) => e.preventDefault()
    window.addEventListener('mousedown', md)
    window.addEventListener('mouseup', mu)
    window.addEventListener('mousemove', mm)
    window.addEventListener('contextmenu', ctx)
    return () => {
      window.removeEventListener('mousedown', md)
      window.removeEventListener('mouseup', mu)
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('contextmenu', ctx)
    }
  }, [])

  const store = useGameStore

  useFrame((state, delta) => {
    const g = groupRef.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    const now = state.clock.elapsedTime

    store.getState().regenEnergy(dt)
    store.getState().regenAmmo(dt)
    store.getState().decayHitFlash(dt)
    store.getState().tickCombo(dt)

    // === FPS/TPS TOGGLE ===
    const toggleNow = keys['KeyV'] || touchState.toggleView
    if (toggleNow && !prevTogglePressed.current) {
      cameraMode.firstPerson = !cameraMode.firstPerson
    }
    prevTogglePressed.current = toggleNow
    // Reset touch toggle (it's a momentary button)
    if (touchState.toggleView) touchState.toggleView = false

    // Update shared position
    playerPosRef.current.copy(g.position)
    ;(window as any).__playerPos = [g.position.x, g.position.y, g.position.z]

    // Movement
    let f = (keys['KeyW'] || keys['ArrowUp']) ? 1 : 0
    let b = (keys['KeyS'] || keys['ArrowDown']) ? 1 : 0
    let l = (keys['KeyA'] || keys['ArrowLeft']) ? 1 : 0
    let r = (keys['KeyD'] || keys['ArrowRight']) ? 1 : 0
    let jump = keys['Space'] || false
    let boost = (keys['ShiftLeft'] || keys['ShiftRight']) || false
    if (touchState.moveX !== 0 || touchState.moveY !== 0) {
      f = touchState.moveY > 0 ? touchState.moveY : 0
      b = touchState.moveY < 0 ? -touchState.moveY : 0
      r = touchState.moveX > 0 ? touchState.moveX : 0
      l = touchState.moveX < 0 ? -touchState.moveX : 0
    }
    if (touchState.jump) jump = true
    if (touchState.boost) boost = true

    const rangedInputEarly = keys['KeyK'] || mouseRightDown || touchState.attackRanged
    const meleeInputEarly = keys['KeyJ'] || mouseLeftDown || touchState.attackMelee

    const angle = cameraAngle.current.theta
    // Forward = where camera looks (on XZ plane)
    const forwardDir = new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle))
    // Right = forward rotated 90° clockwise (when viewed from above)
    const rightDir = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle))

    const moveDir = new THREE.Vector3()
    moveDir.addScaledVector(forwardDir, f - b)
    moveDir.addScaledVector(rightDir, r - l)
    const isMoving = moveDir.lengthSq() > 0
    if (isMoving) moveDir.normalize()

    const speed = boost ? 25 : 12
    velocity.current.x = moveDir.x * speed
    velocity.current.z = moveDir.z * speed

    if (jump) {
      velocity.current.y = Math.min(velocity.current.y + 1.5, 15)
      mechaRef.current?.setBoosting(true)
    } else {
      velocity.current.y -= 30 * dt
      mechaRef.current?.setBoosting(false)
    }

    g.position.x += velocity.current.x * dt
    g.position.y += velocity.current.y * dt
    g.position.z += velocity.current.z * dt

    const groundY = getTerrainHeight(g.position.x, g.position.z)
    if (g.position.y <= groundY) {
      g.position.y = groundY
      velocity.current.y = 0
    }
    if (g.position.y > 60) { g.position.y = 60; velocity.current.y = 0 }

    // Mecha facing — always face camera forward direction (like aiming)
    const mechaTargetAngle = Math.atan2(forwardDir.x, forwardDir.z)
    let faceDiff = mechaTargetAngle - g.rotation.y
    while (faceDiff > Math.PI) faceDiff -= Math.PI * 2
    while (faceDiff < -Math.PI) faceDiff += Math.PI * 2

    if (isMoving) {
      g.rotation.y += faceDiff * 0.15
      mechaRef.current?.setMoving(true)
    } else {
      // In FPS or when shooting, snap face toward camera forward faster
      g.rotation.y += faceDiff * (cameraMode.firstPerson ? 0.4 : (rangedInputEarly || meleeInputEarly ? 0.2 : 0.1))
      mechaRef.current?.setMoving(false)
    }

    // === MELEE ===
    const meleeInput = keys['KeyJ'] || mouseLeftDown || touchState.attackMelee
    if (meleeInput && now - attackState.current.lastAttack > 0.4) {
      attackState.current.comboCount = (attackState.current.comboCount % 3) + 1
      attackState.current.lastAttack = now
      mechaRef.current?.setAttackPhase(attackState.current.comboCount)

      setTimeout(() => {
        const es = useEnemyStore.getState().enemies
        es.forEach(e => {
          if (e.hp <= 0) return
          const ePos = new THREE.Vector3(e.position[0], e.position[1], e.position[2])
          const hit = checkMeleeHit(g.position, g.rotation.y, ePos)
          if (hit) {
            useEnemyStore.getState().damageEnemy(e.id, hit.damage)
            knockbackEnemy(e, hit.knockback)
            staggerEnemy(e, 0.2)
            store.getState().dealDamage(e.id, hit.damage, [e.position[0], e.position[1] + 2.5, e.position[2]], hit.crit)
            store.getState().addImpact([e.position[0], e.position[1] + 2, e.position[2]], 'melee')
            store.getState().addCombo()
          }
        })
      }, 120)
    }

    if (now - attackState.current.lastAttack > 1.0) {
      attackState.current.comboCount = 0
    }

    // === ULTIMATE ===
    const ultInput = keys['KeyR'] || touchState.ult
    if (ultInput && now - ultState.current.lastCast > 1.0) {
      if (store.getState().player.energy >= 100) {
        ultState.current.lastCast = now
        store.getState().useEnergy(100)
        mechaRef.current?.setAttackPhase(5)

        const es = useEnemyStore.getState().enemies
        es.forEach(e => {
          if (e.hp <= 0) return
          const ePos = new THREE.Vector3(e.position[0], e.position[1], e.position[2])
          const dist = ePos.distanceTo(g.position)
          if (dist < 15) {
            const dmg = Math.round(300 * (1 - dist / 15) + 100)
            useEnemyStore.getState().damageEnemy(e.id, dmg)
            const knockDir = new THREE.Vector3().subVectors(ePos, g.position).normalize().multiplyScalar(20)
            knockbackEnemy(e, knockDir)
            staggerEnemy(e, 0.8)
            store.getState().dealDamage(e.id, dmg, [e.position[0], e.position[1] + 3, e.position[2]], true)
          }
        })

        store.getState().addImpact([g.position.x, g.position.y + 1, g.position.z], 'explosion')
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          store.getState().addImpact([
            g.position.x + Math.cos(a) * 10,
            g.position.y + 0.5,
            g.position.z + Math.sin(a) * 10,
          ], 'energy')
        }
        store.getState().triggerHitFlash()
        store.getState().castUlt()
      }
    }

    // === RANGED — REDESIGNED ===
    // Camera-aimed shooting: bullets go toward where camera looks
    const rangedInput = keys['KeyK'] || mouseRightDown || touchState.attackRanged
    if (rangedInput && now - fireState.current.lastFire > 0.1) {
      if (store.getState().fireRanged()) {
        fireState.current.lastFire = now

        // 1. Get camera look direction (full 3D, including pitch)
        const camDir = new THREE.Vector3()
        camera.getWorldDirection(camDir)
        camDir.normalize()

        // 2. Muzzle position: right side of mecha, at gun/shoulder height
        // Model faces +Z after rotation θ. Right of mecha = +X in model space.
        // After Y-rotation θ: model +X → world (cosθ, 0, -sinθ) ... but we use forwardDir/rightDir
        // rightDir already computed = perpendicular to forwardDir, pointing right
        const muzzleHeight = cameraMode.firstPerson ? g.position.y + 2.8 : g.position.y + 2.0
        const muzzle = new THREE.Vector3(
          g.position.x + forwardDir.x * 0.5 + rightDir.x * 0.7,
          muzzleHeight,
          g.position.z + forwardDir.z * 0.5 + rightDir.z * 0.7
        )

        // 3. Slight spread for realism (cone of fire)
        const spread = 0.015
        const aimDir = camDir.clone()
        aimDir.x += (Math.random() - 0.5) * spread
        aimDir.y += (Math.random() - 0.5) * spread
        aimDir.z += (Math.random() - 0.5) * spread
        aimDir.normalize()

        // 4. Create projectile with high speed
        store.getState().addProjectile(createProjectileData(muzzle, aimDir, 80, 'player'))

        // 5. Muzzle flash at gun barrel
        store.getState().addImpact([muzzle.x, muzzle.y, muzzle.z], 'energy')

        // 6. Screen shake (hit flash light)
        if (cameraMode.firstPerson) {
          store.getState().triggerHitFlash()
        }

        // 7. Recoil animation
        mechaRef.current?.setAttackPhase(4)
      }
    }

    // === TOUCH CAMERA ===
    if (touchState.cameraDX !== 0 || touchState.cameraDY !== 0) {
      cameraAngle.current.theta -= touchState.cameraDX * 0.005
      // In FPS, allow full vertical look; in TPS, keep limited
      const maxPhi = cameraMode.firstPerson ? 1.55 : 1.2
      cameraAngle.current.phi = Math.max(cameraMode.firstPerson ? -1.55 : 0.05, Math.min(maxPhi, cameraAngle.current.phi + touchState.cameraDY * 0.005))
      touchState.cameraDX = 0
      touchState.cameraDY = 0
    }

    // === CAMERA ===
    if (cameraMode.firstPerson) {
      // FIRST PERSON: camera at mecha head, looking forward + pitch
      const headHeight = g.position.y + 3.2
      const fpsPos = new THREE.Vector3(g.position.x, headHeight, g.position.z)

      // Apply slight backward offset to avoid clipping with own model
      fpsPos.x -= forwardDir.x * 0.3
      fpsPos.z -= forwardDir.z * 0.3

      // Smooth position
      smoothCameraPos.current.lerp(fpsPos, 0.3)
      camera.position.copy(smoothCameraPos.current)

      // Look direction with pitch (phi controls vertical)
      const phi = cameraAngle.current.phi
      // Convert phi to pitch angle: phi=0.35 ≈ slightly down, phi>0.35 = looking up
      const pitch = (phi - 0.35) * 1.5  // scale factor
      const lookDist = 20
      const lookTarget = new THREE.Vector3(
        g.position.x + forwardDir.x * lookDist,
        headHeight + Math.sin(pitch) * lookDist,
        g.position.z + forwardDir.z * lookDist
      )
      cameraTarget.current.lerp(lookTarget, 0.3)
      camera.lookAt(cameraTarget.current)

      // Hide own mecha body in FPS (but keep shadow)
      if (mechaRef.current) {
        mechaRef.current.setVisible(false)
      }
    } else {
      // THIRD PERSON: existing orbit camera
      const phi = cameraAngle.current.phi
      const distance = 12
      const camHeight = Math.sin(phi) * distance
      const camDist = Math.cos(phi) * distance
      const desiredPos = new THREE.Vector3(
        g.position.x - forwardDir.x * camDist,
        g.position.y + camHeight,
        g.position.z - forwardDir.z * camDist
      )
      smoothCameraPos.current.lerp(desiredPos, 0.1)
      camera.position.copy(smoothCameraPos.current)
      cameraTarget.current.lerp(new THREE.Vector3(g.position.x, g.position.y + 2.5, g.position.z), 0.15)
      camera.lookAt(cameraTarget.current)

      // Show mecha
      if (mechaRef.current) {
        mechaRef.current.setVisible(true)
      }
    }
  })

  return (
    <group ref={groupRef}>
      <MechaModel ref={mechaRef} color={mechaColor} accentColor={mechaAccent} weaponId={mechaWeapon} />
    </group>
  )
}
