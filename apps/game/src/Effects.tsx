import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './stores/gameStore'

// 子弹渲染 — 大型发光弹+光晕+拖尾
export function ProjectileRenderer() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const projectiles = useGameStore.getState().projectiles
    if (!groupRef.current) return

    // Each projectile uses 3 meshes: core + glow + trail
    const meshesPerProj = 3
    const needed = projectiles.length * meshesPerProj

    // Grow pool
    while (groupRef.current.children.length < needed) {
      const idx = groupRef.current.children.length
      const slot = idx % meshesPerProj
      let mesh: THREE.Mesh
      if (slot === 0) {
        // Core — bright solid sphere
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 12, 12),
          new THREE.MeshBasicMaterial({ color: '#ffffff' })
        )
      } else if (slot === 1) {
        // Glow — larger transparent sphere
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 12, 12),
          new THREE.MeshBasicMaterial({ color: '#00ffff', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending })
        )
      } else {
        // Trail — elongated capsule behind
        mesh = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.12, 0.8, 4, 8),
          new THREE.MeshBasicMaterial({ color: '#00ffff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
        )
      }
      mesh.visible = false
      groupRef.current.add(mesh)
    }
    // Shrink pool
    while (groupRef.current.children.length > needed) {
      groupRef.current.remove(groupRef.current.children[groupRef.current.children.length - 1])
    }

    // Update positions
    projectiles.forEach((p, i) => {
      const baseIdx = i * meshesPerProj
      const isPlayer = p.ownerId === 'player'
      const coreColor = isPlayer ? '#ffffff' : '#ff6666'
      const glowColor = isPlayer ? '#00ddff' : '#ff3300'
      const trailColor = isPlayer ? '#00aaff' : '#ff0000'

      for (let s = 0; s < meshesPerProj; s++) {
        const child = groupRef.current!.children[baseIdx + s] as THREE.Mesh
        if (!child) continue
        child.visible = true
        child.position.set(p.position[0], p.position[1], p.position[2])

        if (s === 0) {
          // Core
          (child.material as THREE.MeshBasicMaterial).color.set(coreColor)
        } else if (s === 1) {
          // Glow
          (child.material as THREE.MeshBasicMaterial).color.set(glowColor)
        } else {
          // Trail — orient opposite to velocity
          (child.material as THREE.MeshBasicMaterial).color.set(trailColor)
          const vx = p.velocity[0], vy = p.velocity[1], vz = p.velocity[2]
          const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
          if (speed > 0.01) {
            child.lookAt(
              p.position[0] - vx / speed * 5,
              p.position[1] - vy / speed * 5,
              p.position[2] - vz / speed * 5
            )
            child.rotateX(Math.PI / 2)
          }
        }
      }
    })

    // Hide excess meshes
    for (let i = projectiles.length * meshesPerProj; i < groupRef.current.children.length; i++) {
      const child = groupRef.current.children[i] as THREE.Mesh
      if (child) child.visible = false
    }
  })

  return <group ref={groupRef} />
}

// 冲击波효과
export function ImpactRenderer() {
  const groupRef = useRef<THREE.Group>(null)
  const activeImpacts = useRef<Map<string, { mesh: THREE.Mesh; born: number; type: string }>>(new Map())

  useFrame((state) => {
    const impacts = useGameStore.getState().impacts
    const now = Date.now()
    if (!groupRef.current) return

    // 添加新효과
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

      // 爆炸粒子 — explosion有更多粒子+更久
      if (imp.type === 'melee' || imp.type === 'energy') {
        const sparkCount = (imp.type as string) === 'explosion' ? 16 : 6
        for (let i = 0; i < sparkCount; i++) {
          const spark = new THREE.Mesh(
            new THREE.SphereGeometry((imp.type as string) === 'explosion' ? 0.15 : 0.08, 4, 4),
            new THREE.MeshBasicMaterial({
              color: imp.type === 'melee' ? '#ffdd44' : (imp.type as string) === 'explosion' ? '#ff6600' : '#00aaff',
              transparent: true,
              opacity: 1,
            })
          )
          spark.position.set(imp.position[0], imp.position[1], imp.position[2])
          const dir = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 1.5,
            (Math.random() - 0.5) * 2,
          ).normalize()
          spark.userData = { dir, speed: 8 + Math.random() * 8, born: imp.born }
          groupRef.current.add(spark)
          activeImpacts.current.set(`${imp.id}-spark-${i}`, { mesh: spark, born: imp.born, type: (imp.type as string) === 'explosion' ? 'ult-spark' : 'spark' })
        }
      }

      useGameStore.getState().clearImpact(imp.id)
    }

    // 更新효과
    const toDelete: string[] = []
    activeImpacts.current.forEach((data, id) => {
      const age = (now - data.born) / 1000
      const isUlt = data.type === 'ult-spark' || (data.type === 'explosion')
      const maxAge = isUlt ? 1.5 : 0.4
      if (data.type === 'spark' || data.type === 'ult-spark') {
        if (age > maxAge) {
          toDelete.push(id)
          groupRef.current!.remove(data.mesh)
          data.mesh.geometry?.dispose?.()
          if (data.mesh.material) {
            if (Array.isArray(data.mesh.material)) data.mesh.material.forEach(m => m.dispose())
            else (data.mesh.material as THREE.Material).dispose()
          }
        } else {
          data.mesh.position.addScaledVector(data.mesh.userData.dir, data.mesh.userData.speed * 0.016)
          data.mesh.userData.speed *= 0.96 // friction
          ;(data.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - age / maxAge
        }
      } else {
        if (age > maxAge) {
          toDelete.push(id)
          groupRef.current!.remove(data.mesh)
          data.mesh.geometry?.dispose?.()
          if (data.mesh.material) {
            if (Array.isArray(data.mesh.material)) data.mesh.material.forEach(m => m.dispose())
            else (data.mesh.material as THREE.Material).dispose()
          }
        } else {
          const s = 1 + age * (isUlt ? 25 : 12)
          data.mesh.scale.set(s, s, s)
          ;(data.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - age / maxAge)
        }
      }
    })
    toDelete.forEach(id => activeImpacts.current.delete(id))
  })

  return <group ref={groupRef} />
}
