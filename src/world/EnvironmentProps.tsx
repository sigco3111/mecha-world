import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { getTerrainHeight, getBiomeAt } from './Terrain'

// Deterministic random based on position
function hash(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return s - Math.floor(s)
}

// ============================================================
// Instanced environment props — ONE drawcall per type
// ============================================================
export function EnvironmentProps() {
  // Collect all prop positions in useMemo
  const { treeData, crystalData, rockData, ventData, ruinData } = useMemo(() => {
    const trees: [number, number, number, number][] = [] // x, y, z, scale
    const crystals: [number, number, number, number][] = []
    const rocks: [number, number, number, number][] = []
    const vents: [number, number, number, number][] = []
    const ruins: [number, number, number, number][] = []

    const range = 80
    const step = 10

    for (let x = -range; x <= range; x += step) {
      for (let z = -range; z <= range; z += step) {
        const wx = x + (hash(x, z) - 0.5) * step
        const wz = z + (hash(z, x) - 0.5) * step
        const h = getTerrainHeight(wx, wz)
        const biome = getBiomeAt(wx, wz)
        const rand = hash(wx, wz)
        const scale = 0.7 + rand * 1.5

        if (biome === 'plains' && rand < 0.12) {
          trees.push([wx, h, wz, scale])
        } else if (biome === 'crystal' && rand < 0.15) {
          crystals.push([wx, h, wz, 0.8 + rand * 2])
        } else if (biome === 'volcanic' && rand < 0.08) {
          vents.push([wx, h, wz, scale])
        } else if (rand < 0.04) {
          rocks.push([wx, h, wz, scale])
        } else if (rand > 0.992) {
          ruins.push([wx, h, wz, scale])
        }
      }
    }
    return { treeData: trees, crystalData: crystals, rockData: rocks, ventData: vents, ruinData: ruins }
  }, [])

  return (
    <>
      <InstancedTrees data={treeData} />
      <InstancedCrystals data={crystalData} />
      <InstancedRocks data={rockData} />
      <InstancedVents data={ventData} />
      <InstancedRuins data={ruinData} />
    </>
  )
}

// ============================================================
// Instanced Trees — trunk + foliage, 2 drawcalls total
// ============================================================
function InstancedTrees({ data }: { data: [number, number, number, number][] }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const foliageRef = useRef<THREE.InstancedMesh>(null)
  const topFoliageRef = useRef<THREE.InstancedMesh>(null)

  useMemo(() => {
    const m = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scl = new THREE.Vector3()

    // Defer to next tick so refs are set
    setTimeout(() => {
      data.forEach(([x, y, z, s], i) => {
        // Trunk
        if (trunkRef.current) {
          pos.set(x, y + 2 * s, z)
          scl.set(s, s, s)
          m.compose(pos, quat, scl)
          trunkRef.current.setMatrixAt(i, m)
        }
        // Foliage bottom cone
        if (foliageRef.current) {
          pos.set(x, y + 5 * s, z)
          m.compose(pos, quat, scl)
          foliageRef.current.setMatrixAt(i, m)
        }
        // Foliage top cone
        if (topFoliageRef.current) {
          pos.set(x, y + 7 * s, z)
          m.compose(pos, quat, scl)
          topFoliageRef.current.setMatrixAt(i, m)
        }
      })
      if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true
      if (foliageRef.current) foliageRef.current.instanceMatrix.needsUpdate = true
      if (topFoliageRef.current) topFoliageRef.current.instanceMatrix.needsUpdate = true
    }, 0)
  }, [data])

  return (
    <>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, data.length]}>
        <cylinderGeometry args={[0.4, 0.6, 4]} />
        <meshStandardMaterial color="#5a3a2a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={foliageRef} args={[undefined, undefined, data.length]}>
        <coneGeometry args={[2.5, 4, 6]} />
        <meshStandardMaterial color="#2a5a2a" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={topFoliageRef} args={[undefined, undefined, data.length]}>
        <coneGeometry args={[2, 3, 6]} />
        <meshStandardMaterial color="#2a6a2a" roughness={0.8} />
      </instancedMesh>
    </>
  )
}

// ============================================================
// Instanced Crystals — 1 drawcall
// ============================================================
function InstancedCrystals({ data }: { data: [number, number, number, number][] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useMemo(() => {
    const m = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scl = new THREE.Vector3()
    setTimeout(() => {
      data.forEach(([x, y, z, s], i) => {
        pos.set(x, y + s, z)
        scl.set(s, s, s)
        m.compose(pos, quat, scl)
        if (ref.current) ref.current.setMatrixAt(i, m)
      })
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true
    }, 0)
  }, [data])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.length]}>
      <octahedronGeometry args={[1.5, 0]} />
      <meshStandardMaterial color="#8a5aff" emissive="#5a3aaa" emissiveIntensity={0.4} metalness={0.5} roughness={0.2} transparent opacity={0.85} />
    </instancedMesh>
  )
}

// ============================================================
// Instanced Rocks — 1 drawcall
// ============================================================
function InstancedRocks({ data }: { data: [number, number, number, number][] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useMemo(() => {
    const m = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scl = new THREE.Vector3()
    setTimeout(() => {
      data.forEach(([x, y, z, s], i) => {
        pos.set(x, y + s * 0.5, z)
        scl.set(s, s, s)
        m.compose(pos, quat, scl)
        if (ref.current) ref.current.setMatrixAt(i, m)
      })
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true
    }, 0)
  }, [data])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.length]}>
      <dodecahedronGeometry args={[1.5, 0]} />
      <meshStandardMaterial color="#6a6a6a" roughness={0.95} flatShading />
    </instancedMesh>
  )
}

// ============================================================
// Instanced Volcanic Vents — emissive only, NO point lights
// ============================================================
function InstancedVents({ data }: { data: [number, number, number, number][] }) {
  const baseRef = useRef<THREE.InstancedMesh>(null)
  const lavaRef = useRef<THREE.InstancedMesh>(null)

  useMemo(() => {
    const m = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scl = new THREE.Vector3()
    setTimeout(() => {
      data.forEach(([x, y, z, s], i) => {
        if (baseRef.current) {
          pos.set(x, y, z)
          scl.set(s, s, s)
          m.compose(pos, quat, scl)
          baseRef.current.setMatrixAt(i, m)
        }
        if (lavaRef.current) {
          pos.set(x, y + 0.3 * s, z)
          m.compose(pos, quat, scl)
          lavaRef.current.setMatrixAt(i, m)
        }
      })
      if (baseRef.current) baseRef.current.instanceMatrix.needsUpdate = true
      if (lavaRef.current) lavaRef.current.instanceMatrix.needsUpdate = true
    }, 0)
  }, [data])

  return (
    <>
      <instancedMesh ref={baseRef} args={[undefined, undefined, data.length]}>
        <coneGeometry args={[2, 1, 6]} />
        <meshStandardMaterial color="#3a1a0a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={lavaRef} args={[undefined, undefined, data.length]}>
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshStandardMaterial color="#ff4400" emissive="#ff6600" emissiveIntensity={3} />
      </instancedMesh>
    </>
  )
}

// ============================================================
// Instanced Ruins — 1 drawcall
// ============================================================
function InstancedRuins({ data }: { data: [number, number, number, number][] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useMemo(() => {
    const m = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scl = new THREE.Vector3()
    setTimeout(() => {
      data.forEach(([x, y, z, s], i) => {
        pos.set(x, y + 4 * s, z)
        scl.set(s, s, s)
        m.compose(pos, quat, scl)
        if (ref.current) ref.current.setMatrixAt(i, m)
      })
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true
    }, 0)
  }, [data])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.length]}>
      <boxGeometry args={[1.5, 8, 1.5]} />
      <meshStandardMaterial color="#8a8a7a" roughness={0.9} />
    </instancedMesh>
  )
}
