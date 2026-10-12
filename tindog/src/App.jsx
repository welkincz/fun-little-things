import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import phone from './assets/iphone6.png'
import pebbles from './assets/dog-img.jpg'
import beverly from './assets/lady-img.jpg'
import techcrunch from './assets/TechCrunch.png'
import tnw from './assets/tnw.png'
import bizinsider from './assets/bizinsider.png'
import mashable from './assets/mashable.png'
import {
  AppleIcon,
  PlayIcon,
  CheckIcon,
  TargetIcon,
  HeartIcon,
  FacebookIcon,
  XIcon,
  InstagramIcon,
  MailIcon,
} from './icons.jsx'

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    icon: CheckIcon,
    title: 'Easy to use.',
    text: 'So easy to use, even your dog could do it.',
  },
  {
    icon: TargetIcon,
    title: 'Elite Clientele',
    text: 'We have all the dogs, the greatest dogs.',
  },
  {
    icon: HeartIcon,
    title: 'Guaranteed to work.',
    text: "Find the love of your dog's life or your money back.",
  },
]

const quotes = [
  {
    text: "I no longer have to sniff other dogs for love. I've found the hottest Corgi on TinDog. Woof.",
    name: 'Pebbles, New York',
    image: pebbles,
    alt: 'Pebbles, a small fluffy dog',
  },
  {
    text: "My dog used to be so lonely, but with TinDog's help, they've found the love of their life. I think.",
    name: 'Beverly, Illinois',
    image: beverly,
    alt: 'Beverly, smiling',
  },
]

const plans = [
  {
    name: 'Chihuahua',
    price: 'Free',
    featured: false,
    items: ['5 matches per day', '10 messages per day', 'Unlimited app usage'],
  },
  {
    name: 'Labrador',
    price: '$49 / mo',
    featured: true,
    items: ['Unlimited matches', 'Unlimited messages', 'Unlimited app usage'],
  },
  {
    name: 'Mastiff',
    price: '$99 / mo',
    featured: false,
    items: ['Priority listing', 'Unlimited matches', 'Unlimited messages', 'Unlimited app usage'],
  },
]

const press = [
  { src: techcrunch, alt: 'TechCrunch' },
  { src: tnw, alt: 'The Next Web' },
  { src: bizinsider, alt: 'Business Insider' },
  { src: mashable, alt: 'Mashable' },
]

const quoteVariants = {
  enter: (direction) => ({ x: direction * 36, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction * -36, opacity: 0 }),
}

function DownloadLinks({ className = '' }) {
  return (
    <div className={`downloads ${className}`.trim()}>
      <motion.a className="btn btn-fill" href="#pricing" whileTap={{ scale: 0.98 }}>
        <AppleIcon />
        <span>
          Download
          <span className="visually-hidden"> for iPhone</span>
        </span>
      </motion.a>
      <motion.a className="btn btn-line" href="#pricing" whileTap={{ scale: 0.98 }}>
        <PlayIcon />
        <span>
          Download
          <span className="visually-hidden"> for Android</span>
        </span>
      </motion.a>
    </div>
  )
}

export default function App() {
  const reduce = useReducedMotion()
  const pageRef = useRef(null)
  const heroRef = useRef(null)
  const phoneRef = useRef(null)
  const phoneRigRef = useRef(null)
  const featuresRef = useRef(null)
  const quotesRef = useRef(null)
  const portraitRef = useRef(null)
  const slabRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const lenis = new Lenis({
      autoRaf: false,
      anchors: true,
      lerp: 0.12,
    })
    lenis.on('scroll', ScrollTrigger.update)
    const onTick = (time) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    const ctx = gsap.context(() => {
      gsap.from('.line-inner', {
        yPercent: 110,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
      })

      const wide = window.matchMedia('(min-width: 801px)').matches
      if (wide && phoneRef.current && phoneRigRef.current) {
        gsap.from(phoneRef.current, {
          y: 64,
          duration: 1.1,
          ease: 'power3.out',
          delay: 0.12,
        })
        gsap.to(phoneRigRef.current, {
          y: 110,
          rotate: -14,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        })
      }

      gsap.from('.feature-title span', {
        yPercent: 120,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: featuresRef.current,
          start: 'top 78%',
        },
      })

      if (portraitRef.current) {
        gsap.from(portraitRef.current, {
          scale: 0.92,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: quotesRef.current,
            start: 'top 75%',
          },
        })
      }

      if (slabRef.current) {
        gsap.from(slabRef.current, {
          clipPath: 'inset(100% 0 0 0)',
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: slabRef.current,
            start: 'top 85%',
          },
        })
      }
    }, pageRef)

    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => {
      ctx.revert()
      gsap.ticker.remove(onTick)
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 800px)')
    const apply = () => setNarrow(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  function showQuote(nextDirection) {
    setDirection(nextDirection)
    setQuoteIndex((current) => (current + nextDirection + quotes.length) % quotes.length)
  }

  function onQuoteKey(event) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      showQuote(1)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      showQuote(-1)
    }
  }

  const quote = quotes[quoteIndex]

  return (
    <div className="page" ref={pageRef}>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="hero" id="title" ref={heroRef}>
        <div className="wrap nav-wrap">
          <a className="brand" href="#title">
            tindog
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="visually-hidden">{menuOpen ? 'Close menu' : 'Open menu'}</span>
            <span className="bars" />
          </button>
          <div
            className={menuOpen ? 'nav-panel is-open' : 'nav-panel'}
            id="site-nav"
            inert={narrow && !menuOpen ? true : undefined}
          >
            <ul className="nav-links">
              <li>
                <a href="#footer" onClick={() => setMenuOpen(false)}>
                  Contact
                </a>
              </li>
              <li>
                <a href="#pricing" onClick={() => setMenuOpen(false)}>
                  Pricing
                </a>
              </li>
              <li>
                <a href="#cta" onClick={() => setMenuOpen(false)}>
                  Download
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="wrap hero-body">
          <div className="hero-copy">
            <h1 className="hero-title" id="hero-title">
              {['Meet', 'new and', 'interesting', 'dogs', 'nearby.'].map((line) => (
                <span className="line" key={line}>
                  <span className="line-inner">{line}</span>
                </span>
              ))}
            </h1>
            <DownloadLinks />
          </div>
          <div className="phone-rig" ref={phoneRigRef}>
            <img
              ref={phoneRef}
              className="phone"
              src={phone}
              alt="TinDog on an iPhone, open to a golden retriever profile"
            />
          </div>
        </div>
      </header>

      <main id="main">
        <section className="features" id="features" ref={featuresRef} aria-labelledby="features-title">
          <h2 id="features-title" className="visually-hidden">
            Features
          </h2>
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article className="feature" key={feature.title}>
                <Icon />
                <h3 className="feature-title">
                  <span>{feature.title}</span>
                </h3>
                <p>{feature.text}</p>
              </article>
            )
          })}
        </section>

        <section
          className="quotes"
          id="testimonials"
          ref={quotesRef}
          aria-labelledby="quotes-title"
          onKeyDown={onQuoteKey}
        >
          <h2 id="quotes-title" className="visually-hidden">
            Testimonials
          </h2>
          <div className="wrap quotes-grid">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.figure
                key={quote.name}
                className="quote"
                custom={direction}
                variants={reduce ? undefined : quoteVariants}
                initial={reduce ? false : 'enter'}
                animate="center"
                exit={reduce ? undefined : 'exit'}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              >
                <img ref={portraitRef} src={quote.image} alt={quote.alt} />
                <blockquote>
                  <p>{quote.text}</p>
                </blockquote>
                <figcaption>{quote.name}</figcaption>
              </motion.figure>
            </AnimatePresence>
            <div className="quote-controls">
              <button type="button" onClick={() => showQuote(-1)}>
                Previous
              </button>
              <p>
                {quoteIndex + 1} of {quotes.length}
              </p>
              <button type="button" onClick={() => showQuote(1)}>
                Next
              </button>
            </div>
          </div>
        </section>

        <section className="press" aria-labelledby="press-title">
          <div className="wrap">
            <h2 id="press-title">Press</h2>
            <ul>
              {press.map((logo) => (
                <li key={logo.alt}>
                  <img src={logo.src} alt={logo.alt} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="pricing" id="pricing" aria-labelledby="pricing-title">
          <div className="wrap">
            <h2 id="pricing-title">A Plan for Every Dog&apos;s Needs</h2>
            <p className="lede">Simple and affordable price plans for you and your dog.</p>
            <div className="plans">
              {plans.map((plan) => (
                <article
                  className={plan.featured ? 'plan plan-featured' : 'plan'}
                  key={plan.name}
                  ref={plan.featured ? slabRef : undefined}
                >
                  <h3>{plan.name}</h3>
                  <p className="price">{plan.price}</p>
                  <ul>
                    {plan.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <a className={plan.featured ? 'btn btn-hot' : 'btn btn-fill'} href="#footer">
                    Sign up
                    <span className="visually-hidden"> for the {plan.name} plan</span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cta" id="cta" aria-labelledby="cta-title">
          <div className="wrap cta-grid">
            <h2 id="cta-title">Find the True Love of Your Dog&apos;s Life Today.</h2>
            <DownloadLinks />
          </div>
        </section>
      </main>

      <footer className="footer" id="footer">
        <div className="wrap footer-grid">
          <a className="brand" href="#title">
            tindog
          </a>
          <ul className="social" aria-hidden="true">
            <li>
              <FacebookIcon />
            </li>
            <li>
              <XIcon />
            </li>
            <li>
              <InstagramIcon />
            </li>
            <li>
              <MailIcon />
            </li>
          </ul>
          <p>© TinDog</p>
          <p className="demo">A demo page. Nothing here downloads or creates an account.</p>
          <a className="top" href="#title">
            Back to top
          </a>
        </div>
      </footer>
    </div>
  )
}
