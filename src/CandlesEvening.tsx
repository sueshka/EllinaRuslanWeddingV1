import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import candlesImg from './assets/candles/candles.jpg'
import coupleImg from './assets/couple.jpg'
import windowImg from './assets/candles/window.jpg'
import streetImg from './assets/candles/street.jpg'
import proposalImg from './assets/proposal.jpg'
import familyImg from './assets/family.jpg'
import townImg from './assets/candles/town.jpg'
import tableImg from './assets/candles/table.jpg'
import Snow from './Snow'
import RsvpForm from './RsvpForm'
import { playCandleSound, toggleSound, unlockAudio, useSoundOn } from './audio'
import { DINNER, REGISTRATION, calendarHref, countdown, opensInNewTab, routeHref } from './event'
import { loadSaved, submitRsvp, type RsvpForm as Form, type Status } from './rsvp'
import { isTyping, useReducedMotion, useSceneGestures } from './nav'

type Scene = 0 | 1 | 2 | 3 | 4

const CAMERA = 'cubic-bezier(.55,0,.2,1)'

// Full-screen photo layers: 0 — dim candle backdrop of the loader, 1 — the couple on the cover.
// Scenes 2–4 are scrollable pages with their own photos.
const LAYERS: { img: string; style: CSSProperties }[] = [
  { img: candlesImg, style: { backgroundPosition: 'center', transformOrigin: '50% 50%' } },
  {
    // Couple photo is almost square: pin it to the top at full width and let it melt into the dark,
    // so the cover text sits below the faces. Warmed up to match the candlelight.
    img: coupleImg,
    style: {
      bottom: 'auto',
      aspectRatio: '1200 / 1430',
      backgroundPosition: 'center top',
      transformOrigin: '50% 25%',
      filter: 'sepia(.18) saturate(.85) brightness(.88) contrast(1.05)',
      WebkitMaskImage: 'linear-gradient(180deg, #000 52%, transparent 96%)',
      maskImage: 'linear-gradient(180deg, #000 52%, transparent 96%)',
    },
  },
]

/** Camera: the current shot settles at 1.06, the passed one flies into the lens, the next one comes from a close-up. */
function layerStyle(i: number, sc: Scene, reduced: boolean): CSSProperties {
  const [opacity, scale] = i === 0 ? (sc === 0 ? [0.22, 1.08] : [0, 2.6]) : i === sc ? [1, 1.06] : i > sc ? [0, 1.6] : [0, 2.5]
  return {
    opacity,
    transform: reduced ? 'none' : `scale(${scale})`,
    transition: `opacity 1.6s ease, transform 2.8s ${CAMERA}`,
  }
}

function sceneStyle(sc: Scene, i: Scene): CSSProperties {
  const on = sc === i
  const delay = on ? '1.2s' : '0s'
  return {
    opacity: on ? 1 : 0,
    transform: on ? 'translateY(0)' : sc > i ? 'translateY(-24px)' : 'translateY(24px)',
    transition: `opacity 1.4s ease ${delay}, transform 1.8s ease ${delay}`,
    pointerEvents: on && i >= 2 ? 'auto' : 'none',
  }
}

const Candle = () => (
  <div className="cd-candle" aria-hidden>
    <div className="cd-glow" />
    <div className="cd-wax" />
    <div className="cd-wick" />
    <div className="cd-flame" />
  </div>
)

const WINTERS: { img: string; n: string; text: string; style?: CSSProperties }[] = [
  { img: streetImg, n: 'I', text: 'Зимой началась наша история' },
  {
    // the real proposal photo: sunny beach — framed on both of them and toned down to sit between the dark winter shots
    img: proposalImg,
    n: 'II',
    text: 'Зимой прозвучало предложение',
    style: { backgroundPosition: '52% 60%', filter: 'sepia(.2) saturate(.9) brightness(.78) contrast(1.05)' },
  },
  {
    // the two of them together — toned like the proposal photo so the strip reads as one
    img: familyImg,
    n: 'III',
    text: 'Зимой мы станем семьёй',
    style: { backgroundPosition: '42% 22%', filter: 'sepia(.22) saturate(.85) brightness(.74) contrast(1.05)' },
  },
]

const EVENTS = [
  { time: '14:30', script: 'Станем семьёй', kind: 'ТОРЖЕСТВЕННАЯ РЕГИСТРАЦИЯ', place: 'Гостиница «Националь», зал «Суздаль»', address: 'Москва, ул. Моховая, д. 15/1, стр. 1', event: REGISTRATION },
  { time: '16:00', script: 'За одним столом', kind: 'СЕМЕЙНЫЙ УЖИН', place: 'Усадьба Милютина, зал «Версаль»', address: 'Москва, Милютинский пер., д. 14, стр. 1', event: DINNER },
]

/** Map / calendar link: web links open in a new tab, .ics files and Android app links in place */
const ActionLink = ({ href, tabIndex, children }: { href: string; tabIndex: number; children: string }) =>
  opensInNewTab(href) ? (
    <a href={href} target="_blank" rel="noreferrer" tabIndex={tabIndex}>
      {children}
    </a>
  ) : (
    <a href={href} tabIndex={tabIndex}>
      {children}
    </a>
  )

export default function CandlesEvening() {
  const reduced = useReducedMotion()
  const [ready, setReady] = useState(false)
  const [scene, setScene] = useState<Scene>(0)
  const [opening, setOpening] = useState(false)
  const sound = useSoundOn()
  const [form, setForm] = useState<Form>(() => loadSaved() ?? { name: '', attend: 'both' })
  const [status, setStatus] = useState<Status>(() => (loadSaved() ? 'success' : 'idle'))

  const timers = useRef<number[]>([])
  const pages = useRef<Record<number, HTMLElement | null>>({})

  // Loader = scene 0: "ЗАЖИГАЕМ СВЕЧИ" until fonts + the couple photo are ready
  useEffect(() => {
    let alive = true
    const load = (src: string) => {
      const img = new Image()
      img.src = src
      return img.decode().catch(() => {})
    }
    const fonts = document.fonts?.ready ?? Promise.resolve()
    const timeout = new Promise((r) => setTimeout(r, 5000))
    Promise.race([Promise.all([fonts, load(coupleImg), load(candlesImg)]), timeout]).then(() => {
      if (!alive) return
      setReady(true)
      ;[windowImg, streetImg, proposalImg, familyImg, townImg, tableImg].forEach((src) => (new Image().src = src))
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const open = useCallback(() => {
    if (scene !== 0 || opening || !ready) return
    playCandleSound()
    setOpening(true)
    timers.current.push(
      window.setTimeout(() => setScene(1), 700),
      window.setTimeout(() => setOpening(false), 2300),
    )
  }, [scene, opening, ready])

  const go = useCallback(
    (i: number) => {
      if (i < 1 || i > 4) return
      unlockAudio()
      setScene(i as Scene)
    },
    [],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (opening || isTyping(e)) return
      if (scene === 0 && (e.key === 'Enter' || e.key === ' ')) return open()
      if (scene === 0) return
      if (e.key === 'ArrowDown' || e.key === 'PageDown') go(scene + 1)
      if (e.key === 'ArrowUp' || e.key === 'PageUp') go(scene - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scene, opening, go, open])

  // Scrollable pages: leave forward only from the bottom, back only from the top
  const gestures = useSceneGestures(
    (dir, { atTop, atBottom }) => {
      if (opening) return
      if (scene === 0) return dir > 0 ? open() : undefined
      if ((dir > 0 && !atBottom) || (dir < 0 && !atTop)) return
      go(scene + dir)
    },
    () => pages.current[scene] ?? null,
  )


  const submit = async () => {
    setStatus('sending')
    try {
      await submitRsvp(form)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  const page = (i: Scene) => ({
    ref: (el: HTMLElement | null) => {
      pages.current[i] = el
    },
    className: 'scene cd-page' + (scene === i ? ' is-active' : ''),
    style: sceneStyle(scene, i),
    'aria-hidden': scene !== i,
  })
  const tab = (i: Scene) => (scene === i ? 0 : -1)
  const left = countdown()

  return (
    <main className="stage stage-candles" {...gestures}>
      {LAYERS.map(({ img, style }, i) => (
        <div key={i} className="layer" style={{ ...layerStyle(i, scene, reduced), ...style, backgroundImage: `url(${img})` }} />
      ))}
      <div className="cd-shade" />
      {ready && <Snow count={28} seed={15} still={reduced} />}

      {/* scene 0 — candle (loader, then the "open" button) */}
      <div
        className="scene cd-scene0"
        style={{ opacity: scene === 0 && !opening ? 1 : 0, pointerEvents: scene === 0 ? 'auto' : 'none', cursor: ready ? 'pointer' : 'default' }}
        onClick={open}
        role="button"
        tabIndex={scene === 0 ? 0 : -1}
        aria-label="Зажечь свечу и открыть приглашение"
      >
        <Candle />
        <div className="cd-mono">Р &amp; Э</div>
        {ready ? (
          <div className="cd-hint pulse">НАЖМИТЕ НА СВЕЧУ</div>
        ) : (
          <div className="cd-loading">
            <div className="cd-loadbar">
              <span />
            </div>
            ЗАЖИГАЕМ СВЕЧИ
          </div>
        )}
      </div>

      {/* scene 1 — cover */}
      <section className="scene cd-bottom cd-scene1" style={sceneStyle(scene, 1)} aria-hidden={scene !== 1}>
        <div className="cd-script cd-cover-title">Наша зимняя глава</div>
        <h1 className="cd-names">
          РУСЛАН
          <br />
          &amp; ЭЛЛИНА
        </h1>
        <div className="cd-date">26 ДЕКАБРЯ 2026 · МОСКВА</div>
        <p className="cd-tagline">Станем семьёй в кругу самых близких</p>
      </section>

      {/* scene 2 — window, letter, three winters */}
      <section {...page(2)}>
        <div className="cd-hero" style={{ height: 330 }}>
          <div className="cd-hero-img" style={{ backgroundImage: `url(${windowImg})` }} />
          <div className="cd-hero-fade" />
          <div className="cd-hero-mono">Р &amp; Э</div>
        </div>
        <div className="cd-letter">
          <div className="cd-kicker">ПИСЬМО БЛИЗКИМ</div>
          <p className="cd-letter-title">
            Дорогие наши близкие
            <br />и любимые!
          </p>
          <p className="cd-letter-text">
            Зимой 2024 года началась наша история. Зимой 2025 года Руслан сделал предложение. И теперь у нашей истории появится ещё одна важная зимняя дата.
          </p>
          <p className="cd-letter-text">26 декабря мы станем мужем и женой — и очень хотим, чтобы рядом были вы.</p>
          <div className="cd-script" style={{ fontSize: 34 }}>
            С любовью, Руслан и Эллина
          </div>
        </div>
        <div className="cd-winters">
          {WINTERS.map((w, i) => (
            <div key={w.n} className="cd-winter-card">
              <div className="cd-winter-img" style={{ backgroundImage: `url(${w.img})`, ...w.style }} />
              <div className={i === 2 ? 'cd-winter-caption is-italic' : 'cd-winter-caption'}>
                <span>{w.n}</span>
                <br />
                {w.text}
              </div>
            </div>
          ))}
        </div>
        <button className="cd-page-next pulse-slow" onClick={() => go(3)} tabIndex={tab(2)}>
          ДАЛЕЕ<span>⌄</span>
        </button>
      </section>

      {/* scene 3 — details */}
      <section {...page(3)}>
        <header className="cd-details-head">
          <h2>ДЕТАЛИ</h2>
          <div>Суббота, 26 декабря{left && ` · ${left}`}</div>
        </header>
        {EVENTS.map((ev, i) => (
          <Fragment key={ev.time}>
            {i > 0 && (
              <div className="cd-diamond" aria-hidden>
                <i />
                <b />
                <i />
              </div>
            )}
            <div className="cd-event">
              <div className="cd-time">{ev.time}</div>
              <div className="cd-script" style={{ fontSize: 32, color: '#f3ede3' }}>
                {ev.script}
              </div>
              <div className="cd-kind">{ev.kind}</div>
              <div className="cd-place">
                {ev.place}
                <br />
                <span>{ev.address}</span>
              </div>
              <div className="cd-actions">
                <ActionLink href={routeHref(ev.event)} tabIndex={tab(3)}>
                  МАРШРУТ
                </ActionLink>
                <ActionLink href={calendarHref(ev.event)} tabIndex={tab(3)}>
                  В КАЛЕНДАРЬ
                </ActionLink>
              </div>
            </div>
          </Fragment>
        ))}
        <div className="cd-banner">
          <div className="cd-hero-img" style={{ backgroundImage: `url(${townImg})` }} />
          <div className="cd-banner-fade" />
          <div className="cd-banner-text">
            Ждём вас рядом
            <br />в этот зимний день
          </div>
        </div>
        <button className="cd-page-next pulse-slow" onClick={() => go(4)} tabIndex={tab(3)}>
          ДАЛЕЕ<span>⌄</span>
        </button>
      </section>

      {/* scene 4 — answer */}
      <section {...page(4)}>
        <div className="cd-hero" style={{ height: 240 }}>
          <div className="cd-hero-img" style={{ backgroundImage: `url(${tableImg})`, backgroundPosition: 'center 60%' }} />
          <div className="cd-hero-fade cd-hero-fade-full" />
        </div>
        <div className="cd-rsvp">
          <h2 className="cd-script cd-rsvp-title">Будете рядом?</h2>
          <RsvpForm form={form} status={status} onChange={setForm} onSubmit={submit} />
        </div>
      </section>

      {/* persistent navigation; on scrollable pages a dark band keeps it readable over the content */}
      <div className="cd-topfade" style={{ opacity: scene >= 2 ? 1 : 0 }} aria-hidden />
      {scene === 1 && !opening && (
        <button className="next cd-next pulse-slow" onClick={() => go(2)}>
          ДАЛЕЕ<span>⌄</span>
        </button>
      )}
      {scene >= 1 && (
        <>
          <nav className="dots cd-dots" aria-label="Сцены">
            {[1, 2, 3, 4].map((i) => (
              <button key={i} onClick={() => go(i)} aria-label={`Сцена ${i}`} aria-current={i === scene ? 'step' : undefined}>
                <span className={i === scene ? 'active' : undefined} />
              </button>
            ))}
          </nav>
          <button className="sound cd-sound" onClick={toggleSound} aria-label={sound ? 'Выключить звук' : 'Включить звук'}>
            {sound ? '♪ ON' : 'OFF'}
          </button>
        </>
      )}

      {opening && <div className="cd-flare" aria-hidden />}
    </main>
  )
}
