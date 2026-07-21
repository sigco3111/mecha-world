import { Canvas } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import { Suspense, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { Player } from './Player'
import { WorldManager } from './world/WorldManager'
import { MiniMap } from './world/MiniMap'
import { LevelBar } from './rpg/LevelBar'
import { InventoryPanel } from './rpg/InventoryPanel'
import { QuestPanel } from './rpg/QuestPanel'
import { MechaSelectPanel } from './rpg/MechaSelectPanel'
import { useRPGStore, rollLoot } from './rpg/rpgStore'
import { ProjectileRenderer, ImpactRenderer } from './Effects'
import { BattleHUD } from './BattleHUD'
import { TouchControls } from './controls/TouchControls'
import { EnemySystem } from './enemies/EnemySystem'
import { EnemySpawner, spawnBoss } from './enemies/Spawner'
import { useEnemyStore } from './stores/enemyStore'
import { useGameStore } from './stores/gameStore'
import { useEffect, useState } from 'react'

;(window as any).THREE = THREE
;(window as any).spawnBoss = () => spawnBoss()

export default function Game() {
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 0))
  const killCount = useEnemyStore(s => s.killCount)
  const waveNumber = useEnemyStore(s => s.waveNumber)
  const playerScore = useGameStore(s => s.player.score)
  const [showInventory, setShowInventory] = useState(false)
  const [showQuests, setShowQuests] = useState(false)
  const [showMechas, setShowMechas] = useState(false)

  // Spawn boss when 10 kills reached
  useEffect(() => {
    if (killCount === 10) {
      spawnBoss()
    }
    // Award RPG rewards on each kill
    if (killCount > 0) {
      const rpg = useRPGStore.getState()
      const loot = rollLoot('enemy')
      rpg.addGold(loot.gold)
      rpg.addExp(loot.exp)
      if (loot.item) rpg.addItem(loot.item)
      rpg.updateQuest('q_kill5', 1)
    }
  }, [killCount])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0a1a' }}>
      {/* HUD: controls hint */}
      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 100,
        color: '#00ffff', fontFamily: 'monospace', fontSize: '12px',
        textShadow: '0 0 10px rgba(0,255,255,0.5)', pointerEvents: 'none', lineHeight: 1.8,
      }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: 8 }}>MECHA WORLD</div>
        <div style={{ color: '#88aaff' }}>WASD — 移动</div>
        <div style={{ color: '#88aaff' }}>SHIFT — 冲刺 | SPACE — 喷气</div>
        <div style={{ color: '#ff4444' }}>J / 左键 — 近战 | K / 右键 — 射击</div>
        <div style={{ color: '#88aaff' }}>鼠标拖拽 — 视角</div>
      </div>

      {/* Right HUD: stats */}
      <div style={{
        position: 'absolute', top: 20, right: 20, zIndex: 100,
        color: '#00ffff', fontFamily: 'monospace', fontSize: '12px',
        textShadow: '0 0 10px rgba(0,255,255,0.5)', pointerEvents: 'none', textAlign: 'right',
      }}>
        <div style={{ marginBottom: 4, fontSize: 14 }}>RYZER-X</div>
        <div style={{ color: '#ffaa00' }}>击杀: {killCount}</div>
        <div style={{ color: '#88aaff' }}>Wave: {waveNumber}</div>
        <div style={{ marginTop: 8, fontSize: 10, color: '#446688' }}>
          击杀10个敌人触发Boss
        </div>
      </div>

      <BattleHUD />
      <MiniMap />
      <LevelBar />
      <TouchControls />

      {/* RPG Menu buttons — bottom center */}
      <div style={{
        position: 'absolute', bottom: 25, left: '50%', transform: 'translateX(-50%)',
        zIndex: 95, display: 'flex', gap: 8,
      }}>
        <MenuBtn icon="📦" label="背包" onClick={() => setShowInventory(true)} />
        <MenuBtn icon="⚡" label="任务" onClick={() => setShowQuests(true)} />
        <MenuBtn icon="🤖" label="机甲" onClick={() => setShowMechas(true)} />
      </div>

      {/* RPG Panels */}
      {showInventory && <InventoryPanel onClose={() => setShowInventory(false)} />}
      {showQuests && <QuestPanel onClose={() => setShowQuests(false)} />}
      {showMechas && <MechaSelectPanel onClose={() => setShowMechas(false)} />}

      <Canvas
        shadows
        frameloop="always"
        camera={{ fov: 60, near: 0.1, far: 500, position: [0, 10, 20] }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        onCreated={(state) => { console.log("R3F READY", state.scene.children.length, "children") }}
      >
        <color attach="background" args={['#0a0a1a']} />
        <fog attach="fog" args={['#0a0a1a', 50, 150]} />

        <Suspense fallback={null}>
          <ambientLight intensity={0.3} color="#334466" />
          <directionalLight
            position={[30, 50, 20]} intensity={1.5} color="#ffeecc"
            castShadow
            shadow-mapSize-width={2048} shadow-mapSize-height={2048}
            shadow-camera-left={-50} shadow-camera-right={50}
            shadow-camera-top={50} shadow-camera-bottom={-50}
            shadow-camera-near={0.1} shadow-camera-far={150}
          />
          <pointLight position={[0, 20, 0]} intensity={0.5} color="#00aaff" distance={60} />
          <hemisphereLight args={['#4466aa', '#221133', 0.4]} />

          <Sky distance={450000} sunPosition={[30, 20, 10]} turbidity={6} rayleigh={2} />
          <Stars radius={200} depth={60} count={3000} factor={4} fade speed={0.5} />

          <WorldManager />

          <EnemySystem playerPosRef={playerPosRef} />
          <EnemySpawner playerPosRef={playerPosRef} />

          <ProjectileRenderer />
          <ImpactRenderer />

          <Player playerPosRef={playerPosRef} />
        </Suspense>
      </Canvas>
    </div>
  )
}

function MenuBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 56, height: 56, borderRadius: 10,
        background: 'rgba(10,15,30,0.7)', border: '1px solid rgba(0,255,255,0.3)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', userSelect: 'none', backdropFilter: 'blur(4px)',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00ffff'; e.currentTarget.style.background = 'rgba(0,100,200,0.2)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,255,255,0.3)'; e.currentTarget.style.background = 'rgba(10,15,30,0.7)' }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 9, color: '#88aaff', marginTop: 2 }}>{label}</span>
    </div>
  )
}
