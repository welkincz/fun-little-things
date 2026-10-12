import { useEffect, useRef, useState } from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
import tom1 from './assets/sounds/tom-1.mp3'
import tom2 from './assets/sounds/tom-2.mp3'
import tom3 from './assets/sounds/tom-3.mp3'
import tom4 from './assets/sounds/tom-4.mp3'
import snare from './assets/sounds/snare.mp3'
import crash from './assets/sounds/crash.mp3'
import kick from './assets/sounds/kick-bass.mp3'
import tom1Img from './assets/tom1.png'
import tom2Img from './assets/tom2.png'
import tom3Img from './assets/tom3.png'
import tom4Img from './assets/tom4.png'
import snareImg from './assets/snare.png'
import crashImg from './assets/crash.png'
import kickImg from './assets/kick.png'

const DRUMS = [
  { key: 'w', name: 'Tom 1', sound: tom1, image: tom1Img, row: 'toms' },
  { key: 'a', name: 'Tom 2', sound: tom2, image: tom2Img, row: 'toms' },
  { key: 's', name: 'Tom 3', sound: tom3, image: tom3Img, row: 'toms' },
  { key: 'd', name: 'Tom 4', sound: tom4, image: tom4Img, row: 'toms' },
  { key: 'j', name: 'Snare', sound: snare, image: snareImg, row: 'kit' },
  { key: 'k', name: 'Crash', sound: crash, image: crashImg, row: 'kit' },
  { key: 'l', name: 'Kick', sound: kick, image: kickImg, row: 'kit', kick: true },
]

const KEYS = new Set(DRUMS.map((drum) => drum.key))

function Heart() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 20s-7-4.4-7-9.1C5 8 6.8 6.2 9.1 6.2c1.3 0 2.4.6 2.9 1.6.5-1 1.6-1.6 2.9-1.6 2.3 0 4.1 1.8 4.1 4.7C19 15.6 12 20 12 20z"
      />
    </svg>
  )
}

export default function App() {
  const reduce = useReducedMotion()
  const titleRef = useRef(null)
  const timers = useRef({})
  const [pressed, setPressed] = useState(() => new Set())
  const [bursts, setBursts] = useState({})

  useEffect(() => {
    const clips = DRUMS.map((drum) => {
      const audio = new Audio(drum.sound)
      audio.preload = 'auto'
      audio.load()
      return audio
    })
    return () => {
      clips.forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
      Object.values(timers.current).forEach(clearTimeout)
    }
  }, [])

  const strikeRef = useRef(() => {})

  function nudgeTitle() {
    if (reduce || !titleRef.current) return
    animate(titleRef.current, { x: [0, 14, 0] }, { duration: 0.32, ease: [0.22, 1, 0.36, 1] })
  }

  function strike(key) {
    const drum = DRUMS.find((item) => item.key === key)
    if (!drum) return

    const audio = new Audio(drum.sound)
    audio.play().catch(() => {})

    setPressed((current) => {
      const next = new Set(current)
      next.add(key)
      return next
    })
    setBursts((current) => ({ ...current, [key]: (current[key] ?? 0) + 1 }))
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      setPressed((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
    }, 140)
    nudgeTitle()
  }

  strikeRef.current = strike

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase()
      if (!KEYS.has(key)) return
      event.preventDefault()
      strikeRef.current(key)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toms = DRUMS.filter((drum) => drum.row === 'toms')
  const kit = DRUMS.filter((drum) => drum.row === 'kit')

  return (
    <div className="stage">
      <h1 ref={titleRef} className="backdrop">
        <span>Drum</span>
        <span>Kit</span>
      </h1>
      <p className="hint">
        Press <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd>, or click a pad.
      </p>
      <div className="kit">
        <div className="row toms">
          {toms.map((drum) => (
            <Pad
              key={drum.key}
              drum={drum}
              pressed={pressed.has(drum.key)}
              burst={bursts[drum.key] ?? 0}
              reduce={reduce}
              onStrike={strike}
            />
          ))}
        </div>
        <div className="row kit-row">
          {kit.map((drum) => (
            <Pad
              key={drum.key}
              drum={drum}
              pressed={pressed.has(drum.key)}
              burst={bursts[drum.key] ?? 0}
              reduce={reduce}
              onStrike={strike}
            />
          ))}
        </div>
      </div>
      <footer>
        <p>
          Made with <Heart /> in Toronto.
        </p>
      </footer>
    </div>
  )
}

function Pad({ drum, pressed, burst, reduce, onStrike }) {
  return (
    <motion.button
      type="button"
      className={`pad${drum.kick ? ' kick' : ''}${pressed ? ' is-down' : ''}`}
      style={{ backgroundImage: `url(${drum.image})` }}
      aria-label={`${drum.name}, key ${drum.key.toUpperCase()}`}
      animate={reduce ? { scale: 1 } : { scale: pressed ? 0.9 : 1 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 640, damping: 18, mass: 0.4 }}
      onClick={() => onStrike(drum.key)}
    >
      <span className="key-letter" aria-hidden="true">
        {drum.key}
      </span>
      {burst > 0 && !reduce ? (
        <motion.span
          key={burst}
          className="shock"
          initial={{ scale: 0.72, opacity: 0.7 }}
          animate={{ scale: 1.28, opacity: 0 }}
          transition={{ duration: 0.38, ease: 'easeOut' }}
        />
      ) : null}
    </motion.button>
  )
}
