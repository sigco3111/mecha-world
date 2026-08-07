import { useRef, forwardRef, useImperativeHandle } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 暴露给父组件的接口 — 控制手臂动画
export type MechaHandle = {
  setAttackPhase: (phase: number) => void // 0=idle, 1=left, 2=right, 3=double
  setMoving: (moving: boolean) => void
  setBoosting: (boosting: boolean) => void
  setVisible: (visible: boolean) => void
}

interface MechaModelProps {
  color?: string
  accentColor?: string
  weaponId?: string | null
}

export const MechaModel = forwardRef<MechaHandle, MechaModelProps>(
  ({ color = '#4a9eff', accentColor = '#00ffff', weaponId }, ref) => {
    const groupRef = useRef<THREE.Group>(null)
    const leftArmRef = useRef<THREE.Group>(null)
    const rightArmRef = useRef<THREE.Group>(null)
    const coreRef = useRef<THREE.Mesh>(null)
    const leftLegRef = useRef<THREE.Group>(null)
    const rightLegRef = useRef<THREE.Group>(null)
    const boosterRef = useRef<THREE.Group>(null)

    // 内部状态
    const animState = useRef({
      attackPhase: 0,
      attackTime: 0,
      moving: false,
      boosting: false,
      walkTime: 0,
    })

    useImperativeHandle(ref, () => ({
      setAttackPhase: (phase: number) => {
        animState.current.attackPhase = phase
        animState.current.attackTime = 0
      },
      setMoving: (moving: boolean) => { animState.current.moving = moving },
      setBoosting: (boosting: boolean) => { animState.current.boosting = boosting },
      setVisible: (visible: boolean) => {
        if (groupRef.current) {
          groupRef.current.visible = visible
        }
      },
    }))

    useFrame((state, dt) => {
      const t = state.clock.elapsedTime
      const a = animState.current
      a.attackTime += dt
      a.walkTime += dt * (a.moving ? 8 : 0)

      // 核心呼吸
      if (coreRef.current) {
        const s = 1 + Math.sin(t * 3) * 0.08
        coreRef.current.scale.set(s, s, s)
      }

      // 手臂动画
      const swingDecay = Math.max(0, 1 - a.attackTime / 0.35)
      if (leftArmRef.current) {
        if (a.attackPhase === 1) {
          // 左拳挥击
          leftArmRef.current.rotation.x = -swingDecay * 2.5
          leftArmRef.current.rotation.z = swingDecay * 0.3
        } else {
          leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.2)
          leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0, 0.2)
        }
      }
      if (rightArmRef.current) {
        if (a.attackPhase === 2) {
          // 右拳挥击
          rightArmRef.current.rotation.x = -swingDecay * 2.5
          rightArmRef.current.rotation.z = -swingDecay * 0.3
        } else if (a.attackPhase === 3) {
          // 双手合击
          rightArmRef.current.rotation.x = -swingDecay * 2.0
          rightArmRef.current.rotation.z = -swingDecay * 0.8
          if (leftArmRef.current) {
            leftArmRef.current.rotation.x = -swingDecay * 2.0
            leftArmRef.current.rotation.z = swingDecay * 0.8
          }
        } else {
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.2)
          rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0, 0.2)
        }
      }

      // 攻击完成后自动恢复
      if (a.attackTime > 0.4) {
        a.attackPhase = 0
      }

      // 腿部走路动画
      if (leftLegRef.current && rightLegRef.current) {
        if (a.moving && !a.boosting) {
          leftLegRef.current.rotation.x = Math.sin(a.walkTime) * 0.4
          rightLegRef.current.rotation.x = -Math.sin(a.walkTime) * 0.4
        } else {
          leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, 0.2)
          rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, 0.2)
        }
      }

      // 喷射器效果
      if (boosterRef.current) {
        const scale = a.boosting ? 1 + Math.sin(t * 30) * 0.3 : 0.3
        boosterRef.current.scale.y = scale
        boosterRef.current.children.forEach((child, i) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissiveIntensity = a.boosting ? 3 + Math.sin(t * 20 + i) : 0.5
          }
        })
      }
    })

    const armorColor = new THREE.Color(color)
    const darkColor = new THREE.Color('#1a1a2e')
    const glowColor = new THREE.Color(accentColor)

    // Determine weapon visual from weaponId
    const isGun = weaponId && weaponId.includes('gun')
    const isBlade = weaponId && (weaponId.includes('blade') || weaponId.includes('sword'))

    // Weapon attached to right arm
    const renderWeapon = () => {
      if (!weaponId) return null
      if (isGun) {
        return (
          <group position={[0, -1.7, 0.1]}>
            {/* Gun barrel */}
            <mesh position={[0, 0, 0.4]}>
              <boxGeometry args={[0.3, 0.3, 1.0]} />
              <meshStandardMaterial color={darkColor} metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Muzzle */}
            <mesh position={[0, 0.05, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.12, 0.2, 8]} />
              <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={1} />
            </mesh>
            {/* Top sight */}
            <mesh position={[0, 0.25, 0.3]}>
              <boxGeometry args={[0.15, 0.15, 0.3]} />
              <meshStandardMaterial color={darkColor} metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        )
      }
      if (isBlade || weaponId.includes('sword')) {
        return (
          <group position={[0, -1.8, 0]}>
            {/* Blade hilt */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.2, 0.5, 0.2]} />
              <meshStandardMaterial color={darkColor} metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Blade */}
            <mesh position={[0, 0.7, 0]}>
              <boxGeometry args={[0.08, 1.8, 0.3]} />
              <meshStandardMaterial
                color={glowColor}
                emissive={glowColor}
                emissiveIntensity={1.5}
                metalness={0.8}
                roughness={0.1}
              />
            </mesh>
            {/* Blade glow tip */}
            <mesh position={[0, 1.7, 0]}>
              <coneGeometry args={[0.08, 0.3, 4]} />
              <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={3} />
            </mesh>
          </group>
        )
      }
      // Default sword (for w_sword1)
      return (
        <group position={[0, -1.8, 0]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.15, 1.5, 0.2]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      )
    }

    return (
      <group ref={groupRef}>
        {/* === 头部 === */}
        <group position={[0, 2.8, 0]}>
          <mesh>
            <boxGeometry args={[0.7, 0.6, 0.7]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.3]}>
            <boxGeometry args={[0.5, 0.2, 0.1]} />
            <meshStandardMaterial color={'#001122'} emissive={glowColor} emissiveIntensity={0.5} metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0.3, 0.5, 0]}>
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
          <mesh>
            <boxGeometry args={[1.4, 1.2, 0.8]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh ref={coreRef} position={[0, 0.1, 0.42]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={3} />
          </mesh>
          {/* 肩部装甲 */}
          <mesh position={[-0.95, 0.4, 0]}>
            <boxGeometry args={[0.6, 0.5, 0.7]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0.95, 0.4, 0]}>
            <boxGeometry args={[0.6, 0.5, 0.7]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>

        {/* === 左臂 === */}
        <group ref={leftArmRef} position={[-1.05, 2.2, 0]}>
          <mesh position={[0, -0.55, 0]}>
            <cylinderGeometry args={[0.22, 0.2, 0.7, 8]} />
            <meshStandardMaterial color={darkColor} metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, -1.25, 0]}>
            <boxGeometry args={[0.42, 0.7, 0.42]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, -1.7, 0]}>
            <boxGeometry args={[0.38, 0.3, 0.38]} />
            <meshStandardMaterial color={darkColor} metalness={0.9} roughness={0.2} />
          </mesh>
        </group>

        {/* === 右臂 === */}
        <group ref={rightArmRef} position={[1.05, 2.2, 0]}>
          <mesh position={[0, -0.55, 0]}>
            <cylinderGeometry args={[0.22, 0.2, 0.7, 8]} />
            <meshStandardMaterial color={darkColor} metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, -1.25, 0]}>
            <boxGeometry args={[0.42, 0.7, 0.42]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, -1.7, 0]}>
            <boxGeometry args={[0.38, 0.3, 0.38]} />
            <meshStandardMaterial color={darkColor} metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Weapon attached to right arm */}
          {renderWeapon()}
        </group>

        {/* === 腰部 === */}
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[1.0, 0.5, 0.6]} />
          <meshStandardMaterial color={darkColor} metalness={0.8} roughness={0.3} />
        </mesh>

        {/* === 左腿 === */}
        <group ref={leftLegRef} position={[-0.4, 0.75, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.5, 0.8, 0.5]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.7, 0]}>
            <boxGeometry args={[0.45, 0.8, 0.55]} />
            <meshStandardMaterial color={darkColor} metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, -1.2, 0.1]}>
            <boxGeometry args={[0.5, 0.25, 0.8]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>

        {/* === 右腿 === */}
        <group ref={rightLegRef} position={[0.4, 0.75, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.5, 0.8, 0.5]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.7, 0]}>
            <boxGeometry args={[0.45, 0.8, 0.55]} />
            <meshStandardMaterial color={darkColor} metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, -1.2, 0.1]}>
            <boxGeometry args={[0.5, 0.25, 0.8]} />
            <meshStandardMaterial color={armorColor} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>

        {/* === 背部喷射器 === */}
        <group position={[0, 2.3, -0.45]}>
          <mesh>
            <boxGeometry args={[0.9, 1.2, 0.35]} />
            <meshStandardMaterial color={darkColor} metalness={0.8} roughness={0.3} />
          </mesh>
          <group ref={boosterRef} position={[0, -0.8, 0]}>
            <mesh position={[-0.3, 0, -0.15]}>
              <cylinderGeometry args={[0.12, 0.15, 0.3, 8]} />
              <meshStandardMaterial color={'#330000'} emissive={glowColor} emissiveIntensity={1} />
            </mesh>
            <mesh position={[0.3, 0, -0.15]}>
              <cylinderGeometry args={[0.12, 0.15, 0.3, 8]} />
              <meshStandardMaterial color={'#330000'} emissive={glowColor} emissiveIntensity={1} />
            </mesh>
          </group>
        </group>
      </group>
    )
  }
)

MechaModel.displayName = 'MechaModel'
