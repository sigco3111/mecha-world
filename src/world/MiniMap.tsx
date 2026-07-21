import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../stores/gameStore'
import { useEnemyStore } from '../stores/enemyStore'
import { getBiomeAt, type BiomeType } from './Terrain'
import { NPCS } from './NPC'

const biomeMiniColors: Record<BiomeType, string> = {
  plains: '#2a4a2a',
  desert: '#8a7a3a',
  crystal: '#4a3a6a',
  volcanic: '#4a1a1a',
  snow: '#9aaaba',
}

export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let raf = 0
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) { raf = requestAnimationFrame(draw); return }
      const ctx = canvas.getContext('2d')!
      const W = canvas.width
      const H = canvas.height
      const scale = W / 300 // world units mapped to minimap
      const playerPos = useGameStore.getState().player.position

      ctx.clearRect(0, 0, W, H)

      // Background: biome colors
      const cellSize = 4
      for (let mx = 0; mx < W; mx += cellSize) {
        for (let my = 0; my < H; my += cellSize) {
          const wx = (mx - W / 2) / scale + playerPos[0]
          const wz = (my - H / 2) / scale + playerPos[2]
          const biome = getBiomeAt(wx, wz)
          ctx.fillStyle = biomeMiniColors[biome]
          ctx.fillRect(mx, my, cellSize, cellSize)
        }
      }

      // Enemies
      const enemies = useEnemyStore.getState().enemies
      for (const e of enemies) {
        const dx = (e.position[0] - playerPos[0]) * scale + W / 2
        const dy = (e.position[2] - playerPos[2]) * scale + H / 2
        if (dx >= 0 && dx < W && dy >= 0 && dy < H) {
          ctx.fillStyle = e.type === 'boss' ? '#ff00ff' : '#ff4444'
          ctx.beginPath()
          ctx.arc(dx, dy, e.type === 'boss' ? 4 : 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // NPCs
      for (const npc of NPCS) {
        const dx = (npc.position[0] - playerPos[0]) * scale + W / 2
        const dy = (npc.position[2] - playerPos[2]) * scale + H / 2
        if (dx >= 0 && dx < W && dy >= 0 && dy < H) {
          ctx.fillStyle = '#ffff00'
          ctx.fillRect(dx - 2, dy - 2, 4, 4)
        }
      }

      // Player (center, always)
      ctx.fillStyle = '#00ffff'
      ctx.beginPath()
      ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.stroke()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, zIndex: 90,
      borderRadius: 8, overflow: 'hidden',
      border: '2px solid rgba(0,255,255,0.4)',
      boxShadow: '0 0 15px rgba(0,0,0,0.5)',
    }}>
      <canvas ref={canvasRef} width={150} height={150} style={{ display: 'block' }} />
      <div style={{
        position: 'absolute', bottom: 2, left: 0, right: 0,
        textAlign: 'center', fontSize: 9, fontFamily: 'monospace', color: '#88aaff',
        background: 'rgba(0,0,0,0.5)',
      }}>
        MAP
      </div>
    </div>
  )
}
