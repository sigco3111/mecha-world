import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 地面 + 网格
export function Ground() {
  return (
    <>
      {/* 实体地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={'#1a1a2e'} roughness={0.9} metalness={0.1} />
      </mesh>
      {/* 网格线 */}
      <gridHelper args={[200, 100, '#334466', '#222244']} position={[0, 0.01, 0]} />
    </>
  )
}

// 装饰建筑/障碍物
export function Obstacles() {
  const buildings: { pos: [number, number, number]; size: [number, number, number]; color: string }[] = [
    { pos: [-15, 5, -20], size: [6, 10, 6], color: '#2a2a4a' },
    { pos: [20, 3, -25], size: [4, 6, 4], color: '#1e1e38' },
    { pos: [-25, 7, 15], size: [8, 14, 8], color: '#2a2a4a' },
    { pos: [25, 4, 10], size: [5, 8, 5], color: '#1e1e38' },
    { pos: [10, 2, -35], size: [3, 4, 3], color: '#2a2a4a' },
    { pos: [-30, 6, -10], size: [7, 12, 7], color: '#1e1e38' },
    { pos: [35, 5, -15], size: [6, 10, 6], color: '#2a2a4a' },
    { pos: [-10, 3, 25], size: [4, 6, 4], color: '#1e1e38' },
    { pos: [15, 8, -50], size: [10, 16, 10], color: '#2a2a4a' },
    { pos: [-40, 4, -30], size: [5, 8, 5], color: '#1e1e38' },
  ]

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* 散布的에너지柱 */}
      {Array.from({ length: 15 }).map((_, i) => {
        const angle = (i / 15) * Math.PI * 2
        const radius = 20 + (i % 3) * 5
        return (
          <group key={`pillar-${i}`} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
            <mesh position={[0, 2.5, 0]}>
              <cylinderGeometry args={[0.3, 0.4, 5, 8]} />
              <meshStandardMaterial color={'#2a2a4a'} metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 5.2, 0]}>
              <sphereGeometry args={[0.35, 12, 12]} />
              <meshStandardMaterial color={'#00ffff'} emissive={'#00ffff'} emissiveIntensity={2} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// 飘浮粒子
export function FloatingParticles() {
  const ref = useRef<THREE.Points>(null)
  const count = 300
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 100
    positions[i * 3 + 1] = Math.random() * 30 + 5
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100
  }

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={'#4488ff'} size={0.15} transparent opacity={0.6} />
    </points>
  )
}
