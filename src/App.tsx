import { useEffect } from 'react'
import CandlesEvening from './CandlesEvening'
import { unlockAudio } from './audio'

export default function App() {
  // The song plays in the background; browsers allow it only after a tap.
  // Every tap tries (a no-op once it plays), so a tap the browser didn't count doesn't leave it silent.
  useEffect(() => {
    const events = ['touchend', 'click', 'keydown'] as const
    events.forEach((ev) => window.addEventListener(ev, unlockAudio, true))
    return () => events.forEach((ev) => window.removeEventListener(ev, unlockAudio, true))
  }, [])

  return <CandlesEvening />
}
