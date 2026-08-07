import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { getTerrainHeight } from './Terrain'
import { useDialogueStore } from '../stores/dialogueStore'
import type { NpcId } from '@nexus/shared'

export interface NPCData {
  id: string
  gddId: NpcId
  name: string
  position: [number, number, number]
  color: string
  // 罐头对话：ai-server 不可用时由 cannedFallback 复用（GDD §8.12）
  dialog: string[]
  questId?: string
}

// 镇内 NPC → GDD 阵容映射（点击进入 LLM 对话）
const NPCS: NPCData[] = [
  {
    id: 'mechanic',
    gddId: 'babs',
    name: '老扳手·巴布斯',
    position: [12, 0, 8],
    color: '#ffaa00',
    dialog: [
      '欢迎来到扳手镇，小子。',
      '这台机甲……嗯，凑合。需要修就说话。',
      '东边废料场有锈爬虫，练手正好。',
    ],
    questId: 'quest_crystal',
  },
  {
    id: 'merchant',
    gddId: 'jicha',
    name: '叽喳 HX-7',
    position: [-15, 0, 5],
    color: '#ff66cc',
    dialog: [
      '叮——！尊贵的客人！看货吗？',
      '金币不够去打几台敌机就有了哐当！',
      '好装备是活命的关键——本机说的！',
    ],
  },
  {
    id: 'commander',
    gddId: 'vera',
    name: '薇拉·军需官',
    position: [0, 0, -20],
    color: '#44ff88',
    dialog: [
      '我的王牌，前线有新情况。',
      '悬赏随时更新，对你来说特价。',
      '击杀十台敌机后会出现 Boss——准备好了来找我。',
    ],
    questId: 'quest_boss',
  },
]

function NPCModel({ data }: { data: NPCData }) {
  const groupRef = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  const open = useDialogueStore((s) => s.open)
  const activeNpc = useDialogueStore((s) => s.activeNpc)
  const isActive = activeNpc === data.gddId

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = data.position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.15
      groupRef.current.rotation.y += delta * 0.3
    }
  })

  const onClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    open(data.gddId)
  }

  return (
    <group
      ref={groupRef}
      position={[data.position[0], getTerrainHeight(data.position[0], data.position[2]), data.position[2]]}
      onClick={onClick}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'default' }}
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
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color={data.color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[0.5, 1.5, 8, 16]} />
          <meshStandardMaterial color={data.color} roughness={0.6} />
        </mesh>
      </group>
      {/* Name tag */}
      <Html position={[0, 10, 0]} center distanceFactor={15}>
        <div
          style={{
            background: isActive ? data.color : 'rgba(0,0,0,0.7)',
            borderRadius: 6,
            padding: '4px 10px',
            color: isActive ? '#0a0f1e' : data.color,
            fontSize: 14,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            border: `1px solid ${data.color}88`,
            cursor: 'pointer',
            transform: hover ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.15s',
            boxShadow: isActive ? `0 0 16px ${data.color}` : 'none',
          }}
        >
          {data.name}
          {data.questId && <span style={{ color: '#ffff00', marginLeft: 6 }}>!</span>}
        </div>
      </Html>
    </group>
  )
}

export function NPCSystem() {
  return (
    <group>
      {NPCS.map((npc) => (
        <NPCModel key={npc.id} data={npc} />
      ))}
    </group>
  )
}

export { NPCS }
