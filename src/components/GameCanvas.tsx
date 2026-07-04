'use client'

import { useRef, useEffect } from 'react'
import Phaser from 'phaser'
import { TableScene } from '@/game/TableScene'
import type { Card } from '@/lib/game'

interface Props {
  deck: Card[]
  cupFillPercent: number
  onCardClick: (index: number) => void
}

export function GameCanvas({ deck, cupFillPercent, onCardClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<TableScene | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      transparent: false,
      backgroundColor: '#0d3b0f',
      parent: containerRef.current,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [TableScene],
    }

    const game = new Phaser.Game(config)
    gameRef.current = game

    game.events.on('ready', () => {
      const scene = game.scene.getScene('TableScene') as TableScene
      sceneRef.current = scene
      scene.setCallbacks({ onCardClick })
      scene.updateDeck(deck)
      scene.updateCup(cupFillPercent)
    })

    return () => {
      game.destroy(true)
      gameRef.current = null
      sceneRef.current = null
    }
  }, [])

  // Update deck when it changes
  useEffect(() => {
    const scene = sceneRef.current
    if (scene) {
      scene.setCallbacks({ onCardClick })
      scene.updateDeck(deck)
    }
  }, [deck, onCardClick])

  // Update cup when fill changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateCup(cupFillPercent)
    }
  }, [cupFillPercent])

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ minHeight: 'clamp(300px, 55vh, 550px)' }}
    />
  )
}
