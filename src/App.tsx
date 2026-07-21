import { useState } from 'react'
import Game from './Game'
import { LoadingScreen } from './ui/LoadingScreen'

export default function App() {
  const [loaded, setLoaded] = useState(false)

  if (!loaded) {
    return <LoadingScreen onDone={() => setLoaded(true)} />
  }

  return <Game />
}
