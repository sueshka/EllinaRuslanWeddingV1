import { useEffect, useRef, useState, type CSSProperties } from 'react'

export type Slide =
  | { img: string; video?: undefined; poster?: undefined; style?: CSSProperties }
  | { video: string; poster: string; img?: undefined; style?: CSSProperties }

const PHOTO_MS = 6000
// a video that stalls (weak connection) must not freeze the card
const VIDEO_MAX_MS = 12000

interface Props {
  n: string
  text: string
  italic?: boolean
  slides: Slide[]
  /** cycle only while the page is on screen */
  active: boolean
  /** delay before the first change, so the cards don't all switch at once */
  offset: number
  reduced: boolean
}

/** A story card that cycles its photos (every 6s) and videos (for their length) with a crossfade. */
export default function StoryCard({ n, text, italic, slides, active, offset, reduced }: Props) {
  const [index, setIndex] = useState(0)
  // videos leave the rotation when they can't play (autoplay blocked, load error) or motion is reduced
  const [videoOff, setVideoOff] = useState(false)
  const noVideo = videoOff || reduced
  const videos = useRef<(HTMLVideoElement | null)[]>([])
  const playable = slides.map((s, i) => (s.video && noVideo ? -1 : i)).filter((i) => i >= 0)
  const shown = playable.includes(index) ? index : playable[0]
  const current = slides[shown]
  const cycling = active && playable.length > 1

  const next = () => setIndex((i) => playable[(playable.indexOf(i) + 1) % playable.length] ?? playable[0])

  // photo: switch after a while; video: switch when it ends (onEnded), or after a cap if it stalls
  useEffect(() => {
    if (!cycling) return
    const ms = current.video ? VIDEO_MAX_MS : shown === playable[0] ? PHOTO_MS + offset : PHOTO_MS
    const t = window.setTimeout(next, ms)
    return () => clearTimeout(t)
  }, [cycling, shown, noVideo])

  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (!v) return
      if (i === shown && active) {
        v.currentTime = 0
        v.play().catch((err: DOMException) => {
          // paused before it started (page left / slide changed) is fine; anything else — no videos from now on
          if (err.name !== 'AbortError') setVideoOff(true)
        })
      } else v.pause()
    })
  }, [shown, active, noVideo])

  return (
    <div className="cd-winter-card">
      {slides.map((s, i) => {
        const cls = 'cd-winter-img' + (i === shown ? ' is-on' : '') + (reduced ? ' no-zoom' : '')
        if (!s.video) return <div key={i} className={cls} style={{ backgroundImage: `url(${s.img})`, ...s.style }} />
        if (noVideo) return null
        return (
          <video
            key={i}
            ref={(el) => {
              videos.current[i] = el
            }}
            className={cls}
            style={s.style}
            src={s.video}
            poster={s.poster}
            muted
            playsInline
            // buffer only once the guest reaches the page, not while the loader waits for the first photos
            preload={active ? 'auto' : 'none'}
            onEnded={next}
            onError={() => setVideoOff(true)}
            aria-hidden
          />
        )
      })}
      <div className={italic ? 'cd-winter-caption is-italic' : 'cd-winter-caption'}>
        <span>{n}</span>
        <br />
        {text}
      </div>
    </div>
  )
}
