import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 程序化机甲模型 — 用几何体组合出一台机甲
export function MechaModel({ color = '#4a9eff' }: { color?: string }) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // 核心发光呼吸效果
    if (coreRef.current) {
      const scale = 1 + Math.sin(t * 3) * 0.1
      coreRef.current.scale.set(scale, scale, scale)
    }
  })

  const armorColor = new THREE.Color(color)
  const darkColor = new THREE.Color('#222233')
  const glowColor = new THREE.Color('#00ffff')

  return (
    <group ref={groupRef} dispose={null}>
      {/* === 头部 === */}
      <group position={[0, 2.8, 0]}>
        {/* 头盔主体 */}
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.6, 0.7]} />
          <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
        </mesh>
        {/* 面罩 */}
        <mesh position={[0, 0, 0.3]}>
          <boxGeometry args={[0.5, 0.2, 0.1]} />
          <meshStandardMaterial color={'#001122'} emissive={glowColor} emissiveIntensity={0.5} metalness={0.9} roughness={0.1} />
        </mesh>
        {/* 头顶天线 */}
        <mesh position={[0.3, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
          <meshStandardMaterial color={darkColor} metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.3, 0.8, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={2} />
        </mesh>
      </group>

      {/* === 躯干 === */}
      <group position={[0, 1.8, 0]}>
        {/* 胸甲 */}
        <mesh castShadow>
          <boxGeometry args={[1.4, 1.2, 0.8]} />
          <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
        </mesh>
        {/* 核心能量炉 */}
        <mesh ref={coreRef} position={[0, 0.1, 0.42]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={3} />
        </mesh>
        {/* 肩部装甲 */}
        <mesh position={[-0.95, 0.4, 0]} castShadow>
          <boxGeometry args={[0.6, 0.5, 0.7]} />
          <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0.95, 0.4, 0]} castShadow>
          <boxGeometry args={[0.6, 0.5, 0.7]} />
          <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* === 手臂 === */}
      {/* 左臂 */}
      <group position={[-1.05, 1.8, 0]}>
        {/* 上臂 */}
        <mesh position={[0, -0.55, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.2, 0.7, 8]} />
          <meshStandardMaterial color={darkColor} metalness={0.7} roughness={0.4} />
        </mesh>
        {/* 前臂 */}
        <mesh position={[0, -1.25, 0]} castShadow>
          <boxGeometry args={[0.42, 0.7, 0.42]} />
          <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
        </mesh>
        {/* 拳头 */}
        <mesh position={[0, -1.7, 0]} castShadow>
          <boxGeometry args={[0.38, 0.3, 0.38]} />
          <meshStandardMaterial color={darkColor} metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* 右臂 */}
      <group position={[1.05, 1.8, 0]}>
        <mesh position={[0, -0.55, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.2, 0.7, 8]} />
          <meshStandardMaterial color={darkColor} metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, -1.25, 0]} castShadow>
          <boxGeometry args={[0.42, 0.7, 0.42]} />
          <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -1.7, 0]} castShadow>
          <boxGeometry args={[0.38, 0.3, 0.38]} />
          <meshStandardMaterial color={darkColor} metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* === 腰部 === */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[1.0, 0.5, 0.6]} />
        <meshStandardMaterial color={darkColor} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* === 腿部 === */}
      {/* 左腿 */}
      <group position={[-0.4, 0.75, 0]}>
        {/* 大腿 */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 0.8, 0.5]} />
          <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
        </mesh>
        {/* 小腿 */}
        <mesh position={[0, -0.7, 0]} castShadow>
          <boxGeometry args={[0.45, 0.8, 0.55]} />
          <meshStandardMaterial color={darkColor} metalness={0.7} roughness={0.4} />
        </mesh>
        {/* 脚 */}
        <mesh position={[0, -1.2, 0.1]} castShadow>
          <boxGeometry args={[0.5, 0.25, 0.8]} />
          <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* 右腿 */}
      <group position={[0.4, 0.75, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 0.8, 0.5]} />
          <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.7, 0]} castShadow>
          <boxGeometry args={[0.45, 0.8, 0.55]} />
          <meshStandardMaterial color={darkColor} metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, -1.2, 0.1]} castShadow>
          <boxGeometry args={[0.5, 0.25, 0.8]} />
          <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* === 背部喷射器 === */}
      <group position={[0, 2.3, -0.45]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 1.2, 0.35]} />
          <meshStandardMaterial color={darkColor} metalness={0.8} roughness={0.3} />
        </mesh>
        {/* 喷口 */}
        <mesh position={[-0.3, -0.7, -0.15]}>
          <cylinderGeometry args={[0.12, 0.15, 0.2, 8]} />
          <meshStandardMaterial color={'#330000'} emissive={glowColor} emissiveIntensity={1} />
        </mesh>
        <mesh position={[0.3, -0.7, -0.15]}>
          <cylinderGeometry args={[0.12, 0.15, 0.2, 8]} />
          <meshStandardMaterial color={'#330000'} emissive={glowColor} emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  )
}
