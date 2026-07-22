import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../stores/gameStore'

export function WeatherSystem() {
  const weather = useGameStore(s => s.world.weather)
  const particleRef = useRef<THREE.Points>(null)

  const { positions } = useMemo(() => {
    const count = 800
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80
      pos[i * 3 + 1] = Math.random() * 40
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80
      vel[i * 3] = (Math.random() - 0.5) * 2
      vel[i * 3 + 1] = -Math.random() * 20 - 5
      vel[i * 3 + 2] = (Math.random() - 0.5) * 2
    }
    return { positions: pos }
  }, [])

  // Determine particle visual based on weather
  const config = useMemo(() => {
    switch (weather) {
      case 'rain': return { color: '#88aaff', size: 0.15, opacity: 0.6, count: 800 }
      case 'storm': return { color: '#4466ff', size: 0.2, opacity: 0.7, count: 1000 }
      case 'snow': return { color: '#ffffff', size: 0.4, opacity: 0.8, count: 500 }
      case 'sandstorm': return { color: '#ccaa44', size: 0.3, opacity: 0.5, count: 600 }
      default: return { color: '#ffffff', size: 0, opacity: 0, count: 0 }
    }
  }, [weather])

  useFrame((state, dt) => {
    if (!particleRef.current || weather === 'clear') return
    const posAttr = particleRef.current.geometry.attributes.position
    const playerPos = state.camera.position

    for (let i = 0; i < posAttr.count; i++) {
      let x = posAttr.getX(i)
      let y = posAttr.getY(i)
      let z = posAttr.getZ(i)

      if (weather === 'snow') {
        x += Math.sin(state.clock.elapsedTime + i) * dt * 0.5
        y -= dt * 2
      } else if (weather === 'sandstorm') {
        x += dt * 15
        y += Math.sin(i) * dt * 2
      } else {
        // rain / storm
        y -= dt * 25
      }

      // Reset particle when below ground
      if (y < -2) {
        y = 35 + Math.random() * 10
        x = playerPos.x + (Math.random() - 0.5) * 80
        z = playerPos.z + (Math.random() - 0.5) * 80
      }

      posAttr.setXYZ(i, x, y, z)
    }
    posAttr.needsUpdate = true
  })

  if (weather === 'clear') return null

  return (
    <points ref={particleRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={config.count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color={config.color}
        size={config.size}
        transparent
        opacity={config.opacity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

// Fog controller — adjusts scene fog based on weather
export function WeatherFog() {
  const weather = useGameStore(s => s.world.weather)
  const fogConfig = useMemo(() => {
    switch (weather) {
      case 'storm': return { color: '#334466', near: 5, far: 60 }
      case 'sandstorm': return { color: '#ccaa66', near: 3, far: 40 }
      case 'rain': return { color: '#556677', near: 10, far: 80 }
      case 'snow': return { color: '#aabbcc', near: 8, far: 70 }
      default: return { color: '#aabbcc', near: 50, far: 250 }
    }
  }, [weather])

  return <fog attach="fog" args={[fogConfig.color, fogConfig.near, fogConfig.far]} />
}
