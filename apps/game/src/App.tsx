import { useEffect, useState } from 'react'
import Game from './Game'
import { DialoguePanel } from './ai/DialoguePanel'
import { EchoButton } from './ai/EchoButton'
import { DirectorToast } from './ai/directorToast'
import { DevDashboard } from './ai/devDashboard'

export default function App() {
  const [dev, setDev] = useState(false)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('dev') === '1') setDev(true)
  }, [])
  return (
    <>
      <Game />
      <DialoguePanel />
      <DirectorToast />
      <EchoButton />
      {dev && <DevDashboard onClose={() => setDev(false)} />}
    </>
  )
}
