import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Simple Perlin-like noise for terrain height
function noise2D(x: number, z: number): number {
  const s1 = Math.sin(x * 0.05 + z * 0.03) * 0.5
  const s2 = Math.sin(x * 0.12 - z * 0.08) * 0.3
  const s3 = Math.sin(x * 0.25 + z * 0.15) * 0.1
  return (s1 + s2 + s3) * 4 // amplitude 4 units
}

// Biome types based on position
export type BiomeType = 'plains' | 'desert' | 'crystal' | 'volcanic' | 'snow'

export function getBiomeAt(x: number, z: number): BiomeType {
  const dist = Math.sqrt(x * x + z * z)
  if (dist < 80) return 'plains'
  const angle = Math.atan2(z, x)
  if (angle > -0.8 && angle < 0.4) return 'desert'
  if (angle >= 0.4 && angle < 1.8) return 'crystal'
  if (angle >= 1.8 || angle < -2.4) return 'volcanic'
  return 'snow'
}

const biomeColors: Record<BiomeType, string> = {
  plains: '#3a5f3a',
  desert: '#c4a35a',
  crystal: '#5a4a8a',
  volcanic: '#5a2a2a',
  snow: '#c8d8e8',
}

export function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)

  const { geometry, vertexColors } = useMemo(() => {
    const size = 500
    const segments = 128
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    const colors: THREE.Color[] = []

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = noise2D(x, z)
      pos.setY(i, h)

      const biome = getBiomeAt(x, z)
      const baseColor = new THREE.Color(biomeColors[biome])
      // Add slight height-based variation
      const brightness = 0.8 + (h / 8) * 0.2
      baseColor.multiplyScalar(brightness)
      colors.push(baseColor)
    }

    geo.computeVertexNormals()
    const colorArray = new Float32Array(pos.count * 3)
    colors.forEach((c, i) => {
      colorArray[i * 3] = c.r
      colorArray[i * 3 + 1] = c.g
      colorArray[i * 3 + 2] = c.b
    })
    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))

    return { geometry: geo, vertexColors: true }
  }, [])

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors={vertexColors} roughness={0.9} metalness={0.1} />
    </mesh>
  )
}

// Get terrain height at any world position (for placing objects + player)
export function getTerrainHeight(x: number, z: number): number {
  return noise2D(x, z)
}
