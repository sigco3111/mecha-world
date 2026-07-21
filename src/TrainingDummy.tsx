import { useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MechaModel } from './MechaModel'
import type { MechaHandle } from './MechaModel'

export type TrainingDummyHandle = {
  getPosition: () => THREE.Vector3
  takeDamage: (amount: number, knockback?: THREE.Vector3) => void
  getHp: () => number
  isAlive: () => boolean
  reset: () => void
}

interface TrainingDummyProps {
  position: [number, number, number]
  color?: string
  onRef?: (ref: TrainingDummyHandle | null) => void
}

// 训练用靶子 — 受击后退 + 摇晃 + 恢复
export const TrainingDummy = ({ position: initialPos, color = '#ff4444', onRef }: TrainingDummyProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const mechaRef = useRef<MechaHandle>(null)
  const hpRef = useRef(500)
  const maxHp = 500
  const [hitFlash, setHitFlash] = useState(0)
  const knockbackVel = useRef(new THREE.Vector3())
  const basePos = useRef(new THREE.Vector3(...initialPos))
  const shakeTime = useRef(0)

  // 注册给父组件
  const handle: TrainingDummyHandle = {
    getPosition: () => groupRef.current?.position.clone() || basePos.current.clone(),
    takeDamage: useCallback((amount: number, knockback?: THREE.Vector3) => {
      hpRef.current = Math.max(0, hpRef.current - amount)
      setHitFlash(0.3)
      shakeTime.current = 0.3
      if (knockback) knockbackVel.current.add(knockback)
    }, []),
    getHp: () => hpRef.current,
    isAlive: () => hpRef.current > 0,
    reset: () => {
      hpRef.current = maxHp
      if (groupRef.current) {
        groupRef.current.position.copy(basePos.current)
      }
      knockbackVel.current.set(0, 0, 0)
    },
  }

  useFrame((_, dt) => {
    if (!groupRef.current) return
    const g = groupRef.current

    // 击退位移
    g.position.addScaledVector(knockbackVel.current, dt)
    knockbackVel.current.multiplyScalar(0.88) // 摩擦减速

    // 拉回原位（弹簧效果）
    const toBase = new THREE.Vector3().subVectors(basePos.current, g.position)
    toBase.y = 0 // 只拉水平
    g.position.addScaledVector(toBase, 2 * dt)

    // 受击摇晃
    if (shakeTime.current > 0) {
      shakeTime.current -= dt
      g.rotation.z = Math.sin(shakeTime.current * 40) * 0.1
    } else {
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, 0.2)
    }

    // 血量过低时机甲倾斜
    if (hpRef.current < maxHp * 0.3) {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -0.15, 0.05)
    } else {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0, 0.1)
    }

    // hit flash decay
    if (hitFlash > 0) setHitFlash(Math.max(0, hitFlash - dt * 3))
  })

  // 注册到外部
  if (onRef) onRef(handle)

  const dead = hpRef.current <= 0

  return (
    <group ref={groupRef} position={initialPos}>
      {!dead && (
        <MechaModel
          ref={mechaRef}
          color={color}
          accentColor="#ff6600"
        />
      )}
      {/* 血量条 */}
      {!dead && (
        <group position={[0, 5, 0]}>
          <mesh>
            <planeGeometry args={[2.2, 0.25]} />
            <meshBasicMaterial color="#330000" transparent opacity={0.8} />
          </mesh>
          <mesh position={[-(2.2 / 2) + (2.2 / 2) * (hpRef.current / maxHp), 0, 0.01]}>
            <planeGeometry args={[Math.max(0.01, 2.2 * (hpRef.current / maxHp)), 0.2]} />
            <meshBasicMaterial color={hpRef.current > maxHp * 0.3 ? '#ff4444' : '#ffaa00'} />
          </mesh>
        </group>
      )}
      {/* 受击闪光 */}
      {hitFlash > 0 && (
        <mesh position={[0, 1.8, 0]}>
          <sphereGeometry args={[2, 16, 16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={hitFlash} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
