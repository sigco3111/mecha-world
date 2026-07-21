import { useMemo } from 'react'
import * as THREE from 'three'

// LOD hook: reduce geometry detail based on distance
export function useLOD(ref: React.RefObject<THREE.Object3D>, distances: [number, number]) {
  // Will be used by individual meshes for distance-based culling
  // For now, R3F handles basic frustum culling automatically
}

// Instanced mesh helper for rendering many identical objects (trees, rocks)
export function InstancedProps({ count, positions, renderFn }: {
  count: number
  positions: Float32Array
  renderFn: (i: number) => React.ReactElement
}) {
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const x = positions[i * 3]
      const y = positions[i * 3 + 1]
      const z = positions[i * 3 + 2]
      return <group key={i} position={[x, y, z]}>{renderFn(i)}</group>
    })
  }, [count, positions, renderFn])
}

// Frame rate manager — dynamically adjust quality
export class QualityManager {
  static instance: QualityManager
  fps: number = 60
  private frameTimes: number[] = []

  update(deltaTime: number) {
    this.frameTimes.push(deltaTime)
    if (this.frameTimes.length > 60) this.frameTimes.shift()
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    this.fps = Math.round(1 / avg)
  }

  getQuality(): 'high' | 'medium' | 'low' {
    if (this.fps >= 50) return 'high'
    if (this.fps >= 30) return 'medium'
    return 'low'
  }
}

// Adaptive DPR — lower resolution on slow devices
export function useAdaptiveDPR() {
  // This will be plugged into Canvas dpr prop
  return [1, 1.5] as [number, number]
}
