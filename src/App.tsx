import { useEffect, useState } from 'react'
import WinterTale from './WinterTale'
import CandlesEvening from './CandlesEvening'
import { stopAllSound, unlockAudio } from './audio'

// Hash routing: '' → template picker, #winter → «Зимняя сказка», #candles → «Вечер при свечах».
// Query params (?g=<token>) are kept, so personal links keep working.
type Route = '' | 'winter' | 'candles'

const readRoute = (): Route => {
  const h = window.location.hash.replace('#', '')
  return h === 'winter' || h === 'candles' ? h : ''
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute)

  // Inside a template the song plays in the background; browsers allow it only after a tap.
  // Every tap tries (a no-op once it plays), so a tap the browser didn't count doesn't leave it silent.
  // Back on the main screen everything stops (the template buttons start it again).
  useEffect(() => {
    if (route === '') {
      stopAllSound()
      return
    }
    const events = ['touchend', 'click', 'keydown'] as const
    events.forEach((ev) => window.addEventListener(ev, unlockAudio, true))
    return () => events.forEach((ev) => window.removeEventListener(ev, unlockAudio, true))
  }, [route])

  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (route === 'winter') return <WinterTale />
  if (route === 'candles') return <CandlesEvening />
  return <Picker />
}

function Picker() {
  return (
    <main className="picker">
      <div className="picker-head">
        <div className="picker-kicker">26 · XII · 2026</div>
        <h1 className="picker-names">
          Руслан
          <span>&amp;</span>
          Эллина
        </h1>
        <p className="picker-sub">Выберите приглашение</p>
      </div>
      <nav className="picker-buttons">
        <a className="picker-btn picker-btn-primary" href="#winter" onClick={unlockAudio}>
          Зимняя сказка
        </a>
        <a className="picker-btn" href="#candles" onClick={unlockAudio}>
          Вечер при свечах
        </a>
      </nav>
    </main>
  )
}
