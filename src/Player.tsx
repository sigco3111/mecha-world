import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { MechaModel } from './MechaModel'
import type { MechaHandle } from './MechaModel'
import { useGameStore } from './stores/gameStore'
import { useEnemyStore } from './stores/enemyStore'
import { checkMeleeHit, createProjectileData } from './combat/CombatLogic'
import { knockbackEnemy, staggerEnemy } from './enemies/EnemyAI'

const keys: Record<string, boolean> = {}
let mouseLeftDown = false
let mouseRightDown = false

export function getKeyboardState() { return keys }
export function getMouseState() { return { left: mouseLeftDown, right: mouseRightDown } }

interface PlayerProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>
}

export function Player({ playerPosRef }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const mechaRef = useRef<MechaHandle>(null)
  const velocity = useRef(new THREE.Vector3())
  const { camera } = useThree()

  const attackState = useRef({ comboCount: 0, lastAttack: 0, active: false })
  const fireState = useRef({ lastFire: 0 })
  const smoothCameraPos = useRef(new THREE.Vector3(0, 10, 20))
  const cameraTarget = useRef(new THREE.Vector3())
  const cameraAngle = useRef({ theta: 0, phi: 0.35 })
  const mouseControl = useRef({ active: false })

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
    store.getState().decayHitFlash(dt)
    store.getState().tickCombo(dt)

    // Update shared position
    playerPosRef.current.copy(g.position)

    // Movement
    const f = (keys['KeyW'] || keys['ArrowUp']) ? 1 : 0
    const b = (keys['KeyS'] || keys['ArrowDown']) ? 1 : 0
    const l = (keys['KeyA'] || keys['ArrowLeft']) ? 1 : 0
    const r = (keys['KeyD'] || keys['ArrowRight']) ? 1 : 0
    const jump = keys['Space'] || false
    const boost = (keys['ShiftLeft'] || keys['ShiftRight']) || false

    const angle = cameraAngle.current.theta
    const forwardDir = new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle))
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
    if (g.position.y <= 0) { g.position.y = 0; velocity.current.y = 0 }
    if (g.position.y > 40) { g.position.y = 40; velocity.current.y = 0 }

    if (isMoving) {
      const targetAngle = Math.atan2(moveDir.x, moveDir.z)
      let diff = targetAngle - g.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      g.rotation.y += diff * 0.15
      mechaRef.current?.setMoving(true)
    } else {
      mechaRef.current?.setMoving(false)
    }

    // === MELEE ===
    const meleeInput = keys['KeyJ'] || mouseLeftDown
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

    // === RANGED ===
    const rangedInput = keys['KeyK'] || mouseRightDown
    if (rangedInput && now - fireState.current.lastFire > 0.12) {
      if (store.getState().fireRanged()) {
        fireState.current.lastFire = now
        const origin = new THREE.Vector3(g.position.x, g.position.y + 2.2, g.position.z)
        store.getState().addProjectile(createProjectileData(origin, forwardDir, 35, 'player'))
      }
    }

    // === CAMERA ===
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
  })

  return (
    <group ref={groupRef}>
      <MechaModel ref={mechaRef} color="#4a9eff" accentColor="#00ffff" />
    </group>
  )
}
