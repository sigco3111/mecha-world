import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useEnemyStore } from '../stores/enemyStore'
import { useGameStore } from '../stores/gameStore'
import { updateEnemyAI, knockbackEnemy, staggerEnemy } from './EnemyAI'
import { checkMeleeHit, checkProjectileHit } from '../combat/CombatLogic'
import { EnemyRenderer } from './EnemyRenderer'

// Central system that updates all enemies
export function EnemySystem({ playerPosRef }: { playerPosRef: React.MutableRefObject<THREE.Vector3> }) {
  const enemies = useEnemyStore(s => s.enemies)
  const damageEnemy = useEnemyStore(s => s.damageEnemy)
  const removeEnemy = useEnemyStore(s => s.removeEnemy)
  const addKill = useEnemyStore(s => s.addKill)

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const playerPos = playerPosRef.current
    const gs = useGameStore.getState()

    for (const e of enemies) {
      // Run AI
      const result = updateEnemyAI(e, playerPos, dt)

      // Handle AI outputs
      if (result.firedProjectile) {
        gs.addProjectile(result.firedProjectile)
      }
      if (result.hitPlayer) {
        gs.takeDamage(result.hitPlayer)
      }
      if (result.died) {
        addKill()
        gs.addImpact([e.position[0], e.position[1] + 2, e.position[2]], 'explosion')
      }

      // Remove dead enemies after death animation
      if (e.state === 'dead' && e.stateTimer <= 0) {
        removeEnemy(e.id)
      }
    }

    // Projectile collision system
    const currentState = useGameStore.getState()
    const aliveProjectiles: typeof currentState.projectiles = []
    for (const p of currentState.projectiles) {
      const newPos: [number, number, number] = [
        p.position[0] + p.velocity[0] * dt,
        p.position[1] + p.velocity[1] * dt,
        p.position[2] + p.velocity[2] * dt,
      ]
      const lifetime = p.lifetime - dt
      if (lifetime <= 0) continue

      let hit = false
      if (p.ownerId === 'player') {
        for (const e of enemies) {
          if (e.hp <= 0) continue
          const ePos = new THREE.Vector3(e.position[0], e.position[1] + 1.5, e.position[2])
          if (checkProjectileHit(newPos, ePos, 1.5 + e.scale)) {
            const crit = Math.random() < 0.2
            const dmg = crit ? Math.round(p.damage * 2) : p.damage
            damageEnemy(e.id, dmg)
            gs.dealDamage(e.id, dmg, [e.position[0], e.position[1] + 2.5, e.position[2]], crit)
            gs.addImpact([newPos[0], newPos[1], newPos[2]], 'energy')
            hit = true
            break
          }
        }
      } else if (p.ownerId === 'enemy') {
        // Enemy projectile hits player
        const playerHeadPos = new THREE.Vector3(playerPos.x, playerPos.y + 1.5, playerPos.z)
        if (checkProjectileHit(newPos, playerHeadPos, 2.0)) {
          gs.takeDamage(p.damage)
          gs.addImpact([newPos[0], newPos[1], newPos[2]], 'explosion')
          hit = true
        }
      }

      if (!hit) {
        if (newPos[1] < 0) {
          gs.addImpact([newPos[0], 0, newPos[2]], 'energy')
          hit = true
        }
      }
      if (!hit) {
        aliveProjectiles.push({ ...p, position: newPos, lifetime })
      }
    }
    useGameStore.setState({ projectiles: aliveProjectiles })
  })

  return (
    <group>
      {enemies.map(e => (
        <EnemyRenderer key={e.id} enemy={e} playerPosRef={playerPosRef} />
      ))}
    </group>
  )
}

// Export helper for Player.tsx to damage enemies
export function damageEnemyFromPlayer(enemyId: string, amount: number, knockback: THREE.Vector3) {
  const store = useEnemyStore.getState()
  store.damageEnemy(enemyId, amount)
  const enemy = store.enemies.find(e => e.id === enemyId)
  if (enemy) {
    knockbackEnemy(enemy, knockback)
    staggerEnemy(enemy, 0.3)
  }
}
