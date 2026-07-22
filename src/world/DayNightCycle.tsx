import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../stores/gameStore'

export function DayNightCycle() {
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)

  useFrame(() => {
    const t = useGameStore.getState().world.timeOfDay // 0..24
    const angle = ((t - 6) / 24) * Math.PI * 2 // sun rises at 6:00
    const sunY = Math.sin(angle) * 100
    const sunX = Math.cos(angle) * 100
    const dayFactor = Math.max(0, Math.min(1, Math.sin(angle)))

    if (sunRef.current) {
      sunRef.current.position.set(sunX, sunY, 50)
      sunRef.current.intensity = dayFactor * 2 + 0.2
      // Sunset/sunrise = warm orange
      const warm = dayFactor < 0.3
      sunRef.current.color.setHSL(
        warm ? 0.05 : 0.1,
        warm ? 0.8 : 0.3,
        0.5
      )
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = 0.15 + dayFactor * 0.3
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = 0.2 + dayFactor * 0.3
    }
  })

  return (
    <>
      <directionalLight
        ref={sunRef}
        
      />
      <ambientLight ref={ambientRef} intensity={0.3} />
      <hemisphereLight ref={hemiRef} color="#87CEEB" groundColor="#3a3a3a" intensity={0.4} />
    </>
  )
}

// Advance time of day slowly
export function useTimeAdvancement() {
  useFrame((_, dt) => {
    const store = useGameStore.getState()
    if (!store.world.paused) {
      const newTime = (store.world.timeOfDay + dt * 0.05) % 24 // full day = 480s = 8min
      useGameStore.setState((s) => ({
        world: { ...s.world, timeOfDay: newTime }
      }))
    }
  })
}
