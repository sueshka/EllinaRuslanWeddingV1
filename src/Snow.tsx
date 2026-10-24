import { memo, useMemo } from 'react'

function Snow({ count = 26, seed = 41, still = false }: { count?: number; seed?: number; still?: boolean }) {
  const flakes = useMemo(() => {
    let r = seed
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280
    return Array.from({ length: count }, () => {
      const size = 1.5 + rnd() * 2.5
      const dur = 12 + rnd() * 12
      return { size, dur, delay: -rnd() * dur, left: rnd() * 100, top: rnd() * 100 }
    })
  }, [count, seed])

  return (
    <div className="snow" aria-hidden>
      {flakes.map((f, i) => (
        <span
          key={i}
          className="flake"
          style={{
            left: `${f.left}%`,
            top: still ? `${f.top}%` : -6,
            width: f.size,
            height: f.size,
            filter: f.size > 3 ? 'blur(.6px)' : undefined,
            animation: still ? 'none' : `snowfall ${f.dur}s linear ${f.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

export default memo(Snow)
