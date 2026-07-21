import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './stores/gameStore'

// 子弹渲染 — 发光球体 + 拖尾
export function ProjectileRenderer() {
  const groupRef = useRef<THREE.Group>(null)
  const meshPool = useRef<THREE.Mesh[]>([])

  useFrame(() => {
    const projectiles = useGameStore.getState().projectiles
    if (!groupRef.current) return

    // 同步mesh数量
    while (groupRef.current.children.length < projectiles.length) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: '#00ffff' })
      )
      groupRef.current.add(mesh)
    }
    while (groupRef.current.children.length > projectiles.length) {
      groupRef.current.remove(groupRef.current.children[groupRef.current.children.length - 1])
    }

    // 更新位置
    projectiles.forEach((p, i) => {
      const child = groupRef.current!.children[i] as THREE.Mesh
      if (child) {
        child.position.set(p.position[0], p.position[1], p.position[2])
        const mat = child.material as THREE.MeshBasicMaterial
        mat.color.set(p.ownerId === 'player' ? '#00ffff' : '#ff4444')
      }
    })
  })

  return <group ref={groupRef} />
}

// 冲击波特效
export function ImpactRenderer() {
  const groupRef = useRef<THREE.Group>(null)
  const activeImpacts = useRef<Map<string, { mesh: THREE.Mesh; born: number; type: string }>>(new Map())

  useFrame((state) => {
    const impacts = useGameStore.getState().impacts
    const now = Date.now()
    if (!groupRef.current) return

    // 添加新特效
    for (const imp of impacts) {
      if (activeImpacts.current.has(imp.id)) continue
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.5, 16),
        new THREE.MeshBasicMaterial({
          color: imp.type === 'melee' ? '#ffffff' : imp.type === 'energy' ? '#00ffff' : '#ffaa00',
          transparent: true,
          opacity: 1,
          side: THREE.DoubleSide,
        })
      )
      ring.position.set(imp.position[0], imp.position[1], imp.position[2])
      ring.lookAt(state.camera.position)
      groupRef.current.add(ring)
      activeImpacts.current.set(imp.id, { mesh: ring, born: imp.born, type: imp.type })

      // 爆炸粒子
      if (imp.type === 'melee' || imp.type === 'energy') {
        for (let i = 0; i < 6; i++) {
          const spark = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 4, 4),
            new THREE.MeshBasicMaterial({
              color: imp.type === 'melee' ? '#ffdd44' : '#00aaff',
              transparent: true,
              opacity: 1,
            })
          )
          spark.position.set(imp.position[0], imp.position[1], imp.position[2])
          const dir = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
          ).normalize()
          spark.userData = { dir, speed: 5 + Math.random() * 5, born: imp.born }
          groupRef.current.add(spark)
          activeImpacts.current.set(`${imp.id}-spark-${i}`, { mesh: spark, born: imp.born, type: 'spark' })
        }
      }

      useGameStore.getState().clearImpact(imp.id)
    }

    // 更新特效
    const toDelete: string[] = []
    activeImpacts.current.forEach((data, id) => {
      const age = (now - data.born) / 1000
      if (data.type === 'spark') {
        if (age > 0.4) {
          toDelete.push(id)
          groupRef.current!.remove(data.mesh)
        } else {
          data.mesh.position.addScaledVector(data.mesh.userData.dir, data.mesh.userData.speed * 0.016)
          ;(data.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - age / 0.4
        }
      } else {
        if (age > 0.4) {
          toDelete.push(id)
          groupRef.current!.remove(data.mesh)
        } else {
          const s = 1 + age * 12
          data.mesh.scale.set(s, s, s)
          ;(data.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - age * 2.5)
        }
      }
    })
    toDelete.forEach(id => activeImpacts.current.delete(id))
  })

  return <group ref={groupRef} />
}
