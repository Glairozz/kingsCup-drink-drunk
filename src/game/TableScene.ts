import Phaser from 'phaser'
import type { Card } from '@/lib/game'

export interface TableSceneEvents {
  onCardClick: (index: number) => void
}

export class TableScene extends Phaser.Scene {
  private cards: Phaser.GameObjects.Container[] = []
  private cup!: Phaser.GameObjects.Container
  private cupFill!: Phaser.GameObjects.Rectangle
  private cupLabel!: Phaser.GameObjects.Text
  private events_: TableSceneEvents = { onCardClick: () => {} }
  private currentDeck: Card[] = []
  private cupPercent = 0

  constructor() {
    super({ key: 'TableScene' })
  }

  setCallbacks(events: TableSceneEvents) {
    this.events_ = events
  }

  updateDeck(deck: Card[]) {
    this.currentDeck = deck
    this.renderCards()
  }

  updateCup(fillPercent: number) {
    this.cupPercent = fillPercent
    if (this.cupFill) {
      const maxH = this.scale.height < 500 ? 70 : 120
      const h = Math.min(fillPercent / 100, 1) * maxH
      this.cupFill.setSize(this.cupFill.width, h)
      this.cupFill.setY(h / 2)
    }
  }

  create() {
    this.drawFelt()
    this.drawCup()
  }

  private drawFelt() {
    const w = this.scale.width
    const h = this.scale.height
    const g = this.add.graphics()
    g.fillGradientStyle(0x1b5e20, 0x1b5e20, 0x0d3b0f, 0x0d3b0f, 1)
    g.fillRect(0, 0, w, h)
    // Felt texture overlay
    for (let i = 0; i < 100; i++) {
      g.fillStyle(0x000000, 0.02)
      g.fillCircle(Math.random() * w, Math.random() * h, Math.random() * 3 + 1)
    }
  }

  private drawCup() {
    const cx = this.scale.width / 2
    const cy = this.scale.height / 2
    const isSmall = this.scale.width < 500
    const cw = isSmall ? 60 : 100
    const ch = isSmall ? 78 : 120

    this.cup = this.add.container(cx, cy)

    // Cup shadow
    const shadow = this.add.ellipse(0, ch / 2 + 8, cw * 1.1, 12, 0x000000, 0.3)
    this.cup.add(shadow)

    // Cup body
    const body = this.add.graphics()
    body.fillStyle(0xc0a060)
    body.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, { tl: 0, tr: 0, bl: 12, br: 12 })
    body.fillStyle(0x8a6a30)
    body.fillRoundedRect(-cw / 2 + 3, -ch / 2 + 3, cw - 6, ch - 6, { tl: 0, tr: 0, bl: 10, br: 10 })
    this.cup.add(body)

    // Cup rim
    const rim = this.add.graphics()
    rim.fillStyle(0xd4b878)
    rim.fillEllipse(0, -ch / 2 - 4, cw + 24, 14)
    rim.lineStyle(2, 0x6a4a10)
    rim.strokeEllipse(0, -ch / 2 - 4, cw + 24, 14)
    this.cup.add(rim)

    // Liquid fill
    this.cupFill = this.add.rectangle(0, ch / 2 - 4, cw - 10, 0, 0xd4a017)
    this.cupFill.setOrigin(0.5, 1)
    this.cup.add(this.cupFill)

    // Label
    this.cupLabel = this.add.text(0, 0, "King's\nCup", {
      fontSize: isSmall ? '11px' : '14px',
      fontFamily: 'Arial',
      color: '#4a2a00',
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.cup.add(this.cupLabel)

    this.cup.setDepth(5)
  }

  private renderCards() {
    // Remove old cards
    this.cards.forEach(c => c.destroy())
    this.cards = []

    const remaining = this.currentDeck.length
    if (remaining === 0) return

    const w = this.scale.width
    const h = this.scale.height
    const isSmall = w < 500
    const cardW = isSmall ? 42 : 65
    const cardH = isSmall ? 60 : 92
    const maxR = Math.min(w * 0.38, h * 0.38)
    const radius = Math.min(maxR, maxR * 0.5 + remaining * 4)
    const step = (2 * Math.PI) / remaining
    const offset = -Math.PI / 2

    this.currentDeck.forEach((card, i) => {
      const angle = offset + i * step
      const x = w / 2 + radius * Math.cos(angle)
      const y = h / 2 + radius * Math.sin(angle)

      const container = this.add.container(x, y)

      // Card back
      const bg = this.add.graphics()
      bg.fillStyle(0xe94560)
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6)
      bg.fillStyle(0xc23152)
      bg.fillRoundedRect(-cardW / 2 + 2, -cardH / 2 + 2, cardW - 4, cardH - 4, 5)
      bg.lineStyle(2, 0xa01a3a)
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6)
      container.add(bg)

      // Crown icon
      const crown = this.add.text(0, 0, '👑', {
        fontSize: isSmall ? '14px' : '22px',
      }).setOrigin(0.5)
      container.add(crown)

      // Interactive zone
      const hitZone = this.add.zone(0, 0, cardW, cardH).setInteractive({ useHandCursor: true })
      hitZone.on('pointerdown', () => this.events_.onCardClick(i))
      hitZone.on('pointerover', () => {
        this.tweens.add({
          targets: container,
          y: y - 15,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 200,
          ease: 'Back.easeOut',
        })
        container.setDepth(100)
      })
      hitZone.on('pointerout', () => {
        this.tweens.add({
          targets: container,
          y: y,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: 'Sine.easeInOut',
        })
        container.setDepth(i)
      })

      container.setDepth(i)
      container.setRotation(angle + Math.PI / 2)
      this.cards.push(container)
    })
  }
}
