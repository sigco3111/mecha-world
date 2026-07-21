import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { MechaModel } from './MechaModel'
import type { MechaHandle } from './MechaModel'
import { useGameStore } from './stores/gameStore'
import { checkMeleeHit, createProjectileData, checkProjectileHit } from './combat/CombatLogic'
import type { TrainingDummyHandle } from './TrainingDummy'

// 全局键盘状态
const keys: Record<string, boolean> = {}
// 全局鼠标状态
let mouseLeftDown = false
let mouseRightDown = false

export function getKeyboardState() { return keys }
export function getMouseState() { return { left: mouseLeftDown, right: mouseRightDown } }

interface PlayerProps {
  enemiesRef: React.MutableRefObject<TrainingDummyHandle[]>
}

export function Player({ enemiesRef }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const mechaRef = useRef<MechaHandle>(null)
  const velocity = useRef(new THREE.Vector3())
  const { camera } = useThree()

  // 战斗状态
  const attackState = useRef({
    comboCount: 0,
    lastAttack: 0,
    active: false,
    hasHit: new Set<string>(),
  })
  const fireState = useRef({ lastFire: 0 })

  // 相机
  const smoothCameraPos = useRef(new THREE.Vector3(0, 10, 20))
  const cameraTarget = useRef(new THREE.Vector3())
  const cameraAngle = useRef({ theta: 0, phi: 0.35 })
  const mouseControl = useRef({ active: false })

  // 锁定
  const lockedTargetId = useRef<string | null>(null)

  // === 输入事件 ===
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      keys[e.code] = true
      // 锁定目标
      if (e.code === 'Tab') {
        e.preventDefault()
        if (groupRef.current) {
          const forward = new THREE.Vector3(-Math.sin(cameraAngle.current.theta), 0, -Math.cos(cameraAngle.current.theta))
          const enemies = enemiesRef.current.map(e => ({
            id: e.getPosition().toArray().join(','),
            position: e.getPosition(),
          })).filter(e => {
            const dummy = enemiesRef.current.find(d => d.getPosition().toArray().join(',') === e.id)
            return dummy?.isAlive()
          })
          const target = findLockTargetFromList(groupRef.current.position, forward, enemies)
          lockedTargetId.current = target?.id ?? null
        }
      }
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
      mouseControl.current.startX = e.clientX
      mouseControl.current.startY = e.clientY
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

  // store actions
  const store = useGameStore

  useFrame((state, delta) => {
    const g = groupRef.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    const now = state.clock.elapsedTime

    // === 能量恢复 ===
    store.getState().regenEnergy(dt)
    store.getState().decayHitFlash(dt)
    store.getState().tickCombo(dt)

    // === 移动输入 ===
    const forward = (keys['KeyW'] || keys['ArrowUp']) ? 1 : 0
    const back = (keys['KeyS'] || keys['ArrowDown']) ? 1 : 0
    const left = (keys['KeyA'] || keys['ArrowLeft']) ? 1 : 0
    const right = (keys['KeyD'] || keys['ArrowRight']) ? 1 : 0
    const jump = keys['Space'] || false
    const boost = (keys['ShiftLeft'] || keys['ShiftRight']) || false

    const angle = cameraAngle.current.theta
    const forwardDir = new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle))
    const rightDir = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle))

    const moveDir = new THREE.Vector3()
    moveDir.addScaledVector(forwardDir, forward - back)
    moveDir.addScaledVector(rightDir, right - left)
    const isMoving = moveDir.lengthSq() > 0
    if (isMoving) moveDir.normalize()

    const speed = boost ? 25 : 12
    velocity.current.x = moveDir.x * speed
    velocity.current.z = moveDir.z * speed

    // 喷气
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

    // 朝向
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

    // =========================================================
    // 战斗：近战
    // =========================================================
    const meleeInput = keys['KeyJ'] || mouseLeftDown
    const meleeCd = 0.4
    if (meleeInput && now - attackState.current.lastAttack > meleeCd) {
      attackState.current.comboCount = (attackState.current.comboCount % 3) + 1
      const phase = attackState.current.comboCount
      attackState.current.lastAttack = now
      attackState.current.active = true
      attackState.current.hasHit.clear()
      mechaRef.current?.setAttackPhase(phase)

      // 延迟检测命中（攻击动画的中段）
      setTimeout(() => {
        const enemies = enemiesRef.current
        enemies.forEach((dummy, idx) => {
          if (!dummy.isAlive()) return
          const hit = checkMeleeHit(g.position, g.rotation.y, dummy.getPosition())
          if (hit) {
            dummy.takeDamage(hit.damage, hit.knockback)
            store.getState().dealDamage(`enemy-${idx}`, hit.damage, [
              dummy.getPosition().x,
              dummy.getPosition().y + 2,
              dummy.getPosition().z,
            ], hit.crit)
            store.getState().addImpact([
              dummy.getPosition().x,
              dummy.getPosition().y + 2,
              dummy.getPosition().z,
            ], 'melee')
            store.getState().addCombo()
          }
        })
      }, 120) // 攻击启动后120ms判定命中
    }

    // 连击重置
    if (now - attackState.current.lastAttack > 1.0 && attackState.current.comboCount !== 0) {
      attackState.current.comboCount = 0
      attackState.current.active = false
    }

    // =========================================================
    // 战斗：远程射击
    // =========================================================
    const rangedInput = keys['KeyK'] || mouseRightDown
    const rangedCd = 0.12
    if (rangedInput && now - fireState.current.lastFire > rangedCd) {
      if (store.getState().fireRanged()) {
        fireState.current.lastFire = now
        const origin = new THREE.Vector3(g.position.x, g.position.y + 2.2, g.position.z)
        const dir = forwardDir.clone()
        const pd = createProjectileData(origin, dir, 35, 'player')
        store.getState().addProjectile(pd)
      }
    }

    // 更新子弹 + 碰撞
    const state2 = store.getState()
    const aliveProjectiles: typeof state2.projectiles = []
    for (const p of state2.projectiles) {
      // 移动
      const newPos: [number, number, number] = [
        p.position[0] + p.velocity[0] * dt,
        p.position[1] + p.velocity[1] * dt,
        p.position[2] + p.velocity[2] * dt,
      ]
      const lifetime = p.lifetime - dt
      if (lifetime <= 0) continue

      // 命中检测
      let hit = false
      if (p.ownerId === 'player') {
        for (const dummy of enemiesRef.current) {
          if (!dummy.isAlive()) continue
          if (checkProjectileHit(newPos, dummy.getPosition())) {
            dummy.takeDamage(p.damage)
            store.getState().dealDamage(p.id, p.damage, [
              dummy.getPosition().x,
              dummy.getPosition().y + 2,
              dummy.getPosition().z,
            ], false)
            store.getState().addImpact([
              dummy.getPosition().x,
              dummy.getPosition().y + 2,
              dummy.getPosition().z,
            ], 'energy')
            hit = true
            break
          }
        }
      }
      if (!hit) {
        // 地面碰撞
        if (newPos[1] < 0) {
          store.getState().addImpact([newPos[0], 0, newPos[2]], 'energy')
          hit = true
        }
      }
      if (!hit) {
        aliveProjectiles.push({ ...p, position: newPos, lifetime })
      }
    }
    // 批量替换
    store.setState({ projectiles: aliveProjectiles })

    // =========================================================
    // 相机
    // =========================================================
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

// 本地锁定查找
function findLockTargetFromList(
  playerPos: THREE.Vector3,
  playerForward: THREE.Vector3,
  enemies: { id: string; position: THREE.Vector3 }[],
  maxDist = 30,
  maxAngle = Math.PI / 1.8,
) {
  let best: { id: string; position: THREE.Vector3 } | null = null
  let bestScore = Infinity
  for (const e of enemies) {
    const to = new THREE.Vector3().subVectors(e.position, playerPos)
    const dist = to.length()
    if (dist > maxDist || dist < 0.5) continue
    const angle = to.angleTo(playerForward)
    if (angle > maxAngle) continue
    const score = dist + angle * 8
    if (score < bestScore) { bestScore = score; best = e }
  }
  return best
}
