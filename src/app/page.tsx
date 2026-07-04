'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Crown, Users, Swords, Trophy, X, Plus, Play, Star, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  type Player, type Card as CardType, type GameState,
  CARD_RULES, HOUSE_RULES, createDeck, shuffle, isRed,
} from '@/lib/game'
import { GameCanvas } from '@/components/GameCanvas'

const SUITS = ['♠', '♥', '♦', '♣']

const INIT: GameState = {
  players: [], currentPlayerIndex: 0, deck: [], drawnCards: [],
  kingsDrawn: 0, cupFillPercent: 0, activeRules: [], mates: {},
  turnNumber: 0, gameActive: false,
}

function FloatingSuits() {
  const items = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      suit: SUITS[i % 4],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 14 + Math.random() * 24,
      delay: Math.random() * 5,
      duration: 12 + Math.random() * 18,
      drift: -20 + Math.random() * 40,
    })),
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {items.current.map((item, i) => (
        <motion.span
          key={i}
          className="absolute text-white/5 font-bold"
          style={{ left: `${item.x}%`, top: `${item.y}%`, fontSize: item.size }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, item.drift, 0, -item.drift * 0.5, 0],
            rotate: [0, 10, -5, 8, 0],
            opacity: [0.04, 0.08, 0.04, 0.07, 0.04],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            delay: item.delay,
            ease: 'easeInOut',
          }}
        >
          {item.suit}
        </motion.span>
      ))}
    </div>
  )
}

export default function Home() {
  const [phase, setPhase] = useState<'landing' | 'setup' | 'game'>('landing')
  const [s, set] = useState<GameState>(INIT)
  const [names, setNames] = useState(['Player 1', 'Player 2'])
  const [hr, setHr] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<'card'|'pick'|'rule'|'rules'|'end'|null>(null)
  const [pick, setPick] = useState<((id: number) => void) | null>(null)
  const [ruleText, setRuleText] = useState('')
  const resolvedCardId = useRef<string | null>(null)
  const ruleHandled = useRef(false)

  const lastCard = s.drawnCards.length ? s.drawnCards[s.drawnCards.length - 1] : null
  const lastRule = lastCard ? CARD_RULES[lastCard.rank] : null
  const cp = s.players[s.currentPlayerIndex] ?? null
  const sorted = [...s.players].sort((a, b) => b.drinkCount - a.drinkCount)

  useEffect(() => { if (lastCard) setModal('card') }, [s.turnNumber])

  const drink = useCallback((id: number) => set(p => {
    const pl = p.players.map(x => x.id === id ? { ...x, drinkCount: x.drinkCount + 1 } : x)
    const mi = p.mates[id]
    if (mi !== undefined) { const i = pl.findIndex(x => x.id === mi); if (i !== -1) pl[i] = { ...pl[i], drinkCount: pl[i].drinkCount + 1 } }
    return { ...p, players: pl }
  }), [])

  const next = useCallback(() => set(p => ({ ...p, currentPlayerIndex: (p.currentPlayerIndex + 1) % p.players.length })), [])

  const draw = useCallback((i: number) => set(p => {
    if (!p.gameActive) return p
    const d = [...p.deck]; const c = d[i]; if (!c) return p
    d.splice(i, 1)
    let k = p.kingsDrawn, cup = p.cupFillPercent
    if (c.rank === 'K') { k++; cup = Math.min(100, cup + Math.random() * 15 + 5) }
    return { ...p, deck: d, drawnCards: [...p.drawnCards, c], turnNumber: p.turnNumber + 1, kingsDrawn: k, cupFillPercent: cup }
  }), [])

  function onCardOk() {
    if (!lastCard || cp?.id === undefined) return
    if (resolvedCardId.current === lastCard.id) return
    resolvedCardId.current = lastCard.id
    const id = cp.id
    switch (lastCard.rank) {
      case '2': setPick(() => (t: number) => { drink(t); next(); setModal(null) }); setModal('pick'); break
      case '3': drink(id); next(); setModal(null); break
      case '8':
        setPick(() => (t: number) => {
          if (t === id) return
          set(p => ({ ...p, mates: { ...p.mates, [id]: t, [t]: id } }))
          toast(`${s.players.find(x => x.id === id)?.name} and ${s.players.find(x => x.id === t)?.name} are now drinking partners!`)
          next(); setModal(null)
        })
        setModal('pick'); break
      case 'J': ruleHandled.current = false; setRuleText(''); setModal('rule'); break
      case 'K':
        if (s.kingsDrawn >= 4) {
          toast(`💀 ${cp.name} must drink the King's Cup!`)
          drink(id)
          setTimeout(() => { set(p => ({ ...p, gameActive: false })); setModal('end') }, 2000)
        } else {
          toast(`${cp.name} pours into the King's Cup! (King ${s.kingsDrawn}/4)`)
          next(); setModal(null)
        } break
      default: next(); setModal(null)
    }
  }

  function addRule(t: string) {
    if (ruleHandled.current) return
    ruleHandled.current = true
    if (t.trim()) { set(p => ({ ...p, activeRules: [...p.activeRules, t.trim()] })); toast(`📜 New rule: "${t.trim()}"`) }
    next(); setModal(null)
  }

  function resetGame() {
    set(INIT)
    setPhase('landing')
    setNames(['Player 1', 'Player 2'])
    setHr(new Set())
    setModal(null)
    setPick(null)
    setRuleText('')
  }

  // ─── LANDING ───
  if (phase === 'landing') {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a0a1a] via-[#1a1a2e] to-[#0d1a0d]">
        <FloatingSuits />

        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#e94560]/10 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-[#d4a017]/10 blur-[120px]" />

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
          {/* Crown */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300/20 to-yellow-600/20 border border-yellow-400/30 flex items-center justify-center shadow-xl shadow-yellow-400/10">
              <Crown className="w-12 h-12 text-yellow-400" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent"
          >
            King's Cup
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="text-lg md:text-xl text-zinc-400 mb-8 max-w-md"
          >
            The classic party card game where every card changes the game
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Button
              size="lg"
              onClick={() => setPhase('setup')}
              className="relative group h-14 px-10 text-lg font-bold bg-gradient-to-r from-[#e94560] to-[#d63851] hover:from-[#d63851] hover:to-[#c23152] text-white rounded-full shadow-2xl shadow-[#e94560]/30 hover:shadow-[#e94560]/50 transition-all duration-300"
            >
              <Sparkles className="w-5 h-5 mr-2 text-yellow-200" />
              Start Game
              <motion.span
                className="absolute inset-0 rounded-full bg-white/10"
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            </Button>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-zinc-500"
          >
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-500/60" /> 2–10+ Players</span>
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-500/60" /> 52 Cards</span>
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-500/60" /> 13 Unique Rules</span>
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-500/60" /> 20–60 Min</span>
          </motion.div>
        </div>
      </div>
    )
  }

  // ─── SETUP ───
  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1a2e]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          <Card className="border-0 shadow-2xl bg-[#16213e]/95 backdrop-blur-xl text-white">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl flex items-center justify-center gap-2">
                <Crown className="w-6 h-6 text-yellow-400" /> King's Cup
              </CardTitle>
              <CardDescription className="text-zinc-400 text-base">Set up your game</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2"><Users className="h-4 w-4" /> Players</h3>
                <div className="space-y-2">
                  {names.map((n, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={n} onChange={e => setNames(p => p.map((x, j) => j === i ? e.target.value : x))}
                        placeholder="Player name..." className="flex-1 bg-[#0f3460] border-[#2a2a4a] text-white placeholder:text-zinc-500 focus-visible:ring-[#e94560]" />
                      <Button variant="ghost" size="icon" onClick={() => names.length > 2 && setNames(p => p.filter((_, j) => j !== i))}
                        disabled={names.length <= 2} className="text-[#e94560] hover:text-[#e94560] hover:bg-[#e94560]/10 shrink-0"><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={() => setNames(p => [...p, `Player ${p.length + 1}`])}
                  className="w-full border-[#2a2a4a] text-zinc-400 hover:text-white hover:bg-[#2a2a4a]"><Plus className="h-4 w-4 mr-2" /> Add Player</Button>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2"><Swords className="h-4 w-4" /> House Rules</h3>
                <div className="grid grid-cols-2 gap-2">
                  {HOUSE_RULES.map(r => (
                    <Label key={r.label} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${hr.has(r.label) ? 'bg-[#e94560]/20 text-white' : 'bg-[#1a1a4a] text-zinc-400 hover:bg-[#2a2a4a]'}`}>
                      <input type="checkbox" checked={hr.has(r.label)} onChange={() => setHr(p => { const n = new Set(p); n.has(r.label) ? n.delete(r.label) : n.add(r.label); return n })}
                        className="sr-only" />
                      <span>{r.emoji}</span><span>{r.label}</span>
                    </Label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setPhase('landing')}
                  className="flex-1 border-[#2a2a4a] text-zinc-400 hover:text-white hover:bg-[#2a2a4a]">Back</Button>
                <Button size="lg" disabled={names.filter(x => x.trim()).length < 2}
                  onClick={() => {
                    set({ ...INIT, players: names.filter(x => x.trim()).map((name, i) => ({ id: i, name: name.trim(), drinkCount: 0 })), deck: shuffle(createDeck()), activeRules: [...hr], gameActive: true })
                    setPhase('game')
                  }}
                  className="flex-1 bg-[#e94560] hover:bg-[#d63851] text-white font-bold text-lg h-12 disabled:opacity-40">
                  <Play className="h-5 w-5 mr-2" /> Start Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ─── GAME ───
  return (
    <div className="min-h-screen flex flex-col bg-[#1a1a2e]">
      <header className="flex items-center justify-between px-4 py-2.5 bg-[#16213e]/90 backdrop-blur-sm border-b border-[#2a2a4a]">
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span className="flex items-center gap-1"><Crown className="h-4 w-4 text-yellow-400" /> {s.kingsDrawn}/4</span>
          <span>Turn: <strong className="text-white">{cp?.name}</strong></span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setModal('rules')} className="text-zinc-400 hover:text-white hover:bg-[#2a2a4a]">📜 Rules</Button>
          <Button variant="ghost" size="sm" onClick={() => { set(p => ({ ...p, gameActive: false })); setModal('end') }}
            className="text-zinc-400 hover:text-[#e94560] hover:bg-[#e94560]/10">End Game</Button>
        </div>
      </header>

      <div className="flex gap-2 flex-wrap px-4 py-2 bg-[#0f3460]/80 backdrop-blur-sm">
        {s.players.map((p, i) => {
          const active = i === s.currentPlayerIndex && s.gameActive
          const partner = s.mates[p.id] !== undefined || Object.values(s.mates).includes(p.id)
          return (
            <motion.span
              key={p.id}
              animate={active ? { scale: [1, 1.05, 1] } : undefined}
              transition={active ? { repeat: Infinity, duration: 1.5 } : undefined}
              className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors',
                active && 'bg-[#e94560] text-white shadow-lg shadow-[#e94560]/30',
                !active && partner && 'bg-[#4a3a8a] text-white',
                !active && !partner && 'bg-[#1a1a4a] text-zinc-300')}
            >
              {p.name}<span className={cn('text-xs font-bold', active ? 'text-white/80' : 'text-[#e94560]')}>{p.drinkCount}×</span>
            </motion.span>
          )
        })}
      </div>

      <GameCanvas deck={s.deck} cupFillPercent={s.cupFillPercent} onCardClick={draw} />

      <footer className="px-4 py-2 bg-[#16213e]/90 backdrop-blur-sm border-t border-[#2a2a4a] text-xs text-zinc-500 flex items-center gap-2">
        <span className="font-semibold text-zinc-400">Rules:</span>
        <span className="truncate">{s.activeRules.length ? s.activeRules.map(r => `• ${r}`).join('  ') : 'None'}</span>
      </footer>

      {/* ─── MODALS ─── */}

      <Dialog open={modal === 'card'} onOpenChange={o => { if (!o) onCardOk() }}>
        <DialogContent className="bg-[#16213e] text-white border-[#2a2a4a] sm:max-w-sm">
          {lastCard && lastRule && <div className="flex flex-col items-center text-center py-3">
            <div className="relative flex items-center justify-center mb-3 w-full"
              style={{ minHeight: 'clamp(100px, 32vw, 180px)' }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="absolute rounded-lg border-2 border-[#a01a3a] shadow-md"
                  style={{
                    width: 'clamp(62px, 19vw, 96px)',
                    height: 'clamp(88px, 27vw, 136px)',
                    background: 'linear-gradient(135deg, #e94560, #c23152)',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) rotate(${(i - 2) * 11}deg)`,
                    transformOrigin: 'center bottom',
                    zIndex: i + 1,
                  }}
                >
                  <span className="flex items-center justify-center w-full h-full text-lg opacity-20 select-none"
                    style={{ fontSize: 'clamp(0.8rem, 2.5vw, 1.3rem)' }}>
                    👑
                  </span>
                </div>
              ))}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', duration: .6 }}
                className={cn(
                  'relative rounded-xl flex flex-col items-center justify-center shadow-xl z-10',
                  isRed(lastCard.suit) ? 'bg-white text-red-600' : 'bg-white text-zinc-900',
                )}
                style={{
                  width: 'clamp(78px, 24vw, 112px)',
                  height: 'clamp(112px, 34vw, 160px)',
                }}
              >
                <span className="font-bold leading-none"
                  style={{ fontSize: 'clamp(1.1rem, 3.5vw, 1.8rem)' }}>
                  {lastCard.rank}
                </span>
                <span className="leading-none mt-1"
                  style={{ fontSize: 'clamp(0.9rem, 3vw, 1.5rem)' }}>
                  {lastCard.suit}
                </span>
              </motion.div>
            </div>
            <h2 className="text-xl font-bold mb-1">{lastRule.emoji} {lastRule.title}</h2>
            <p className="text-zinc-400 text-sm leading-relaxed px-1">{lastRule.desc}</p>
            <Button onClick={onCardOk} className="mt-4 bg-[#e94560] hover:bg-[#d63851] text-white w-full">OK</Button>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'pick'} onOpenChange={o => { if (!o) setModal(null) }}>
        <DialogContent className="bg-[#16213e] text-white border-[#2a2a4a] sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-center">{lastCard?.rank === '8' ? 'Choose your drinking partner!' : 'Who should drink?'}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2">
            {s.players.map(p => (
              <Button key={p.id} variant="outline" onClick={() => pick?.(p.id)}
                className="border-[#2a2a4a] text-zinc-300 hover:bg-[#2a2a4a] hover:text-white">{p.name}</Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'rule'} onOpenChange={o => { if (!o) { addRule('') } }}>
        <DialogContent className="bg-[#16213e] text-white border-[#2a2a4a] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">📜 Make a Rule</DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">Create a new rule everyone must follow for the rest of the game.</DialogDescription>
          </DialogHeader>
          <Textarea value={ruleText} onChange={e => setRuleText(e.target.value)}
            placeholder="No pointing, drink with left hand..." autoFocus
            className="bg-[#0f3460] border-[#2a2a4a] text-white placeholder:text-zinc-500 min-h-20 focus-visible:ring-[#e94560]" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setRuleText(''); addRule('') }}
              className="flex-1 border-[#2a2a4a] text-zinc-400 hover:bg-[#2a2a4a] hover:text-white">Skip</Button>
            <Button onClick={() => addRule(ruleText)} className="flex-1 bg-[#e94560] hover:bg-[#d63851] text-white">Add Rule</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'rules'} onOpenChange={o => { if (!o) setModal(null) }}>
        <DialogContent className="bg-[#16213e] text-white border-[#2a2a4a] sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-center">📜 Active Rules</DialogTitle></DialogHeader>
          {!s.activeRules.length ? <p className="text-center text-zinc-500 py-4">No active rules.</p> : (
            <div className="space-y-2">
              {s.activeRules.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-[#1a1a4a] rounded-lg px-3 py-2 text-sm text-zinc-300">
                  <span>{r}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[#e94560] hover:text-[#e94560] hover:bg-[#e94560]/10"
                    onClick={() => set(p => ({ ...p, activeRules: p.activeRules.filter((_, j) => j !== i) }))}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={() => setModal(null)} className="w-full border-[#2a2a4a] text-zinc-400 hover:bg-[#2a2a4a] hover:text-white">Close</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'end'} onOpenChange={o => { if (!o) { set(INIT); setPhase('landing'); setModal(null) } }}>
        <DialogContent className="bg-[#16213e] text-white border-[#2a2a4a] sm:max-w-sm">
          <div className="flex flex-col items-center text-center py-4">
            <Trophy className="h-16 w-16 text-yellow-400 mb-2" />
            <h2 className="text-2xl font-bold mb-1">Game Over!</h2>
            <p className="text-zinc-400 mb-4">{sorted[0]?.name} drinks the most! 🎉</p>
            <div className="w-full space-y-2 text-left mb-6">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Final Scores</h3>
              {sorted.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between bg-[#1a1a4a] rounded-lg px-3 py-2 text-sm">
                  <span className="flex items-center gap-2"><span>{i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>{p.name}</span>
                  <span className="text-[#e94560] font-bold">{p.drinkCount} drinks</span>
                </div>
              ))}
            </div>
            <Button onClick={resetGame} className="w-full bg-[#e94560] hover:bg-[#d63851] text-white">Play Again</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="bottom-center" />
    </div>
  )
}
