'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Zap, ShieldCheck, Camera, ScanLine, ArrowRight, Check, type LucideIcon } from 'lucide-react'

type Feature = { title: string; text: string; icon: LucideIcon }

const FEATURES: Feature[] = [
  { title: '1-Command Deals', text: 'Tavily search and Nebius AI find the best price.', icon: Zap },
  { title: 'Subscription Guard', text: 'Proactively blocks unwanted recurring charges.', icon: ShieldCheck },
  { title: 'Physical AI Scanner', text: 'Point your camera at items to price-match them live.', icon: Camera },
  { title: 'AR View', text: 'Price badges float over items, even a whole shelf.', icon: ScanLine },
]

const LETTERS = 'QuickO'.split('')

// The four corner brackets of the "scanner lock"
const CORNERS = [
  'left-0 top-0 rounded-tl-2xl border-l-2 border-t-2',
  'right-0 top-0 rounded-tr-2xl border-r-2 border-t-2',
  'bottom-0 left-0 rounded-bl-2xl border-b-2 border-l-2',
  'bottom-0 right-0 rounded-br-2xl border-b-2 border-r-2',
]

export default function IntroOverlay() {
  const [open, setOpen] = useState(true)
  const [locked, setLocked] = useState(false)
  const reduce = !!useReducedMotion()

  // Scanner finds the card at about 1.25s
  useEffect(() => {
    if (reduce) {
      setLocked(true)
      return
    }
    const id = window.setTimeout(() => setLocked(true), 1250)
    return () => window.clearTimeout(id)
  }, [reduce])

  // Escape closes. Page does not scroll behind.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="intro"
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to QuickO"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: reduce ? 0.2 : 0.5 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-16 backdrop-blur-md sm:items-center"
        >
          {/* Decorative effects */}
          <div aria-hidden="true" className="pointer-events-none">
            {!reduce && (
              <>
                {/* Scan line sweeps down the screen */}
                <motion.div
                  initial={{ top: '0%', opacity: 0 }}
                  animate={{ top: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.15 }}
                  className="fixed inset-x-0 z-0 h-px bg-cyan-300 shadow-[0_0_24px_6px_rgba(103,232,249,0.55)]"
                >
                  <div className="absolute inset-x-0 bottom-full h-28 bg-gradient-to-t from-cyan-300/15 to-transparent" />
                </motion.div>

                {/* Purple burst when the scanner locks on */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.55, 0.22] }}
                  transition={{ duration: 1.3, delay: 1.2 }}
                  className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_45%,rgba(130,102,210,0.55),transparent_60%)]"
                />
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed right-4 top-4 z-10 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-medium text-slate-300 backdrop-blur-md transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8266d2]"
          >
            Skip intro
          </button>

          <div className="relative z-10 mx-auto mt-6 w-full max-w-3xl">
            {/* Scanner brackets: start big, lock onto the card, turn green */}
            <motion.div
              aria-hidden="true"
              initial={reduce ? false : { opacity: 0, scale: 1.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: reduce ? 0 : 0.55, ease: 'easeOut' }}
              className="pointer-events-none absolute -inset-3"
            >
              {CORNERS.map((c) => (
                <span
                  key={c}
                  className={`absolute size-7 transition-colors duration-300 ${c} ${
                    locked
                      ? 'border-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'border-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]'
                  }`}
                />
              ))}
              <span className="absolute -top-9 left-0 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1 font-mono text-[11px] text-slate-200">
                {locked ? (
                  <>
                    <Check className="size-3 text-emerald-400" /> Locked on: QuickO
                  </>
                ) : (
                  <>
                    <span className="size-1.5 animate-pulse rounded-full bg-cyan-300" /> Scanning...
                  </>
                )}
              </span>
            </motion.div>

            {/* The card */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: reduce ? 0 : 0.35, ease: 'easeOut' }}
              className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c0d11]/85 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
            >
              <div className="mb-7 text-center">
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : 0.8, duration: 0.5 }}
                  className="mb-4 flex flex-wrap items-center justify-center gap-2"
                >
                  <span className="rounded-full border border-[#8266d2]/25 bg-[#8266d2]/10 px-3 py-1 text-xs font-semibold text-[#a58ae6]">
                    Nebius x NVIDIA Hackathon Edition
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    Free to use
                  </span>
                </motion.div>

                <h1
                  aria-label="Welcome to QuickO"
                  className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl"
                >
                  <motion.span
                    aria-hidden="true"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: reduce ? 0 : 0.7, duration: 0.5 }}
                    className="mr-3 inline-block"
                  >
                    Welcome to
                  </motion.span>
                  <span aria-hidden="true" className="glow-text inline-block text-[#8266d2]">
                    {LETTERS.map((ch, i) => (
                      <motion.span
                        key={i}
                        initial={reduce ? false : { opacity: 0, y: 28, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ delay: reduce ? 0 : 1.0 + i * 0.07, duration: 0.4, ease: 'easeOut' }}
                        className="inline-block"
                      >
                        {ch}
                      </motion.span>
                    ))}
                  </span>
                </h1>

                <motion.p
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduce ? 0 : 1.5, duration: 0.5 }}
                  className="mt-3 text-sm text-slate-400 sm:text-base"
                >
                  Autonomous Physical & Digital Commerce Agent
                </motion.p>
              </div>

              <ul className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {FEATURES.map(({ title, text, icon: Icon }, i) => (
                  <motion.li
                    key={title}
                    initial={reduce ? false : { opacity: 0, y: 26, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 20, delay: reduce ? 0 : 1.7 + i * 0.15 }}
                    className="rounded-2xl border border-white/5 bg-[#17181f]/50 p-4 text-center transition-colors hover:border-[#8266d2]/40"
                  >
                    <Icon className="mx-auto mb-3 size-6 text-[#8266d2]" aria-hidden="true" />
                    <h2 className="text-sm font-semibold text-white">{title}</h2>
                    <p className="mt-1 text-xs leading-snug text-slate-400">{text}</p>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 2.5, duration: 0.5 }}
                className="flex justify-center"
              >
                <motion.button
                  type="button"
                  onClick={() => setOpen(false)}
                  animate={
                    reduce
                      ? undefined
                      : {
                          boxShadow: [
                            '0 0 0 0 rgba(130,102,210,0.55)',
                            '0 0 0 16px rgba(130,102,210,0)',
                          ],
                        }
                  }
                  transition={{ duration: 1.8, repeat: Infinity, delay: 3 }}
                  whileTap={{ scale: 0.96 }}
                  className="group flex cursor-pointer items-center gap-2 rounded-xl bg-[#8266d2] px-10 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#917ad8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Launch Agent
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}