import Game from './Game'
import { DialoguePanel } from './ai/DialoguePanel'
import { EchoButton } from './ai/EchoButton'
import { DirectorToast } from './ai/directorToast'

export default function App() {
  return (
    <>
      <Game />
      <DialoguePanel />
      <DirectorToast />
      <EchoButton />
    </>
  )
}
