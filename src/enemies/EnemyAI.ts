import * as THREE from 'three'
import type { EnemyEntity } from '../stores/enemyStore'
import { createProjectileData } from '../combat/CombatLogic'

// AI state machine update
export function updateEnemyAI(
  e: EnemyEntity,
  playerPos: THREE.Vector3,
  dt: number,
): { firedProjectile?: ReturnType<typeof createProjectileData>; hitPlayer?: number; died?: boolean } {
  if (e.hp <= 0) {
    if (e.state !== 'dead') {
      e.state = 'dead'
      e.stateTimer = 2.0
      return { died: true }
    }
    e.stateTimer -= dt
    e.position[1] -= dt * 1.5
    return {}
  }

  const result: any = {}
  e.stateTimer -= dt
  e.attackCooldown = Math.max(0, e.attackCooldown - dt)

  const ePos = new THREE.Vector3(e.position[0], e.position[1], e.position[2])
  const distToPlayer = ePos.distanceTo(playerPos)
  const toPlayer = new THREE.Vector3().subVectors(playerPos, ePos)
  toPlayer.y = 0
  const distFlat = toPlayer.length()
  const dirToPlayer = distFlat > 0.01 ? toPlayer.clone().normalize() : new THREE.Vector3(0,0,1)

  switch (e.state) {
    case 'idle': {
      if (e.stateTimer <= 0) { e.state = 'patrol'; e.stateTimer = 3 + Math.random() * 3 }
      if (distFlat < e.detectRange) { e.state = 'alert'; e.stateTimer = 0.4 }
      break
    }
    case 'patrol': {
      const spawnV = new THREE.Vector3(e.spawnPos[0], 0, e.spawnPos[2])
      const toSpawn = new THREE.Vector3().subVectors(spawnV, ePos); toSpawn.y = 0
      if (toSpawn.length() > 1) {
        moveEntity(e, toSpawn.normalize(), e.moveSpeed * 0.3, dt)
      } else if (e.stateTimer <= 0) {
        e.state = 'idle'; e.stateTimer = 1.5 + Math.random() * 2
      }
      if (distFlat < e.detectRange) { e.state = 'alert'; e.stateTimer = 0.4 }
      break
    }
    case 'alert': {
      e.rotation = Math.atan2(dirToPlayer.x, dirToPlayer.z)
      if (e.stateTimer <= 0) { e.state = 'chase'; e.stateTimer = 5 }
      break
    }
    case 'chase': {
      if (distFlat > e.attackRange * 0.7) {
        moveEntity(e, dirToPlayer, e.moveSpeed, dt)
        e.rotation = Math.atan2(dirToPlayer.x, dirToPlayer.z)
      }
      if (distFlat < e.attackRange && e.attackCooldown <= 0) {
        e.state = 'attack_windup'
        e.stateTimer = e.ranged ? 0.5 : 0.35
      }
      if (distFlat > e.detectRange * 1.8 && e.stateTimer <= 0) {
        e.state = 'patrol'; e.stateTimer = 4
      }
      break
    }
    case 'attack_windup': {
      e.rotation = Math.atan2(dirToPlayer.x, dirToPlayer.z)
      if (e.stateTimer <= 0) {
        e.state = 'attack_active'; e.stateTimer = 0.15
        if (e.ranged) {
          const origin = new THREE.Vector3(e.position[0], e.position[1] + 2, e.position[2])
          result.firedProjectile = createProjectileData(origin, dirToPlayer, e.damage, 'enemy')
        } else {
          if (distFlat < e.attackRange + 1) result.hitPlayer = e.damage
        }
      }
      break
    }
    case 'attack_active': {
      if (e.stateTimer <= 0) {
        e.state = 'attack_recover'; e.stateTimer = e.ranged ? 0.8 : 0.5
        e.attackCooldown = e.ranged ? 1.5 + Math.random() : 1.2 + Math.random() * 0.5
      }
      break
    }
    case 'attack_recover': {
      if (e.stateTimer <= 0) {
        e.state = distFlat < e.detectRange ? 'chase' : 'patrol'
        e.stateTimer = 3
      }
      break
    }
    case 'stagger': {
      if (e.stateTimer <= 0) {
        e.state = distFlat < e.detectRange ? 'chase' : 'patrol'; e.stateTimer = 3
      }
      break
    }
  }

  e.velocity[0] *= 0.88; e.velocity[2] *= 0.88
  e.position[0] += e.velocity[0] * dt; e.position[2] += e.velocity[2] * dt

  return result
}

function moveEntity(e: EnemyEntity, dir: THREE.Vector3, speed: number, dt: number) {
  e.position[0] += dir.x * speed * dt
  e.position[2] += dir.z * speed * dt
  const bound = 90
  e.position[0] = Math.max(-bound, Math.min(bound, e.position[0]))
  e.position[2] = Math.max(-bound, Math.min(bound, e.position[2]))
}

export function knockbackEnemy(e: EnemyEntity, force: THREE.Vector3) {
  e.velocity[0] += force.x; e.velocity[2] += force.z
}

export function staggerEnemy(e: EnemyEntity, duration: number = 0.4) {
  if (e.type === 'boss') return
  e.state = 'stagger'; e.stateTimer = duration
}
