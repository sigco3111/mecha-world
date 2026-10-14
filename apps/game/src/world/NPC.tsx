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
    name: '바브스·베테랑 정비공',
    position: [12, 0, 8],
    color: '#ffaa00',
    dialog: [
      '렌치 타운에 온 걸 환영해, 꼬마.',
      '이 메카... 뭐, 쓸 만하군. 수리가 필요하면 말해.',
      '동쪽 폐기장에 녹슨 벌레가 있어. 연습하기 좋지.',
    ],
    questId: 'quest_crystal',
  },
  {
    id: 'merchant',
    gddId: 'jicha',
    name: '지차 HX-7',
    position: [-15, 0, 5],
    color: '#ff66cc',
    dialog: [
      '딩! 귀한 손님! 물건 좀 볼까요?',
      '골드가 모자라면 적 메카 몇 대를 잡으세요! 쾅!',
      '좋은 장비가 생존의 열쇠예요! 제가 보증해요!',
    ],
  },
  {
    id: 'commander',
    gddId: 'vera',
    name: '베라·군수 담당관',
    position: [0, 0, -20],
    color: '#44ff88',
    dialog: [
      '우리 에이스, 전선에 새 소식이 있어.',
      '현상금은 계속 갱신돼. 네겐 특별가야.',
      '적 메카 10대를 처치하면 보스가 나타나. 준비되면 날 찾아와.',
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
