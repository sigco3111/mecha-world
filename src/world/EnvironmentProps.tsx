import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getTerrainHeight, getBiomeAt } from './Terrain'

// Deterministic random based on position
function hash(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return s - Math.floor(s)
}

// ============================================================
// Low-poly tree
// ============================================================
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh castShadow position={[0, 2, 0]}>
        <cylinderGeometry args={[0.4, 0.6, 4]} />
        <meshStandardMaterial color="#5a3a2a" roughness={0.9} />
      </mesh>
      {/* Foliage */}
      <mesh castShadow position={[0, 5, 0]}>
        <coneGeometry args={[2.5, 4, 6]} />
        <meshStandardMaterial color="#2a5a2a" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 7, 0]}>
        <coneGeometry args={[2, 3, 6]} />
        <meshStandardMaterial color="#2a6a2a" roughness={0.8} />
      </mesh>
    </group>
  )
}

// ============================================================
// Crystal formation (crystal biome)
// ============================================================
function Crystal({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <octahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial color="#8a5aff" emissive="#5a3aaa" emissiveIntensity={0.5} metalness={0.5} roughness={0.2} transparent opacity={0.85} />
      </mesh>
      <mesh castShadow position={[1, -0.5, 0.5]} rotation={[0, 1, 0.3]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#aa7aff" emissive="#6a4aba" emissiveIntensity={0.4} metalness={0.5} roughness={0.2} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

// ============================================================
// Rock formation
// ============================================================
function Rock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <mesh castShadow position={position} scale={scale}>
      <dodecahedronGeometry args={[1.5, 0]} />
      <meshStandardMaterial color="#6a6a6a" roughness={0.95} flatShading />
    </mesh>
  )
}

// ============================================================
// Volcanic vent — glowing lava rocks
// ============================================================
function VolcanicVent({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.PointLight>(null)
  useFrameTick(ref)
  return (
    <group position={position}>
      <mesh castShadow>
        <coneGeometry args={[2, 1, 6]} />
        <meshStandardMaterial color="#3a1a0a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshStandardMaterial color="#ff4400" emissive="#ff6600" emissiveIntensity={2} />
      </mesh>
      <pointLight ref={ref} color="#ff6600" intensity={5} distance={15} />
    </group>
  )
}

// Tiny helper to flicker lights
function useFrameTick(ref: React.RefObject<THREE.PointLight | null>) {
  useFrame((state) => {
    if (ref.current) {
      ref.current.intensity = 3 + Math.sin(state.clock.elapsedTime * 5) * 2
    }
  })
}

// ============================================================
// Ancient ruin pillar
// ============================================================
function RuinPillar({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 4, 0]}>
        <boxGeometry args={[1.5, 8, 1.5]} />
        <meshStandardMaterial color="#8a8a7a" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 8.5, 0]}>
        <boxGeometry args={[2.2, 1, 2.2]} />
        <meshStandardMaterial color="#7a7a6a" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2.2, 1, 2.2]} />
        <meshStandardMaterial color="#7a7a6a" roughness={0.9} />
      </mesh>
    </group>
  )
}

// ============================================================
// Scatter system — places props across terrain based on biome
// ============================================================
export function EnvironmentProps() {
  const props = useMemo(() => {
    const items: React.ReactElement[] = []
    const range = 200
    const step = 8

    for (let x = -range; x <= range; x += step) {
      for (let z = -range; z <= range; z += step) {
        const wx = x + (hash(x, z) - 0.5) * step
        const wz = z + (hash(z, x) - 0.5) * step
        const h = getTerrainHeight(wx, wz)
        const biome = getBiomeAt(wx, wz)
        const rand = hash(wx, wz)
        const pos: [number, number, number] = [wx, h, wz]

        // Trees in plains
        if (biome === 'plains' && rand < 0.08) {
          items.push(<Tree key={`t${wx}-${wz}`} position={pos} />)
        }
        // Crystals in crystal biome
        else if (biome === 'crystal' && rand < 0.12) {
          items.push(<Crystal key={`c${wx}-${wz}`} position={pos} scale={0.8 + rand * 2} />)
        }
        // Rocks everywhere (sparse)
        else if (rand < 0.03) {
          items.push(<Rock key={`r${wx}-${wz}`} position={pos} scale={0.5 + rand * 2} />)
        }
        // Volcanic vents
        else if (biome === 'volcanic' && rand < 0.06) {
          items.push(<VolcanicVent key={`v${wx}-${wz}`} position={pos} />)
        }
        // Snow patches in snow biome
        else if (biome === 'snow' && rand < 0.05) {
          items.push(<Rock key={`s${wx}-${wz}`} position={pos} scale={0.3 + rand} />)
        }
        // Rare ruins
        else if (rand > 0.995) {
          items.push(<RuinPillar key={`u${wx}-${wz}`} position={pos} rotation={rand * 6} />)
        }
      }
    }
    return items
  }, [])

  return <>{props}</>
}
