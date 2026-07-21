import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EnemyEntity } from '../stores/enemyStore'
import { EnemyModel } from './EnemyModel'
import type { EnemyModelHandle } from './EnemyModel'

const TYPE_COLORS: Record<string, { body: string; accent: string }> = {
  grunt:   { body: '#ff3333', accent: '#ff6600' },
  soldier: { body: '#aa33ff', accent: '#ff44ff' },
  elite:   { body: '#ff6600', accent: '#ffff00' },
  boss:    { body: '#660066', accent: '#ff0000' },
}

export function EnemyRenderer({ enemy }: { enemy: EnemyEntity; playerPosRef: any }) {
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<EnemyModelHandle>(null)
  const prevHpRef = useRef(enemy.hp)
  const hitFlashRef = useRef(0)
  const deadFadeRef = useRef(1)

  useFrame((state, dt) => {
    const g = groupRef.current
    if (!g) return

    // Sync position + rotation from data
    g.position.set(enemy.position[0], Math.max(0, enemy.position[1]), enemy.position[2])
    g.rotation.y = enemy.rotation

    // Moving state for animation
    const moving = enemy.state === 'chase' || enemy.state === 'patrol'
    modelRef.current?.setMoving(moving)

    // Attacking
    if (enemy.state === 'attack_active') {
      modelRef.current?.setAttacking(true)
    }

    // Hit flash
    if (enemy.hp < prevHpRef.current) {
      hitFlashRef.current = 0.25
    }
    prevHpRef.current = enemy.hp
    hitFlashRef.current = Math.max(0, hitFlashRef.current - dt * 3)

    // Death animation
    if (enemy.state === 'dead') {
      deadFadeRef.current = Math.max(0, deadFadeRef.current - dt * 0.5)
      g.scale.setScalar(enemy.scale * deadFadeRef.current)
      g.rotation.z += dt * 3
    } else {
      deadFadeRef.current = 1
      g.scale.setScalar(enemy.scale)
    }

    // Windup lean
    if (enemy.state === 'attack_windup') {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -0.2, 0.2)
    } else {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0, 0.15)
    }
  })

  const colors = TYPE_COLORS[enemy.type] || TYPE_COLORS.grunt
  const isDead = enemy.state === 'dead'

  return (
    <group ref={groupRef}>
      {!isDead && (
        <EnemyModel ref={modelRef} color={colors.body} accentColor={colors.accent} scale={1} />
      )}

      {/* HP bar above head */}
      {!isDead && enemy.hp < enemy.maxHp && (
        <group position={[0, 4.5 * enemy.scale, 0]}>
          <mesh>
            <planeGeometry args={[2.5 * enemy.scale, 0.3 * enemy.scale]} />
            <meshBasicMaterial color="#220000" transparent opacity={0.9} />
          </mesh>
          <mesh position={[-(2.5 * enemy.scale / 2) + (2.5 * enemy.scale / 2) * (enemy.hp / enemy.maxHp), 0, 0.01]}>
            <planeGeometry args={[Math.max(0.01, 2.5 * enemy.scale * (enemy.hp / enemy.maxHp)), 0.22 * enemy.scale]} />
            <meshBasicMaterial color={enemy.hp > enemy.maxHp * 0.3 ? '#ff4444' : '#ffaa00'} />
          </mesh>
        </group>
      )}

      {/* Hit flash sphere */}
      {hitFlashRef.current > 0 && (
        <mesh position={[0, 1.8 * enemy.scale, 0]}>
          <sphereGeometry args={[2.5 * enemy.scale, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={hitFlashRef.current} depthWrite={false} />
        </mesh>
      )}

      {/* State indicator: exclamation when alert, question when idle/patrol near player */}
      {!isDead && enemy.state === 'alert' && (
        <mesh position={[0, 5.5 * enemy.scale, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={2} />
        </mesh>
      )}
    </group>
  )
}
