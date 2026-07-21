import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useGameStore } from '../stores/gameStore'

export interface NPCData {
  id: string
  name: string
  position: [number, number, number]
  color: string
  dialog: string[]
  questId?: string
}

export const NPCS: NPCData[] = [
  {
    id: 'mechanic',
    name: '老技师 REX',
    position: [12, 0, 8],
    color: '#ffaa00',
    dialog: [
      '欢迎来到废铁镇，年轻的驾驶员。',
      '这台机甲看起来不错，但需要升级。',
      '去东边的水晶峡谷找些能量水晶，我帮你强化装备！',
    ],
    questId: 'quest_crystal',
  },
  {
    id: 'merchant',
    name: '商人 MIRA',
    position: [-15, 0, 5],
    color: '#44ff88',
    dialog: [
      '嘿！看看我的商品吧！',
      '金币不够？去打几台敌机就有了。',
      '记住——好装备是活命的关键。',
    ],
  },
  {
    id: 'commander',
    name: '指挥官 KANE',
    position: [0, 0, -20],
    color: '#ff4444',
    dialog: [
      '前线战况紧急！',
      '波次攻击越来越猛，我们需要你。',
      '击杀10台敌机后会出现Boss——准备好了就来找我。',
    ],
    questId: 'quest_boss',
  },
]

function NPCModel({ data, onClick }: { data: NPCData; onClick: () => void }) {
  const groupRef = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)

  // Bob up and down
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = data.position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.15
      groupRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <group
      ref={groupRef}
      position={data.position}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      {/* NPC marker pole */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3]} />
        <meshStandardMaterial color="#ffffff" emissive={data.color} emissiveIntensity={2} />
      </mesh>
      {/* Floating icon sphere */}
      <mesh position={[0, 8, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={1} />
      </mesh>
      {/* NPC body (humanoid silhouette) */}
      <group position={[0, 1.5, 0]}>
        {/* Head */}
        <mesh castShadow position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color={data.color} roughness={0.6} />
        </mesh>
        {/* Body */}
        <mesh castShadow position={[0, 0, 0]}>
          <capsuleGeometry args={[0.5, 1.5, 8, 16]} />
          <meshStandardMaterial color={data.color} roughness={0.6} />
        </mesh>
      </group>
      {/* Name tag */}
      <Html position={[0, 10, 0]} center distanceFactor={15}>
        <div style={{
          background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '4px 10px',
          color: data.color, fontSize: 14, fontFamily: 'monospace', whiteSpace: 'nowrap',
          border: `1px solid ${data.color}88`, cursor: 'pointer',
          transform: hover ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.15s',
        }}>
          {data.name}
          {data.questId && <span style={{ color: '#ffff00', marginLeft: 6 }}>!</span>}
        </div>
      </Html>
    </group>
  )
}

export function NPCSystem() {
  const [activeNPC, setActiveNPC] = useState<string | null>(null)
  const [dialogIndex, setDialogIndex] = useState(0)
  const setUIState = useGameStore(s => s.setUIState)

  const handleNPCClick = (npcId: string) => {
    setActiveNPC(npcId)
    setDialogIndex(0)
  }

  const activeData = NPCS.find(n => n.id === activeNPC)

  const nextDialog = () => {
    if (!activeData) return
    if (dialogIndex < activeData.dialog.length - 1) {
      setDialogIndex(dialogIndex + 1)
    } else {
      setActiveNPC(null)
      setDialogIndex(0)
    }
  }

  return (
    <group>
      {NPCS.map(npc => (
        <NPCModel key={npc.id} data={npc} onClick={() => handleNPCClick(npc.id)} />
      ))}
      {/* Dialog overlay */}
      {activeData && (
        <Html position={activeData.position} center distanceFactor={10}>
          <div
            onClick={nextDialog}
            style={{
              background: 'rgba(10,15,30,0.95)', borderRadius: 12, padding: 16,
              width: 300, color: '#ffffff', fontFamily: 'monospace',
              border: `2px solid ${activeData.color}`, cursor: 'pointer',
              boxShadow: `0 0 20px ${activeData.color}44`,
            }}
          >
            <div style={{ color: activeData.color, fontWeight: 'bold', marginBottom: 8 }}>
              {activeData.name}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: '#ccccee' }}>
              {activeData.dialog[dialogIndex]}
            </div>
            <div style={{ textAlign: 'right', marginTop: 8, fontSize: 11, color: '#666688' }}>
              {dialogIndex < activeData.dialog.length - 1 ? '点击继续 ▶' : '点击关闭 ✕'}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
