import * as THREE from 'three'

// 扇形近战命中检测
export function checkMeleeHit(
  attackerPos: THREE.Vector3,
  attackerRotY: number,
  targetPos: THREE.Vector3,
  range: number = 4.0,
  arc: number = Math.PI / 2.5,
): { damage: number; crit: boolean; knockback: THREE.Vector3 } | null {
  const toTarget = new THREE.Vector3().subVectors(targetPos, attackerPos)
  const distance = toTarget.length()
  if (distance > range || distance < 0.1) return null

  const angleToTarget = Math.atan2(toTarget.x, toTarget.z)
  let angleDiff = angleToTarget - attackerRotY
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

  if (Math.abs(angleDiff) > arc / 2) return null

  const crit = Math.random() < 0.2
  const baseDamage = 50 + Math.random() * 30
  const damage = crit ? Math.round(baseDamage * 2) : Math.round(baseDamage)
  const knockback = toTarget.clone().normalize().multiplyScalar(12)

  return { damage, crit, knockback }
}

// 创建子弹
export function createProjectileData(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  damage: number,
  ownerId: 'player' | 'enemy' = 'player',
): {
  id: string
  position: [number, number, number]
  velocity: [number, number, number]
  damage: number
  ownerId: 'player' | 'enemy'
  lifetime: number
} {
  const dir = direction.clone().normalize()
  return {
    id: `${ownerId}-${Date.now()}-${Math.random().toFixed(4)}`,
    position: [origin.x, origin.y, origin.z],
    velocity: [dir.x * 70, dir.y * 70, dir.z * 70],
    damage,
    ownerId,
    lifetime: 2.0,
  }
}

// 子弹碰撞检测
export function checkProjectileHit(
  pos: [number, number, number],
  targetPos: THREE.Vector3,
  radius: number = 2.5,
): boolean {
  const dx = pos[0] - targetPos.x
  const dy = pos[1] - targetPos.y
  const dz = pos[2] - targetPos.z
  return dx * dx + dy * dy + dz * dz < radius * radius
}

// 找最佳锁定目标
export function findLockTarget(
  playerPos: THREE.Vector3,
  playerForward: THREE.Vector3,
  enemies: { id: string; position: THREE.Vector3 }[],
  maxDist: number = 30,
  maxAngle: number = Math.PI / 1.8,
): { id: string; position: THREE.Vector3 } | null {
  let best: { id: string; position: THREE.Vector3 } | null = null
  let bestScore = Infinity
  for (const e of enemies) {
    const to = new THREE.Vector3().subVectors(e.position, playerPos)
    const dist = to.length()
    if (dist > maxDist || dist < 0.5) continue
    const angle = to.angleTo(playerForward)
    if (angle > maxAngle) continue
    const score = dist + angle * 8
    if (score < bestScore) {
      bestScore = score
      best = e
    }
  }
  return best
}
