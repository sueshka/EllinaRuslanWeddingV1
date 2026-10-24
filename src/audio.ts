// Sound: one background song (loops) and the candle-lighting sound.
// Browsers only allow sound after a tap, so it starts from one (see App).

import { useSyncExternalStore } from 'react'
import musicUrl from './assets/misc/music.MP3'
import candleUrl from './assets/misc/candle_sound.MP3'

const MASTER = 0.8
const MUSIC = 0.75
// candle_sound.MP3 is quiet and almost silent for the first second — skip it, lift the level
// and play only ~3s of it (the file runs 7s), fading out at the end
const CANDLE_OFFSET = 1
const CANDLE_LENGTH = 3.2
const CANDLE_FADE = 0.9
const CANDLE_GAIN = 5

const music = new Audio(musicUrl)
music.loop = true
music.preload = 'metadata'

const candleBytes = fetch(candleUrl)
  .then((r) => r.arrayBuffer())
  .catch(() => null)

let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicGain: GainNode | null = null
let candleBuf: AudioBuffer | null = null
let muted = false
let resumeOnShow = false

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/**
 * Start the audio engine and the song. Call from every tap: if a browser didn't accept an earlier
 * tap as permission (iPhone is picky about which touch events count), the next one starts the song.
 */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = MASTER
    master.connect(ctx.destination)

    musicGain = ctx.createGain()
    musicGain.gain.value = 0
    ctx.createMediaElementSource(music).connect(musicGain).connect(master)
    emit()
  }
  if (document.hidden) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  if (music.paused) {
    // first start — fade in
    if (music.currentTime === 0 && musicGain) {
      musicGain.gain.cancelScheduledValues(ctx.currentTime)
      musicGain.gain.setValueAtTime(0, ctx.currentTime)
      musicGain.gain.linearRampToValueAtTime(MUSIC, ctx.currentTime + 3)
    }
    music.play().catch(() => {})
  }
}

/** The candle catching fire — played on the candle tap, together with the flash animation. */
export function playCandleSound() {
  unlockAudio()
  const c = ctx
  const out = master
  if (!c || !out) return
  candleBytes.then(async (bytes) => {
    if (!bytes) return
    try {
      candleBuf ??= await c.decodeAudioData(bytes.slice(0))
    } catch {
      return
    }
    const src = c.createBufferSource()
    src.buffer = candleBuf
    const g = c.createGain()
    const t = c.currentTime
    const dur = Math.min(CANDLE_LENGTH, candleBuf.duration - CANDLE_OFFSET)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(CANDLE_GAIN, t + 0.05)
    g.gain.setValueAtTime(CANDLE_GAIN, t + dur - CANDLE_FADE)
    g.gain.linearRampToValueAtTime(0, t + dur)
    src.connect(g).connect(out)
    src.start(t, CANDLE_OFFSET, dur)
  })
}

function setOn(on: boolean) {
  muted = !on
  if (ctx && master) master.gain.setTargetAtTime(on ? MASTER : 0, ctx.currentTime, 0.3)
  emit()
}

/** Sound button: before the first tap it starts the sound, then toggles it. */
export function toggleSound() {
  if (!ctx) return unlockAudio()
  setOn(muted)
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Is sound playing (started and not muted)? */
export const useSoundOn = () => useSyncExternalStore(subscribe, () => !!ctx && !muted)

// Pause when the tab / phone screen is hidden; resume when back — only if it was playing
document.addEventListener('visibilitychange', () => {
  if (!ctx) return
  if (document.hidden) {
    resumeOnShow = !music.paused
    music.pause()
    ctx.suspend().catch(() => {})
  } else {
    ctx.resume().catch(() => {})
    if (resumeOnShow) music.play().catch(() => {})
  }
})
