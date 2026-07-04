export interface Player {
  id: number
  name: string
  drinkCount: number
}

export interface Card {
  suit: string
  rank: string
  id: string
}

export interface CardRule {
  title: string
  emoji: string
  desc: string
}

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  deck: Card[]
  drawnCards: Card[]
  kingsDrawn: number
  cupFillPercent: number
  activeRules: string[]
  mates: Record<number, number>
  turnNumber: number
  gameActive: boolean
}

export const SUITS = ['♠', '♥', '♦', '♣'] as const
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const

export const CARD_RULES: Record<string, CardRule> = {
  A: { title: 'Waterfall', emoji: '🌊', desc: 'Everyone begins drinking at the same time. The player who drew the card may stop whenever they choose. Moving clockwise, each player may only stop after the person before them has stopped.' },
  2: { title: 'You', emoji: '👉', desc: 'Choose any player to take a drink.' },
  3: { title: 'Me', emoji: '🍻', desc: 'You take a drink.' },
  4: { title: 'Floor', emoji: '👇', desc: 'Everyone races to touch the floor. The last player to do so takes a drink.' },
  5: { title: 'Guys', emoji: '👨', desc: 'All male players drink. (Or choose another group if your players prefer.)' },
  6: { title: 'Girls', emoji: '👩', desc: 'All female players drink. (Or choose another group if your players prefer.)' },
  7: { title: 'Heaven', emoji: '☝️', desc: 'Everyone points toward the ceiling. The last player to do so drinks.' },
  8: { title: 'Mate', emoji: '🤝', desc: 'Choose another player to become your drinking partner. Whenever one of you drinks, the other must drink too. This lasts until a new Mate is chosen.' },
  9: { title: 'Rhyme', emoji: '🎤', desc: 'Say any word. Going clockwise, each player must quickly say a word that rhymes. The first player who hesitates, repeats a word, or cannot think of one drinks.' },
  10: { title: 'Categories', emoji: '📚', desc: 'Choose a category (Movies, Animals, Countries, Foods, etc.). Players take turns naming something in that category. The first player who cannot answer drinks.' },
  J: { title: 'Make a Rule', emoji: '📜', desc: 'Create a new rule that everyone must follow for the rest of the game. Anyone who breaks the rule takes a drink.' },
  Q: { title: 'Questions', emoji: '❓', desc: 'Ask another player a question. They must answer with a different question. Continue back and forth until someone hesitates, repeats a question, or answers normally. That player drinks.' },
  K: { title: "King's Cup", emoji: '👑', desc: "Pour a portion of your drink into the King's Cup. The player who draws the fourth King must drink everything inside the King's Cup." },
}

export const HOUSE_RULES = [
  { emoji: '🚫', label: 'No phones' },
  { emoji: '👉', label: 'No pointing' },
  { emoji: '📛', label: 'No first names' },
  { emoji: '😂', label: 'No swearing' },
  { emoji: '✋', label: 'Pinky up' },
  { emoji: '🎭', label: 'Speak in an accent' },
  { emoji: '👀', label: 'No eye contact' },
]

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}` })
    }
  }
  return deck
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function isRed(suit: string): boolean {
  return suit === '♥' || suit === '♦'
}
