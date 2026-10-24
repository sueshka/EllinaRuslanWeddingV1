import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import castleImg from './assets/castle.jpg'
import windowImg from './assets/window.jpg'
import hallImg from './assets/hall.jpg'
import tableImg from './assets/table.jpg'
import coupleImg from './assets/couple.jpg'
import Snow from './Snow'
import RsvpSheet from './RsvpSheet'
import { startWind, toggleSound, unlockAudio, useSoundOn } from './audio'
import { ROUTE_URL, downloadIcs } from './event'
import { loadSaved, submitRsvp, type RsvpForm, type Status } from './rsvp'
import { isTyping, useReducedMotion, useSceneGestures } from './nav'

type Scene = 0 | 1 | 2 | 3 | 4
type Book = null | 'closed' | 'open'

const CAMERA = 'cubic-bezier(.55,0,.2,1)'

/** Background "camera": the outgoing layer flies in (big scale), the incoming one settles to ~1.05. */
function layerStyles(sc: Scene, intro: boolean, reduced: boolean) {
  const lay = (opacity: number, scale: number, fade = '1.6s'): CSSProperties => ({
    opacity,
    transform: reduced ? 'none' : `scale(${scale})`,
    transition: `opacity ${fade} ease, transform 2.8s ${CAMERA}`,
  })
  return {
    castle: sc === 0 ? lay(intro ? 0.85 : 0, intro ? 1.06 : 1.18, '4.5s') : sc === 1 ? lay(1, 1.14) : lay(0, 3.4, '1.4s'),
    window: sc < 2 ? lay(0, 1.7) : sc === 2 ? lay(1, 1.06) : lay(0, 2.6),
    hall: sc < 3 ? lay(0, 1.6) : sc === 3 ? lay(1, 1.05) : lay(0, 1.4),
    table: sc < 4 ? lay(0, 1.4) : lay(1, 1.06),
  }
}

function sceneStyle(sc: Scene, i: Scene): CSSProperties {
  const on = sc === i
  const delay = on ? (i === 1 ? '1.6s' : '1.3s') : '0s'
  return {
    opacity: on ? 1 : 0,
    transform: on ? 'translateY(0)' : sc > i ? 'translateY(-24px)' : 'translateY(24px)',
    transition: `opacity 1.4s ease ${delay}, transform 1.8s ease ${delay}`,
    pointerEvents: on && i === 4 ? 'auto' : 'none',
  }
}

const Ornament = ({ line }: { line: number }) => (
  <div className="ornament" aria-hidden>
    <i style={{ width: line }} />
    <b />
    <i style={{ width: line }} />
  </div>
)

const Monogram = ({ size, amp, color, gap = 6 }: { size: number; amp: number; color: string; gap?: number }) => (
  <div className="monogram" style={{ fontSize: size, color }}>
    R<span style={{ fontSize: amp, margin: `0 ${gap}px` }}>&amp;</span>E
  </div>
)

export default function WinterTale() {
  const reduced = useReducedMotion()
  const [ready, setReady] = useState(false)
  const [intro, setIntro] = useState(false)
  const [scene, setScene] = useState<Scene>(0)
  const [book, setBook] = useState<Book>(null)
  const sound = useSoundOn()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<RsvpForm>(() => loadSaved() ?? { name: '', attend: 'both' })
  const [status, setStatus] = useState<Status>(() => (loadSaved() ? 'success' : 'idle'))

  const timers = useRef<number[]>([])
  const detailsRef = useRef<HTMLDivElement>(null)

  // Loader = black screen until fonts + castle photo are ready
  useEffect(() => {
    let alive = true
    const img = new Image()
    img.src = castleImg
    const imgReady = img.decode().catch(() => {})
    const fonts = document.fonts?.ready ?? Promise.resolve()
    const timeout = new Promise((r) => setTimeout(r, 5000))
    Promise.race([Promise.all([fonts, imgReady]), timeout]).then(() => {
      if (!alive) return
      setReady(true)
      ;[windowImg, hallImg, tableImg, coupleImg].forEach((src) => (new Image().src = src))
      timers.current.push(window.setTimeout(() => setIntro(true), 200))
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const openBook = useCallback(() => {
    if (scene !== 0 || book || !ready) return
    startWind()
    setBook('closed')
    timers.current.push(
      window.setTimeout(() => setScene(1), 650),
      window.setTimeout(() => setBook('open'), 750),
      window.setTimeout(() => setBook(null), 2700),
    )
  }, [scene, book, ready])

  const go = useCallback(
    (i: number) => {
      if (i < 1 || i > 4) return
      unlockAudio()
      setSheetOpen(false)
      setScene(i as Scene)
    },
    [],
  )

  // Keyboard navigation (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheetOpen || book || isTyping(e)) return
      if (scene === 0 && (e.key === 'Enter' || e.key === ' ')) return openBook()
      if (scene === 0) return
      if (e.key === 'ArrowDown' || e.key === 'PageDown') go(scene + 1)
      if (e.key === 'ArrowUp' || e.key === 'PageUp') go(scene - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scene, sheetOpen, book, go, openBook])

  // Swipe / wheel. On the details scene only "back from the very top" leaves it.
  const gestures = useSceneGestures(
    (dir, { atTop }) => {
      if (sheetOpen || book) return
      if (scene === 0) return dir > 0 ? openBook() : undefined
      if (scene === 4 && !(dir < 0 && atTop)) return
      go(scene + dir)
    },
    () => detailsRef.current,
  )

  const submit = async () => {
    setStatus('sending')
    try {
      await submitRsvp(form)
      setStatus('success')
      setSheetOpen(false)
    } catch {
      setStatus('error')
    }
  }

  const L = layerStyles(scene, intro, reduced)
  const introOn = scene === 0 && intro

  return (
    <main className="stage" {...gestures}>
      {/* background layers */}
      <div className="layer" style={{ ...L.castle, backgroundImage: `url(${castleImg})`, transformOrigin: '50% 64%', filter: 'saturate(.85) contrast(1.05)' }} />
      <div className="layer" style={{ ...L.window, backgroundImage: `url(${windowImg})` }} />
      <div className="layer" style={{ ...L.hall, backgroundImage: `url(${hallImg})`, transformOrigin: '50% 55%' }} />
      <div className="layer" style={{ ...L.table, backgroundImage: `url(${tableImg})`, backgroundPosition: 'center 55%' }} />
      <div className="shade" />
      {ready && <Snow still={reduced} />}

      {/* scene 0 — link opened */}
      <div
        className="scene scene0"
        style={{ opacity: scene === 0 ? 1 : 0, pointerEvents: scene === 0 ? 'auto' : 'none' }}
        onClick={openBook}
        role="button"
        tabIndex={scene === 0 ? 0 : -1}
        aria-label="Открыть приглашение"
      >
        <div
          className="intro-names"
          style={{ opacity: introOn ? 1 : 0, transform: intro ? 'translateY(0)' : 'translateY(14px)' }}
        >
          <div className="vline" />
          <h1 className="intro-title">
            RUSLAN
            <br />
            &amp; ELLINA
          </h1>
          <div className="intro-date">26 December 2026 · Moscow</div>
        </div>
        <div className="intro-hint" style={{ opacity: introOn ? 1 : 0 }}>
          <div className="chapter">A NEW CHAPTER BEGINS</div>
          <div className="tap pulse">НАЖМИТЕ, ЧТОБЫ ОТКРЫТЬ</div>
        </div>
      </div>

      {/* scene 1 — cover */}
      <section className="scene scene1" style={sceneStyle(scene, 1)} aria-hidden={scene !== 1}>
        <div className="frame frame-outer" />
        <div className="frame frame-inner" />
        <div className="cover-top">
          <Monogram size={22} amp={16} color="var(--gold-light)" />
          <Ornament line={40} />
        </div>
        <div className="cover-bottom">
          <div className="kicker">НАША ЗИМНЯЯ ГЛАВА</div>
          <div className="cover-name" style={{ marginTop: 8 }}>Руслан</div>
          <div className="cover-amp">&amp;</div>
          <div className="cover-name">Эллина</div>
          <div className="cover-date">26 · XII · 2026</div>
        </div>
      </section>

      {/* scene 2 — portrait in an arched gold frame, like a photo pasted into the book */}
      <div className="scene story-portrait" style={sceneStyle(scene, 2)} aria-hidden>
        <div className="portrait-frame">
          <div className="portrait" style={{ backgroundImage: `url(${coupleImg})` }} />
        </div>
      </div>

      {/* scene 2 — story */}
      <section className="scene scene2" style={sceneStyle(scene, 2)} aria-hidden={scene !== 2}>
        <div className="kicker">НАША ИСТОРИЯ</div>
        <p className="story-lead">У каждой истории любви есть своё время года.</p>
        <p className="story-gold">Наша началась зимой.</p>
        <p className="story-body">И теперь, когда год подходит к концу, мы начинаем новую главу.</p>
      </section>

      {/* scene 3 — invitation */}
      <section className="scene scene3" style={sceneStyle(scene, 3)} aria-hidden={scene !== 3}>
        <Monogram size={20} amp={15} color="var(--gold-light)" />
        <p className="invite-en">
          Together with our families,
          <br />
          we invite you to witness
          <br />
          the beginning of our forever.
        </p>
        <Ornament line={50} />
        <p className="invite-ru">Вместе с нашими семьями мы приглашаем вас стать свидетелями начала нашей вечной истории.</p>
      </section>

      {/* scene 4 — details */}
      <section ref={detailsRef} className="scene scene4" style={sceneStyle(scene, 4)} aria-hidden={scene !== 4}>
        <div className="card">
          <div className="card-frame" />
          <div className="card-frame card-frame-inner" />
          <Monogram size={18} amp={13} color="var(--gold-dark)" gap={5} />
          <div className="card-date">
            26 декабря
            <br />
            2026 года
          </div>
          <Ornament line={30} />
          <div className="event">
            <div className="event-time">14:30</div>
            <div className="event-title">Регистрация брака</div>
            <div className="event-place">
              Гостиница «Националь», зал «Суздаль»
              <br />
              ул. Моховая, д. 15/1, стр. 1
            </div>
          </div>
          <div className="card-then">после регистрации —</div>
          <div className="event">
            <div className="event-time">16:00</div>
            <div className="event-title">Семейный вечер</div>
            <div className="event-place">
              Усадьба Милютина, зал «Версаль»
              <br />
              Милютинский пер., д. 14, стр. 1
            </div>
          </div>
          <div className="card-links">
            <a href={ROUTE_URL} target="_blank" rel="noreferrer">
              МАРШРУТЫ
            </a>
            <button type="button" onClick={downloadIcs}>
              В КАЛЕНДАРЬ
            </button>
          </div>
        </div>
        <button className="rsvp-btn" onClick={() => setSheetOpen(true)} tabIndex={scene === 4 ? 0 : -1}>
          {status === 'success' ? 'ОТВЕТ СОХРАНЁН ✓ · ИЗМЕНИТЬ' : 'ПОДТВЕРДИТЬ ПРИСУТСТВИЕ'}
        </button>
      </section>

      {/* persistent navigation */}
      {scene >= 1 && scene <= 3 && !book && (
        <button className="next pulse-slow" onClick={() => go(scene + 1)}>
          ДАЛЕЕ<span>⌄</span>
        </button>
      )}
      {scene >= 1 && (
        <>
          <nav className="dots" aria-label="Сцены">
            {[1, 2, 3, 4].map((i) => (
              <button key={i} onClick={() => go(i)} aria-label={`Сцена ${i}`} aria-current={i === scene ? 'step' : undefined}>
                <span className={i === scene ? 'active' : undefined} />
              </button>
            ))}
          </nav>
          <button className="sound" onClick={toggleSound} aria-label={sound ? 'Выключить звук' : 'Включить звук'}>
            {sound ? '♪ ON' : 'OFF'}
          </button>
        </>
      )}

      {/* book opening */}
      {book && (
        <div className="book" aria-hidden>
          <div
            className="leaf leaf-left"
            style={{ transform: book === 'open' ? 'rotateY(-112deg)' : 'rotateY(0)', opacity: book === 'open' ? 0 : 1 }}
          >
            <div className="leaf-frame" />
            <div className="leaf-letter">R</div>
          </div>
          <div
            className="leaf leaf-right"
            style={{ transform: book === 'open' ? 'rotateY(112deg)' : 'rotateY(0)', opacity: book === 'open' ? 0 : 1 }}
          >
            <div className="leaf-frame" />
            <div className="leaf-letter">E</div>
          </div>
        </div>
      )}

      {sheetOpen && (
        <RsvpSheet
          form={form}
          status={status}
          onChange={setForm}
          onSubmit={submit}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </main>
  )
}
