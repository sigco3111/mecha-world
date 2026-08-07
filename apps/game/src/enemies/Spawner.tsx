import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEnemyStore } from '../stores/enemyStore'
import type { EnemyType } from '../stores/enemyStore'
import { getTerrainHeight } from '../world/Terrain'

interface SpawnConfig {
  pos: [number, number, number]
  types: EnemyType[]
  maxAlive: number
  interval: number
}

const SPAWN_POINTS: SpawnConfig[] = [
  { pos: [25, 0, -20], types: ['grunt', 'soldier'], maxAlive: 2, interval: 6 },
  { pos: [-30, 0, -15], types: ['grunt', 'elite'], maxAlive: 2, interval: 8 },
  { pos: [15, 0, 30], types: ['soldier'], maxAlive: 2, interval: 7 },
  { pos: [-20, 0, 25], types: ['grunt', 'soldier'], maxAlive: 2, interval: 6 },
]

export function EnemySpawner({ playerPosRef }: { playerPosRef: React.MutableRefObject<THREE.Vector3> }) {
  const timers = useRef(SPAWN_POINTS.map(() => 2 + Math.random() * 2))
  const spawnEnemy = useEnemyStore(s => s.spawnEnemy)
  const enemies = useEnemyStore(s => s.enemies)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const playerPos = playerPosRef.current

    SPAWN_POINTS.forEach((sp, i) => {
      const dist = new THREE.Vector3(...sp.pos).distanceTo(playerPos)
      // Only spawn when player is within 50 units
      if (dist > 50) return

      timers.current[i] -= dt
      if (timers.current[i] <= 0) {
        const aliveNearby = enemies.filter(e => {
          const d = new THREE.Vector3(e.position[0], 0, e.position[2]).distanceTo(new THREE.Vector3(...sp.pos))
          return d < 20 && e.hp > 0
        }).length

        if (aliveNearby < sp.maxAlive) {
          // Random offset from spawn point
          const angle = Math.random() * Math.PI * 2
          const radius = Math.random() * 5
          const sx = sp.pos[0] + Math.cos(angle) * radius
          const sz = sp.pos[2] + Math.sin(angle) * radius
          const pos: [number, number, number] = [
            sx,
            getTerrainHeight(sx, sz),
            sz,
          ]
          const type = sp.types[Math.floor(Math.random() * sp.types.length)]
          spawnEnemy(type, pos)
        }
        timers.current[i] = sp.interval
      }
    })
  })

  return null
}

// Boss spawner — triggered manually
export function spawnBoss(pos: [number, number, number] = [0, 0, -40]) {
  useEnemyStore.getState().spawnEnemy('boss', pos)
  useEnemyStore.getState().setBossActive(true, 5000)
}
