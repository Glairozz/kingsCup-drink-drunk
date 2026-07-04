'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import type { Card } from '@/lib/game'

interface Props {
  deck: Card[]
  cupFillPercent: number
  onCardClick: (index: number) => void
}

function getRadius(w: number, h: number) {
  const maxR = Math.min(w * 0.38, h * 0.38, 210)
  if (w < 380) return { radius: Math.min(maxR, 90), cardW: 40, cardH: 58 }
  if (w < 500) return { radius: Math.min(maxR, 110), cardW: 44, cardH: 64 }
  if (w < 700) return { radius: Math.min(maxR, 140), cardW: 55, cardH: 80 }
  return { radius: Math.min(maxR, 210), cardW: 70, cardH: 100 }
}

export function GameCanvas({ deck, cupFillPercent, onCardClick }: Props) {
  const cards = useMemo(() => {
    const remaining = deck.length
    if (!remaining) return []

    const w = typeof window !== 'undefined' ? window.innerWidth : 800
    const h = typeof window !== 'undefined' ? window.innerHeight : 500
    const { radius: maxR, cardW, cardH } = getRadius(w, h)
    const r = Math.min(maxR, maxR * 0.5 + remaining * 4)
    const step = (2 * Math.PI) / remaining
    const offset = -Math.PI / 2

    return deck.map((card, i) => {
      const angle = offset + i * step
      return {
        card,
        index: i,
        style: {
          left: `calc(50% + ${r * Math.cos(angle) - cardW / 2}px)`,
          top: `calc(50% + ${r * Math.sin(angle) - cardH / 2}px)`,
          width: cardW,
          height: cardH,
          rotate: `${angle + Math.PI / 2}rad`,
          zIndex: i + 10,
        } as React.CSSProperties,
      }
    })
  }, [deck])

  return (
    <div className="flex-1 relative overflow-hidden select-none touch-manipulation"
      style={{
        background: 'radial-gradient(ellipse at center, #1b5e20 0%, #0d3b0f 50%, #071f09 100%)',
        minHeight: 'clamp(300px, 55vh, 550px)',
      }}
    >
      {/* King's Cup */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] pointer-events-none">
        <div className="relative" style={{ width: 'clamp(55px, 12vw, 100px)', height: 'clamp(68px, 14.4vw, 120px)' }}>
          <div className="absolute inset-0 rounded-b-2xl border-2 border-[#6a4a10] overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #c0a060, #8a6a30)' }}>
            <div className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out"
              style={{ height: `${Math.min(cupFillPercent, 100)}%`, background: 'linear-gradient(180deg, #ffec8b, #d4a017)' }} />
          </div>
          <div className="absolute -top-[clamp(4px,0.8vw,6px)] -left-2 -right-2 rounded-full border border-[#6a4a10]"
            style={{ height: 'clamp(8px, 1.4vw, 12px)', background: 'linear-gradient(180deg, #d4b878, #b8963a)' }} />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-bold z-[2] leading-tight"
            style={{ color: '#4a2a00', fontSize: 'clamp(0.55rem, 1.4vw, 0.8rem)', textShadow: '0 1px 2px rgba(255,255,200,0.5)' }}>
            King's<br />Cup
          </span>
        </div>
      </div>

      {/* Cards */}
      {!deck.length ? (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-lg">No cards left!</div>
      ) : (
        cards.map(({ card, index, style }) => (
          <motion.button
            key={card.id}
            layout
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.025, type: 'spring', stiffness: 180, damping: 18 }}
            whileHover={{ y: -14, scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onCardClick(index)}
            className="absolute rounded-lg cursor-pointer border-2 border-[#a01a3a] focus:outline-none focus:ring-2 focus:ring-[#e94560]"
            style={{
              ...style,
              background: 'linear-gradient(135deg, #e94560, #c23152)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
            }}
            aria-label="Draw card"
          >
            <span className="flex items-center justify-center w-full h-full text-xl pointer-events-none select-none"
              style={{ fontSize: 'clamp(0.8rem, 2vw, 1.8rem)' }}>
              👑
            </span>
          </motion.button>
        ))
      )}
    </div>
  )
}
