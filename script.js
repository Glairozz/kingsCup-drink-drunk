/* ─── State ─── */
const state = {
  players: [],
  currentPlayerIndex: 0,
  deck: [],
  drawnCards: [],
  kingsDrawn: 0,
  cupFillPercent: 0,
  activeRules: [],
  mates: {},        // partnerId -> partnerId
  turnNumber: 0,
  gameActive: false,
};

/* ─── Card Constants ─── */
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const CARD_RULES = {
  'A': { title: 'Waterfall', emoji: '🌊', desc: 'Everyone begins drinking at the same time. The player who drew the card may stop whenever they choose. Moving clockwise, each player may only stop after the person before them has stopped.' },
  '2': { title: 'You', emoji: '👉', desc: 'Choose any player to take a drink.' },
  '3': { title: 'Me', emoji: '🍻', desc: 'You take a drink.' },
  '4': { title: 'Floor', emoji: '👇', desc: 'Everyone races to touch the floor. The last player to do so takes a drink.' },
  '5': { title: 'Guys', emoji: '👨', desc: 'All male players drink. (Or choose another group if your players prefer.)' },
  '6': { title: 'Girls', emoji: '👩', desc: 'All female players drink. (Or choose another group if your players prefer.)' },
  '7': { title: 'Heaven', emoji: '☝️', desc: 'Everyone points toward the ceiling. The last player to do so drinks.' },
  '8': { title: 'Mate', emoji: '🤝', desc: 'Choose another player to become your drinking partner. Whenever one of you drinks, the other must drink too. This lasts until a new Mate is chosen.' },
  '9': { title: 'Rhyme', emoji: '🎤', desc: 'Say any word. Going clockwise, each player must quickly say a word that rhymes. The first player who hesitates, repeats a word, or cannot think of one drinks.' },
  '10': { title: 'Categories', emoji: '📚', desc: 'Choose a category (Movies, Animals, Countries, Foods, etc.). Players take turns naming something in that category. The first player who cannot answer drinks.' },
  'J': { title: 'Make a Rule', emoji: '📜', desc: 'Create a new rule that everyone must follow for the rest of the game. Anyone who breaks the rule takes a drink.' },
  'Q': { title: 'Questions', emoji: '❓', desc: 'Ask another player a question. They must answer with a different question. Continue back and forth until someone hesitates, repeats a question, or answers normally. That player drinks.' },
  'K': { title: "King's Cup", emoji: '👑', desc: 'Pour a portion of your drink into the King\'s Cup. The player who draws the fourth King must drink everything inside the King\'s Cup.' },
};

/* ─── Deck ─── */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}` });
    }
  }
  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ─── Setup ─── */
function addPlayer(name) {
  const container = document.getElementById('player-inputs');
  const row = document.createElement('div');
  row.className = 'player-input-row';
  row.innerHTML = `
    <input type="text" class="player-input" placeholder="Player name..." value="${name || `Player ${container.children.length + 1}`}">
    <button class="btn-remove" onclick="removePlayer(this)" title="Remove">✕</button>
  `;
  container.appendChild(row);
}

function removePlayer(btn) {
  const rows = document.querySelectorAll('#player-inputs .player-input-row');
  if (rows.length <= 2) return;
  btn.closest('.player-input-row').remove();
}

function getSetupPlayers() {
  return [...document.querySelectorAll('#player-inputs .player-input')]
    .map(inp => inp.value.trim())
    .filter(Boolean);
}

function getHouseRules() {
  return [...document.querySelectorAll('.house-rules input:checked')]
    .map(cb => cb.value);
}

/* ─── Start Game ─── */
function startGame() {
  const names = getSetupPlayers();
  if (names.length < 2) {
    alert('Need at least 2 players!');
    return;
  }

  state.players = names.map((name, i) => ({
    id: i,
    name,
    drinkCount: 0,
  }));
  state.currentPlayerIndex = 0;
  state.deck = shuffle(createDeck());
  state.drawnCards = [];
  state.kingsDrawn = 0;
  state.cupFillPercent = 0;
  state.activeRules = getHouseRules();
  state.mates = {};
  state.turnNumber = 0;
  state.gameActive = true;

  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');

  renderAll();
}

/* ─── Render ─── */
function renderAll() {
  renderPlayers();
  renderCards();
  renderCup();
  renderRules();
  renderTurn();
  renderKings();
}

function renderPlayers() {
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  state.players.forEach((p, i) => {
    const chip = document.createElement('span');
    chip.className = 'player-chip';
    if (i === state.currentPlayerIndex && state.gameActive) chip.classList.add('active-turn');
    const partnerId = Object.entries(state.mates).find(([a, b]) => a == p.id || b == p.id);
    if (partnerId) chip.classList.add('partnered');
    chip.innerHTML = `${p.name} <span class="drink-count">(${p.drinkCount}×)</span>`;
    list.appendChild(chip);
  });
}

function renderCards() {
  const circle = document.getElementById('cards-circle');
  circle.innerHTML = '';

  const remaining = state.deck.length;
  if (remaining === 0) return;

  const radius = Math.min(210, 150 + remaining * 3);
  const angleStep = (2 * Math.PI) / remaining;
  const offset = -Math.PI / 2;

  // Center cup
  const cup = document.getElementById('cup');

  state.deck.forEach((card, i) => {
    const el = document.createElement('div');
    el.className = 'card card-back';
    el.dataset.index = i;
    const angle = offset + i * angleStep;
    const x = radius * Math.cos(angle) - 35;
    const y = radius * Math.sin(angle) - 50;
    el.style.left = `calc(50% + ${x}px)`;
    el.style.top = `calc(50% + ${y}px)`;
    el.style.transform = `rotate(${angle + Math.PI / 2}rad)`;
    el.style.zIndex = Math.round(i);
    el.addEventListener('click', () => drawCard(i));
    circle.appendChild(el);
  });

  cup.style.left = '50%';
  cup.style.top = '50%';
  cup.style.transform = 'translate(-50%, -50%)';
}

function renderCup() {
  const fill = document.getElementById('cup-fill');
  fill.style.height = Math.min(state.cupFillPercent, 100) + '%';
}

function renderRules() {
  const list = document.getElementById('rules-list');
  if (state.activeRules.length === 0) {
    list.textContent = 'None';
  } else {
    list.textContent = state.activeRules.map(r => `• ${r}`).join('  ');
  }
}

function renderTurn() {
  const p = state.players[state.currentPlayerIndex];
  document.getElementById('turn-name').textContent = p ? p.name : '—';
}

function renderKings() {
  document.getElementById('king-counter').textContent = `👑 ${state.kingsDrawn}/4`;
}

/* ─── Draw Card ─── */
function drawCard(index) {
  if (!state.gameActive) return;
  const card = state.deck[index];
  if (!card) return;

  state.deck.splice(index, 1);
  state.drawnCards.push(card);
  state.turnNumber++;

  const rule = CARD_RULES[card.rank];

  // Handle King's Cup
  if (card.rank === 'K') {
    state.kingsDrawn++;
    renderKings();
    const pour = Math.random() * 15 + 5;
    state.cupFillPercent = Math.min(100, state.cupFillPercent + pour);
    renderCup();
  }

  renderCards();
  renderPlayers();

  showCardModal(card, rule, () => {
    executeCardRule(card);
    nextTurn();
  });
}

/* ─── Execute Card Rules ─── */
function executeCardRule(card) {
  const rank = card.rank;
  const drawer = state.players[state.currentPlayerIndex];

  switch (rank) {
    case '2': // You — pick someone to drink
      showPickPlayerModal(`Who should drink?`, (target) => {
        drinkPlayer(target);
      });
      break;

    case '3': // Me
      drinkPlayer(drawer);
      break;

    case '8': // Mate
      showPickPlayerModal(`Choose your drinking partner!`, (target) => {
        if (target.id === drawer.id) return;
        state.mates[drawer.id] = target.id;
        state.mates[target.id] = drawer.id;
        renderPlayers();
        showToast(`${drawer.name} and ${target.name} are now drinking partners!`);
      });
      break;

    case 'J': // Make a Rule
      showMakeRuleModal();
      break;

    case 'K': // King's Cup
      if (state.kingsDrawn >= 4) {
        showToast(`💀 ${drawer.name} must drink the King's Cup!`, 5000);
        drinkPlayer(drawer);
        state.cupFillPercent = 0;
        renderCup();
        // End game
        setTimeout(() => endGame(), 3000);
      } else {
        showToast(`${drawer.name} pours into the King's Cup! (King ${state.kingsDrawn}/4)`);
      }
      break;

    default:
      // For cards that don't require interactive follow-up (4,5,6,7,9,10,Q,A)
      // just show the rule description in the modal which is already displayed
      break;
  }
}

function drinkPlayer(player) {
  player.drinkCount++;
  // Also make mate drink
  const mateId = state.mates[player.id];
  if (mateId !== undefined) {
    const mate = state.players.find(p => p.id === mateId);
    if (mate) {
      mate.drinkCount++;
      showToast(`${player.name} drinks! ${mate.name} drinks too (mate)!`, 2000);
    }
  }
  renderPlayers();
}

function nextTurn() {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  renderTurn();
  renderPlayers();
}

/* ─── Modals ─── */
function showCardModal(card, rule, onClose) {
  const overlay = document.getElementById('overlay');
  const content = document.getElementById('overlay-content');
  const isRed = card.suit === '♥' || card.suit === '♦';

  content.innerHTML = `
    <div class="card-reveal">
      <div class="big-card ${isRed ? 'red' : 'black'}">
        <span class="rank">${card.rank}</span>
        <span class="suit">${card.suit}</span>
      </div>
      <h2>${rule.emoji} ${rule.title}</h2>
      <p class="rule-desc">${rule.desc}</p>
      <button class="btn btn-primary" id="modal-close-btn" style="width:100%">OK</button>
    </div>
  `;
  overlay.classList.remove('hidden');

  document.getElementById('modal-close-btn').onclick = () => {
    overlay.classList.add('hidden');
    if (onClose) onClose();
  };
}

function showPickPlayerModal(title, onPick) {
  const overlay = document.getElementById('overlay');
  const content = document.getElementById('overlay-content');
  const drawer = state.players[state.currentPlayerIndex];

  let html = `
    <div class="modal-body">
      <h2 class="modal-title">${title}</h2>
      <div style="display:flex;flex-direction:column;gap:.5rem;">
  `;

  state.players.forEach(p => {
    html += `<button class="btn btn-secondary" data-player-id="${p.id}">${p.name}</button>`;
  });

  html += `
      </div>
    </div>
  `;
  content.innerHTML = html;
  overlay.classList.remove('hidden');

  content.querySelectorAll('[data-player-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.playerId);
      const player = state.players.find(p => p.id === id);
      overlay.classList.add('hidden');
      if (onPick) onPick(player);
    });
  });
}

function showMakeRuleModal() {
  const overlay = document.getElementById('overlay');
  const content = document.getElementById('overlay-content');

  content.innerHTML = `
    <div class="modal-body">
      <h2 class="modal-title">📜 Make a Rule</h2>
      <label for="new-rule">Describe your rule:</label>
      <textarea id="new-rule" placeholder="No pointing, drink with left hand, no saying first names..."></textarea>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="rule-cancel">Skip</button>
        <button class="btn btn-primary" id="rule-add">Add Rule</button>
      </div>
    </div>
  `;
  overlay.classList.remove('hidden');
  document.getElementById('new-rule').focus();

  document.getElementById('rule-add').onclick = () => {
    const text = document.getElementById('new-rule').value.trim();
    if (text) {
      state.activeRules.push(text);
      renderRules();
      showToast(`📜 New rule: "${text}"`);
    }
    overlay.classList.add('hidden');
  };

  document.getElementById('rule-cancel').onclick = () => {
    overlay.classList.add('hidden');
  };
}

function showRulesModal() {
  const overlay = document.getElementById('overlay');
  const content = document.getElementById('overlay-content');

  let rulesHtml = state.activeRules.length === 0
    ? '<p style="color:#888">No active rules.</p>'
    : '';

  state.activeRules.forEach((r, i) => {
    rulesHtml += `<div class="rule-list-item">${r} <span style="float:right;cursor:pointer;color:#e94560;" onclick="removeRule(${i})">✕</span></div>`;
  });

  content.innerHTML = `
    <div class="modal-body">
      <h2 class="modal-title">📜 Active Rules</h2>
      <div class="rule-list">${rulesHtml}</div>
      <button class="btn btn-secondary" onclick="closeModal()" style="width:100%">Close</button>
    </div>
  `;
  overlay.classList.remove('hidden');
}

function removeRule(index) {
  state.activeRules.splice(index, 1);
  renderRules();
  showRulesModal();
}

function closeModal() {
  document.getElementById('overlay').classList.add('hidden');
}

/* ─── End Game ─── */
function endGame() {
  state.gameActive = false;

  const sorted = [...state.players].sort((a, b) => b.drinkCount - a.drinkCount);
  const overlay = document.getElementById('overlay');
  const content = document.getElementById('overlay-content');

  let podium = '';
  sorted.forEach((p, i) => {
    const medal = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '×';
    podium += `<div class="rule-list-item">${medal} ${p.name} — ${p.drinkCount} drinks</div>`;
  });

  content.innerHTML = `
    <div class="card-reveal">
      <h1 style="font-size:3rem;margin-bottom:.5rem;">🏆</h1>
      <h2>Game Over!</h2>
      <p style="color:#888;margin-bottom:1rem;">${sorted[0].name} drinks the most! 🎉</p>
      <div style="text-align:left;margin-bottom:1.5rem;">
        <h3 style="margin-bottom:.5rem;">Final Scores</h3>
        ${podium}
      </div>
      <div style="display:flex;gap:.75rem;">
        <button class="btn btn-secondary" onclick="closeModal(); location.reload();" style="flex:1">Play Again</button>
      </div>
    </div>
  `;
  overlay.classList.remove('hidden');
  renderPlayers();
}

function confirmEndGame() {
  if (!confirm('End the current game?')) return;
  endGame();
}

/* ─── Toast ─── */
function showToast(msg, duration = 2000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
    background: #16213e; color: #fff; padding: .75rem 1.5rem;
    border-radius: 2rem; font-size: .95rem; z-index: 200;
    box-shadow: 0 5px 20px rgba(0,0,0,.5);
    animation: fadeIn .3s;
    max-width: 90vw; text-align: center;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
