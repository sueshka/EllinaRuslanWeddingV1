import { useEffect, useRef, useState, type CSSProperties } from 'react'

export type Slide = { img: string; video?: undefined; style?: CSSProperties } | { video: string; img?: undefined; style?: CSSProperties }

const PHOTO_MS = 6000

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
  const videos = useRef<(HTMLVideoElement | null)[]>([])
  const current = slides[index]
  const cycling = active && slides.length > 1

  const next = () => setIndex((i) => (i + 1) % slides.length)

  // photo: switch after a while; video: play it, switch when it ends (see onEnded)
  useEffect(() => {
    if (!cycling || current.video) return
    const t = window.setTimeout(next, index === 0 ? PHOTO_MS + offset : PHOTO_MS)
    return () => clearTimeout(t)
  }, [cycling, index])

  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (!v) return
      if (i === index && active) {
        v.currentTime = 0
        v.play().catch(() => next()) // can't autoplay (e.g. low-power mode) — skip to the photo
      } else v.pause()
    })
  }, [index, active])

  return (
    <div className="cd-winter-card">
      {slides.map((s, i) => {
        const cls = 'cd-winter-img' + (i === index ? ' is-on' : '') + (reduced ? ' no-zoom' : '')
        return s.video ? (
          <video
            key={i}
            ref={(el) => {
              videos.current[i] = el
            }}
            className={cls}
            style={s.style}
            src={s.video}
            muted
            playsInline
            preload="metadata"
            onEnded={next}
            aria-hidden
          />
        ) : (
          <div key={i} className={cls} style={{ backgroundImage: `url(${s.img})`, ...s.style }} />
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
