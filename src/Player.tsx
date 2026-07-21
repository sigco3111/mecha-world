import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { MechaModel } from './MechaModel'

// 键盘输入状态
const keys: Record<string, boolean> = {}

export function useKeyboardControls() {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent, down: boolean) => {
      keys[e.code] = down
    }
    const kd = (e: KeyboardEvent) => handleKey(e, true)
    const ku = (e: KeyboardEvent) => handleKey(e, false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])
  return keys
}

interface PlayerProps {
  onPositionUpdate?: (pos: THREE.Vector3) => void
}

export function Player({ onPositionUpdate }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const velocity = useRef(new THREE.Vector3())
  const { camera } = useThree()
  const keys = useKeyboardControls()

  // 相机参数
  const cameraOffset = useRef(new THREE.Vector3(0, 6, 12))
  const cameraTarget = useRef(new THREE.Vector3())
  const smoothCameraPos = useRef(new THREE.Vector3(0, 10, 20))

  // 鼠标控制视角
  const mouseControl = useRef({ x: 0, y: 0, active: false })
  const cameraAngle = useRef({ theta: 0, phi: 0.3 }) // 水平角，俯仰角

  useEffect(() => {
    const onMouseDown = () => { mouseControl.current.active = true }
    const onMouseUp = () => { mouseControl.current.active = false }
    const onMouseMove = (e: MouseEvent) => {
      if (mouseControl.current.active) {
        cameraAngle.current.theta -= e.movementX * 0.005
        cameraAngle.current.phi = Math.max(0.05, Math.min(1.2, cameraAngle.current.phi + e.movementY * 0.005))
      }
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  useFrame((state, delta) => {
    const g = groupRef.current
    if (!g) return
    const dt = Math.min(delta, 0.05) // 防止大跳变

    // === 输入 ===
    const forward = (keys['KeyW'] || keys['ArrowUp']) ? 1 : 0
    const back = (keys['KeyS'] || keys['ArrowDown']) ? 1 : 0
    const left = (keys['KeyA'] || keys['ArrowLeft']) ? 1 : 0
    const right = (keys['KeyD'] || keys['ArrowRight']) ? 1 : 0
    const jump = keys['Space'] || false
    const boost = keys['ShiftLeft'] || keys['ShiftRight'] || false

    // === 相机方向计算 ===
    const angle = cameraAngle.current.theta
    const forwardDir = new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle))
    const rightDir = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle))

    // === 移动输入 ===
    const moveDir = new THREE.Vector3()
    moveDir.addScaledVector(forwardDir, forward - back)
    moveDir.addScaledVector(rightDir, right - left)
    if (moveDir.lengthSq() > 0) moveDir.normalize()

    const speed = boost ? 25 : 12

    // === 水平移动 ===
    velocity.current.x = moveDir.x * speed
    velocity.current.z = moveDir.z * speed

    // === 跳跃/喷气 ===
    if (jump) {
      velocity.current.y = Math.min(velocity.current.y + 1.5, 15) // 喷气上升
    } else {
      velocity.current.y -= 30 * dt // 重力
    }

    // === 应用速度 ===
    g.position.x += velocity.current.x * dt
    g.position.y += velocity.current.y * dt
    g.position.z += velocity.current.z * dt

    // 地面碰撞
    if (g.position.y <= 0) {
      g.position.y = 0
      velocity.current.y = 0
    }
    // 天花板
    if (g.position.y > 30) {
      g.position.y = 30
      velocity.current.y = 0
    }

    // === 角色朝向 ===
    if (moveDir.lengthSq() > 0.1) {
      const targetAngle = Math.atan2(moveDir.x, moveDir.z)
      // 平滑旋转
      let diff = targetAngle - g.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      g.rotation.y += diff * 0.15
    }

    // === 移动时的走路抖动 ===
    if (moveDir.lengthSq() > 0.1 && g.position.y < 0.1) {
      const t = state.clock.elapsedTime
      g.position.y = Math.abs(Math.sin(t * 10)) * 0.15
    }

    // === 第三人称相机跟随 ===
    const phi = cameraAngle.current.phi
    const distance = 12
    const camHeight = Math.sin(phi) * distance
    const camDistance = Math.cos(phi) * distance

    const desiredPos = new THREE.Vector3(
      g.position.x - forwardDir.x * camDistance,
      g.position.y + camHeight,
      g.position.z - forwardDir.z * camDistance
    )

    smoothCameraPos.current.lerp(desiredPos, 0.1)
    camera.position.copy(smoothCameraPos.current)

    cameraTarget.current.lerp(
      new THREE.Vector3(g.position.x, g.position.y + 2.5, g.position.z),
      0.15
    )
    camera.lookAt(cameraTarget.current)

    // 回调
    if (onPositionUpdate) onPositionUpdate(g.position)
  })

  return (
    <group ref={groupRef}>
      <MechaModel color="#4a9eff" />
    </group>
  )
}
