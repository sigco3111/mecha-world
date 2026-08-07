import { Terrain } from './Terrain'
import { EnvironmentProps } from './EnvironmentProps'
import { DayNightCycle, useTimeAdvancement } from './DayNightCycle'
import { WeatherSystem, WeatherFog } from './WeatherSystem'
import { NPCSystem } from './NPC'

export function WorldManager() {
  // Advance time of day
  useTimeAdvancement()

  return (
    <>
      <WeatherFog />
      <DayNightCycle />
      <Terrain />
      <EnvironmentProps />
      <NPCSystem />
      <WeatherSystem />
    </>
  )
}
