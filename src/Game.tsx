import { Canvas } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import { Suspense } from 'react'
import { Player } from './Player'
import { Ground, Obstacles, FloatingParticles } from './Environment'

export default function Game() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0a1a' }}>
      {/* === HUD === */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 100,
        color: '#00ffff',
        fontFamily: 'monospace',
        fontSize: '14px',
        textShadow: '0 0 10px rgba(0,255,255,0.8)',
        pointerEvents: 'none',
        lineHeight: 1.8,
      }}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: 8 }}>MECHA WORLD</div>
        <div style={{ color: '#88aaff' }}>WASD — 移动</div>
        <div style={{ color: '#88aaff' }}>SHIFT — 加速冲刺</div>
        <div style={{ color: '#88aaff' }}>SPACE — 喷气飞行</div>
        <div style={{ color: '#88aaff' }}>鼠标拖拽 — 转视角</div>
      </div>

      {/* 右上角状态 */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 100,
        color: '#00ffff',
        fontFamily: 'monospace',
        fontSize: '12px',
        textShadow: '0 0 10px rgba(0,255,255,0.5)',
        pointerEvents: 'none',
        textAlign: 'right',
      }}>
        <div style={{ marginBottom: 6 }}>机甲: RYZER-X</div>
        <div style={{ color: '#88aaff' }}>装甲: 100%</div>
        <div style={{ color: '#88aaff' }}>能量: 87%</div>
      </div>

      {/* 底部准星 */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        color: 'rgba(0,255,255,0.3)',
        fontSize: '24px',
        fontFamily: 'monospace',
        pointerEvents: 'none',
      }}>
        ◇
      </div>

      {/* === 3D Canvas === */}
      <Canvas
        shadows
        camera={{ fov: 60, near: 0.1, far: 500, position: [0, 10, 20] }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0a1a']} />
        <fog attach="fog" args={['#0a0a1a', 50, 150]} />

        <Suspense fallback={null}>
          {/* 灯光 */}
          <ambientLight intensity={0.3} color="#334466" />
          <directionalLight
            position={[30, 50, 20]}
            intensity={1.5}
            color="#ffeecc"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
            shadow-camera-near={0.1}
            shadow-camera-far={150}
          />
          {/* 辅助光 */}
          <pointLight position={[0, 20, 0]} intensity={0.5} color="#00aaff" distance={60} />
          <hemisphereLight args={['#4466aa', '#221133', 0.4]} />

          {/* 天空 */}
          <Sky distance={450000} sunPosition={[30, 20, 10]} turbidity={6} rayleigh={2} />

          {/* 星空 */}
          <Stars radius={200} depth={60} count={3000} factor={4} fade speed={0.5} />

          {/* 场景内容 */}
          <Ground />
          <Obstacles />
          <FloatingParticles />

          {/* 玩家 */}
          <Player />
        </Suspense>
      </Canvas>
    </div>
  )
}
