import { useRef, forwardRef, useImperativeHandle } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type EnemyModelHandle = {
  setAttacking: (a: boolean) => void
  setMoving: (m: boolean) => void
}

interface Props {
  color?: string
  accentColor?: string
  scale?: number
  attacking?: boolean
}

export const EnemyModel = forwardRef<EnemyModelHandle, Props>(
  ({ color = '#ff4444', accentColor = '#ff6600', scale = 1 }, ref) => {
    const groupRef = useRef<THREE.Group>(null)
    const leftArmRef = useRef<THREE.Group>(null)
    const rightArmRef = useRef<THREE.Group>(null)
    const coreRef = useRef<THREE.Mesh>(null)
    const leftLegRef = useRef<THREE.Group>(null)
    const rightLegRef = useRef<THREE.Group>(null)
    const animState = useRef({ attackTime: 0, moving: false, walkTime: 0 })

    useImperativeHandle(ref, () => ({
      setAttacking: () => { animState.current.attackTime = 0.35 },
      setMoving: (m: boolean) => { animState.current.moving = m },
    }))

    useFrame((state, dt) => {
      const t = state.clock.elapsedTime
      const a = animState.current
      a.attackTime = Math.max(0, a.attackTime - dt)
      a.walkTime += dt * (a.moving ? 8 : 0)

      if (coreRef.current) {
        const s = 1 + Math.sin(t * 3) * 0.08
        coreRef.current.scale.set(s, s, s)
      }

      const swing = a.attackTime > 0 ? Math.sin((0.35 - a.attackTime) / 0.35 * Math.PI) : 0
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 2.0
      if (rightArmRef.current) rightArmRef.current.rotation.x = -swing * 2.0

      if (leftLegRef.current && rightLegRef.current) {
        if (a.moving) {
          leftLegRef.current.rotation.x = Math.sin(a.walkTime) * 0.4
          rightLegRef.current.rotation.x = -Math.sin(a.walkTime) * 0.4
        } else {
          leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, 0.2)
          rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, 0.2)
        }
      }
    })

    const armorColor = new THREE.Color(color)
    const darkColor = new THREE.Color('#1a1a1a')
    const glowColor = new THREE.Color(accentColor)

    return (
      <group ref={groupRef} scale={scale}>
        {/* Head */}
        <group position={[0, 2.8, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.6, 0.7]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.3]}>
            <boxGeometry args={[0.5, 0.2, 0.1]} />
            <meshStandardMaterial color={'#110000'} emissive={glowColor} emissiveIntensity={0.8} />
          </mesh>
          {/* Horns for elite/boss look */}
          <mesh position={[-0.25, 0.45, 0]} rotation={[0, 0, -0.4]} castShadow>
            <coneGeometry args={[0.08, 0.4, 6]} />
            <meshStandardMaterial color={darkColor} metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0.25, 0.45, 0]} rotation={[0, 0, 0.4]} castShadow>
            <coneGeometry args={[0.08, 0.4, 6]} />
            <meshStandardMaterial color={darkColor} metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
        {/* Torso */}
        <group position={[0, 1.8, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.4, 1.2, 0.8]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh ref={coreRef} position={[0, 0.1, 0.42]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={3} />
          </mesh>
          <mesh position={[-0.95, 0.4, 0]} castShadow>
            <boxGeometry args={[0.6, 0.5, 0.7]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0.95, 0.4, 0]} castShadow>
            <boxGeometry args={[0.6, 0.5, 0.7]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
        {/* Left arm */}
        <group ref={leftArmRef} position={[-1.05, 2.2, 0]}>
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
        {/* Right arm */}
        <group ref={rightArmRef} position={[1.05, 2.2, 0]}>
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
        {/* Waist */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[1.0, 0.5, 0.6]} />
          <meshStandardMaterial color={darkColor} metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Left leg */}
        <group ref={leftLegRef} position={[-0.4, 0.75, 0]}>
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
        {/* Right leg */}
        <group ref={rightLegRef} position={[0.4, 0.75, 0]}>
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
      </group>
    )
  }
)
EnemyModel.displayName = 'EnemyModel'
