// Metadados da interface.
// Estes textos/custos são só para renderização local; o servidor valida as regras reais.
const ACTION_META = {
  CHARGE: { label: "CARREGAR", cost: 0 },
  SHOOT: { label: "DISPARAR", cost: 1 },
  SHIELD: { label: "DEFENDER", cost: 0 },
  POWER_SHOT: { label: "TIRO PODEROSO", cost: 3 },
  PIERCE_SHOT: { label: "TIRO PERFURANTE", cost: 2 },
  REFLECT_SHIELD: { label: "ESCUDO REFLECTOR", cost: 1 },
  VAMPIRIC_SHOT: { label: "TIRO VAMPIRICO", cost: 2 },
  DODGE: { label: "ESQUIVA", cost: 1 },
  DOUBLE_CHARGE: { label: "CARGA DUPLA", cost: 0 },
  BROKEN_HAND: { label: "MAO QUEBRADA", cost: 2 },
  CURSE_BRAND_HIDDEN: { label: "MARCA DA MALDICAO", cost: 2 },
  OVERLOAD: { label: "CANHÃO DE ENERGIA", cost: 4 },
  FORTRESS: { label: "FORTALEZA", cost: 0 },
  BLOOD_PACT: { label: "PACTO DE SANGUE", cost: 0 },
  SCAN: { label: "ANALISE", cost: 0 },
};

const UI_MAX_HP = 5;
const UI_MAX_ENERGY = 5;
const DEFAULT_PLAYER_NAMES = {
  player1: "Jogador 1",
  player2: "Jogador 2",
};

const LOADOUT_COPY = {
  POWER_SHOT: "2 dano, 1 atravessa Defesa.",
  PIERCE_SHOT: "1 dano, ignora Defesa.",
  REFLECT_SHIELD: "Reflecte Disparar. Recarga 2 rondas.",
  VAMPIRIC_SHOT: "1 dano, cura 1 Vida se acertar. Recarga 2 rondas.",
  DODGE: "Evita ataque nao-ultimato. Recarga 2 rondas.",
  DOUBLE_CHARGE: "Ganha +2 Energia. Recarga 2 rondas.",
  BROKEN_HAND: "1 dano; desativa o Especial inimigo na proxima ronda.",
  CURSE_BRAND_HIDDEN: "1 dano; se acertar, rouba 1 Energia.",
  OVERLOAD: "3 dano. Vs Defesa: 2. Quebra Refletor. Uso unico.",
  FORTRESS: "Bloqueia todo o dano. Se bloquear, ganha +2 Energia. Uso unico.",
  BLOOD_PACT: "Perde 1 Vida e ganha +4 Energia. Uso unico.",
  SCAN: "Revela o Secreto rival; se ja revelado, ganha +1 Energia.",
};

const ACTION_UI_META = {
  CHARGE: { label: "CARREGAR", desc: "+1 Energia." },
  SHOOT: { label: "DISPARAR", desc: "1 dano." },
  SHIELD: { label: "DEFENDER", desc: "Bloqueia tiro." },
  POWER_SHOT: { label: "TIRO PODEROSO", desc: "2 dano; fura Defesa." },
  PIERCE_SHOT: { label: "TIRO PERFURANTE", desc: "Ignora Defesa." },
  REFLECT_SHIELD: { label: "ESCUDO REFLETOR", desc: "Reflete tiro. Recarga 2." },
  VAMPIRIC_SHOT: { label: "TIRO VAMPIRICO", desc: "Dano + cura. Recarga 2." },
  DODGE: { label: "ESQUIVA", desc: "Evita ataque. Recarga 2." },
  DOUBLE_CHARGE: { label: "CARGA DUPLA", desc: "+2 Energia. Recarga 2." },
  BROKEN_HAND: { label: "MAO QUEBRADA", desc: "Desativa Especial." },
  CURSE_BRAND_HIDDEN: { label: "MARCA DA MALDICAO", desc: "Dano + rouba energia." },
  OVERLOAD: { label: "CANHÃO DE ENERGIA", desc: "3 dano; quebra Refletor." },
  FORTRESS: { label: "FORTALEZA", desc: "Bloqueia e ganha +2E." },
  BLOOD_PACT: { label: "PACTO DE SANGUE", desc: "-1 Vida, +4 Energia." },
  SCAN: { label: "ANALISE", desc: "Revela Secreto." },
};

const ACTION_ICON_ASSET = {
  CHARGE: "assets/ui/icon-charge.png",
  SHOOT: "assets/ui/icon-shot.png",
  SHIELD: "assets/ui/icon-shield.png",
  POWER_SHOT: "assets/ui/icon-power-shot.png",
  PIERCE_SHOT: "assets/ui/icon-pierce-shot.png",
  REFLECT_SHIELD: "assets/ui/icon-reflect-shield.png",
  VAMPIRIC_SHOT: "assets/ui/icon-vampiric-shot.png",
  DODGE: "assets/ui/icon-dodge.png",
  DOUBLE_CHARGE: "assets/ui/icon-double-charge.png",
  BROKEN_HAND: "assets/ui/icon-broken-hand.png",
  CURSE_BRAND_HIDDEN: "assets/ui/icon-devil-mark.png",
  OVERLOAD: "assets/ui/icon-overload.png",
  FORTRESS: "assets/ui/icon-fortress.png",
  BLOOD_PACT: "assets/ui/icon-blood-pact.png",
  SCAN: "assets/ui/icon-scan.png"
};

const ONE_TIME_ACTIONS = new Set([
  "OVERLOAD",
  "FORTRESS",
  "BLOOD_PACT",
  "SCAN",
]);

// Referências ao DOM
const statusEl = document.getElementById("status");
const hudEl = document.getElementById("hud");
const roundEl = document.getElementById("round");
const myStatsEl = document.getElementById("my-stats");
const oppStatsEl = document.getElementById("opp-stats");
const loadoutPanel = document.getElementById("loadout-panel");
const specialPicksEl = document.getElementById("special-picks");
const actionsPanel = document.getElementById("actions-panel");
const baseActionsEl = document.getElementById("base-actions");
const specialActionsEl = document.getElementById("special-actions");
const messageEl = document.getElementById("message");
const resultEl = document.getElementById("result");
const rematchPanel = document.getElementById("rematch-panel");
const rematchBtn = document.getElementById("rematch-btn");
const rematchWaitGif = document.getElementById("rematch-wait-gif");
const rematchVersusEl = document.getElementById("rematch-versus");
const rematchStatusTextEl = document.getElementById("rematch-status-text");
const namePanel = document.getElementById("name-panel");
const nameInput = document.getElementById("name-input");
const nameSubmitBtn = document.getElementById("name-submit");
const waitPanel = document.getElementById("wait-panel");
const waitPlayerNameEl = document.getElementById("wait-player-name");
const waitPlayerStatsEl = document.getElementById("wait-player-stats");
const waitCancelBtn = document.getElementById("wait-cancel-btn");

// Estado do cliente
let ws = null;
let myPlayer = null;
let matchPhase = "lobby";
let gameOver = false;
let gameOverOutcome = null;
let currentRound = 1;
let myData = null;
let oppData = null;
let actionLocked = false;
let uiPhase = "idle";

let loadoutOptions = null;
let selectedVisibleSpecial = null;
let selectedHiddenSpecial = null;
let selectedUltimate = null;

let hasEnteredName = false;
let rematchRequested = false;
let playerDisplayName = "Jogador";
let opponentDisplayName = "RIVAL";
let latestPlayerNames = { ...DEFAULT_PLAYER_NAMES };
let rematchStatusText = "";
let awaitingOpponentFromLoadout = false;
let playersOnline = 0;

// Ligação WebSocket
function connect() {
  const url = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`;
  ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    updatePhaseClass();
    updateOnlineStatus();
    if (hasEnteredName) {
      ws.send(JSON.stringify({ type: "SET_NAME", name: playerDisplayName }));
    }
  });

  ws.addEventListener("message", (e) => {
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch {
      setMessage("Mensagem invalida do servidor.");
      return;
    }
    handleServerMessage(msg);
  });

  ws.addEventListener("close", () => {
    setStatus("DESLIGADO");
    setMessage("Atualiza a pagina para voltar a ligar.");
  });
}

// Receção de mensagens
function handleServerMessage(msg) {
  // O cliente é orientado por mensagens do servidor. Cada mensagem atualiza estado local
  // e depois chama updatePlayState/show* para manter DOM e classes CSS sincronizados.
  switch (msg.type) {
    case "ASSIGN_PLAYER":
      myPlayer = msg.player;
      hudEl.hidden = false;
      break;
    case "LOADOUT_OPTIONS":
      loadoutOptions = msg;
      renderLoadoutPanel();
      break;
    case "GAME_STATE":
      updateOnlineStatus(msg.playersConnected);
      break;
    case "MATCH":
      applyMatchData(msg);
      if (myPlayer && msg.phase === "loadout") {
        awaitingOpponentFromLoadout = !!msg[myPlayer]?.loadoutReady;
      } else if (msg.phase === "playing" || msg.gameOver) {
        awaitingOpponentFromLoadout = false;
      }
      updatePlayState();
      break;
    case "MATCH_START":
      awaitingOpponentFromLoadout = false;
      matchPhase = "playing";
      uiPhase = "playing";
      actionLocked = false;
      hideResult();
      setMessage("DUELO EM CURSO");
      updatePlayState();
      break;
    case "ROUND_STATUS":
      // Confirma que alguém trancou uma ação; o detalhe visual dos locks foi removido.
      if (actionLocked) setMessage("Trancado. A aguardar o adversario...");
      break;
    case "REVEAL":
      uiPhase = "reveal";
      actionsPanel.hidden = true;
      showReveal(msg);
      break;
    case "RESOLVE":
      showResolve(msg);
      actionLocked = false;
      uiPhase = gameOver ? "gameover" : "playing";
      if (!gameOver) {
        setMessage("Escolhe a tua acao.");
        updatePlayState();
      }
      break;
    case "GAME_OVER":
      showGameOver(msg);
      break;
    case "REMATCH_STATUS":
      rematchPanel.hidden = false;
      if (msg.playerNames) {
        latestPlayerNames = {
          player1: normalizePlayerName(msg.playerNames.player1 ?? DEFAULT_PLAYER_NAMES.player1),
          player2: normalizePlayerName(msg.playerNames.player2 ?? DEFAULT_PLAYER_NAMES.player2),
        };
        const oppId = myPlayer === "player1" ? "player2" : "player1";
        const myName = msg.playerNames[myPlayer];
        const oppName = msg.playerNames[oppId];
        if (myName) applyPlayerName(normalizePlayerName(myName));
        opponentDisplayName = normalizePlayerName(oppName ?? opponentDisplayName);
      }
      if (gameOver && myPlayer) {
        const myReady = myPlayer === "player1" ? !!msg.player1Ready : !!msg.player2Ready;
        const oppId = myPlayer === "player1" ? "player2" : "player1";
        const oppReady = oppId === "player1" ? !!msg.player1Ready : !!msg.player2Ready;
        const bothReady = !!msg.player1Ready && !!msg.player2Ready;
        setRematchWaiting(rematchRequested && myReady && !bothReady);
        if (bothReady) {
          updateRematchHeader("A preparar desforra...");
        } else if (myReady) {
          updateRematchHeader("A aguardar resposta do rival...");
        } else if ((msg.requestedBy && msg.requestedBy !== myPlayer) || oppReady) {
          const requestedByName = normalizePlayerName(msg.requestedByName ?? latestPlayerNames[oppId] ?? opponentDisplayName);
          updateRematchHeader(`${requestedByName} pediu desforra`);
        } else {
          updateRematchHeader();
        }
      }
      break;
    case "REMATCH_START":
      awaitingOpponentFromLoadout = false;
      gameOver = false;
      gameOverOutcome = null;
      actionLocked = false;
      uiPhase = "idle";
      matchPhase = "loadout";
      selectedVisibleSpecial = null;
      selectedHiddenSpecial = null;
      selectedUltimate = null;
      hideResult();
      rematchPanel.hidden = true;
      rematchRequested = false;
      rematchStatusText = "";
      rematchBtn.disabled = false;
      setRematchWaiting(false);
      updateRematchHeader();
      updatePlayState();
      break;
    case "OPPONENT_LEFT":
      awaitingOpponentFromLoadout = false;
      matchPhase = "lobby";
      gameOver = false;
      gameOverOutcome = null;
      rematchRequested = false;
      rematchStatusText = "";
      rematchBtn.disabled = false;
      hasEnteredName = false;
      updatePhaseClass();
      setMessage(msg.message ?? "O adversario saiu.");
      actionsPanel.hidden = true;
      loadoutPanel.hidden = true;
      setRematchWaiting(false);
      updatePlayState();
      break;
    case "ERROR":
      setMessage(msg.message);
      if (!msg.message?.includes("locked")) {
        actionLocked = false;
        updatePlayState();
      }
      break;
  }
}

// Renderização da interface
function updatePhaseClass() {
  // As classes do <body> controlam quase todo o layout: nome, loadout, espera, jogo e fim.
  document.body.classList.remove("gameover-win", "gameover-lose", "gameover-draw");
  if (!hasEnteredName) {
    document.body.classList.remove("phase-loadout", "phase-waiting", "phase-playing", "phase-gameover");
    document.body.classList.add("phase-name");
    return;
  }
  if (awaitingOpponentFromLoadout) {
    document.body.classList.remove("phase-name", "phase-loadout", "phase-playing", "phase-gameover");
    document.body.classList.add("phase-waiting");
    return;
  }
  const inLoadout = matchPhase === "loadout" || matchPhase === "lobby";
  const phaseClass = gameOver ? "phase-gameover" : (inLoadout ? "phase-loadout" : "phase-playing");
  document.body.classList.remove("phase-name", "phase-loadout", "phase-waiting", "phase-playing", "phase-gameover");
  document.body.classList.add(phaseClass);
  if (gameOver && gameOverOutcome) {
    document.body.classList.add(`gameover-${gameOverOutcome}`);
  }
}

function updateWaitPanel() {
  if (!waitPanel) return;
  waitPlayerNameEl.textContent = playerDisplayName;
  const hp = myData?.hp ?? 5;
  const energy = myData?.energy ?? 0;
  waitPlayerStatsEl.textContent = `VIDA ${hp}/5 - ENERGIA ${energy}/5`;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setMessage(text) {
  messageEl.textContent = text;
}

function hideResult() {
  resultEl.hidden = true;
  resultEl.innerHTML = "";
}

function setRematchWaiting(active) {
  if (rematchWaitGif) rematchWaitGif.hidden = !active;
  if (rematchBtn) rematchBtn.classList.toggle("is-waiting", !!active);
}

function updateRematchHeader(statusText = rematchStatusText) {
  // Guarda o texto para sobreviver a rerenders enquanto o painel de rematch está aberto.
  rematchStatusText = statusText ?? "";
  if (rematchVersusEl) {
    rematchVersusEl.textContent = `${getPlayerName("player1")} VS ${getPlayerName("player2")}`;
  }
  if (rematchStatusTextEl) {
    rematchStatusTextEl.textContent = rematchStatusText;
    rematchStatusTextEl.hidden = !rematchStatusText;
  }
}

function applyMatchData(match) {
  // Centraliza a atualização dos dados vindos do servidor para evitar leituras antigas.
  matchPhase = match.phase;
  currentRound = match.round;
  gameOver = match.gameOver;
  myData = match[myPlayer];
  oppData = match[myPlayer === "player1" ? "player2" : "player1"];
  if (match.playerNames) {
    latestPlayerNames = {
      player1: normalizePlayerName(match.playerNames.player1 ?? DEFAULT_PLAYER_NAMES.player1),
      player2: normalizePlayerName(match.playerNames.player2 ?? DEFAULT_PLAYER_NAMES.player2),
    };
    const myName = match.playerNames[myPlayer];
    const oppId = myPlayer === "player1" ? "player2" : "player1";
    const oppName = match.playerNames[oppId];
    if (myName) applyPlayerName(normalizePlayerName(myName));
    opponentDisplayName = normalizePlayerName(oppName ?? "RIVAL");
  }
}

function renderMeter(value, max, cls) {
  // O HUD mostra sempre 5 segmentos visuais; o servidor já limita os valores reais.
  const safe = Math.max(0, Math.min(max, value));
  const visualTotal = 5;
  const filled = safe;
  const icons = cls === "hp"
    ? { on: "assets/ui/icon-heart.png", off: "assets/ui/icon-dead-heart.png" }
    : { on: "assets/ui/icon-energy-full.png", off: "assets/ui/icon-energy-empty.png" };
  const on = `<span class="meter-seg on"><img src="${icons.on}" alt="" /></span>`.repeat(filled);
  const off = `<span class="meter-seg"><img src="${icons.off}" alt="" /></span>`.repeat(Math.max(0, visualTotal - filled));
  return `<span class="meter meter-${cls}">${on}${off}</span>`;
}

function renderHudCard(label, data, variant = "rival") {
  const loadoutIcons = renderHudLoadoutIcons(data);
  return `
    <div class="hud-card hud-card-${variant}">
      <div class="hud-card-title"><span class="hud-name">${label}</span></div>
      ${loadoutIcons}
      <div class="hud-row hud-row-hp">
        <span class="hud-k">VIDA</span>
        ${renderMeter(data.hp, UI_MAX_HP, "hp")}
        <span class="hud-v">${data.hp}/${UI_MAX_HP}</span>
      </div>
      <div class="hud-row hud-row-energy">
        <span class="hud-k">ENERGIA</span>
        ${renderMeter(data.energy, UI_MAX_ENERGY, "en")}
        <span class="hud-v">${data.energy}/${UI_MAX_ENERGY}</span>
      </div>
    </div>
  `;
}

function updateHud() {
  if (!myPlayer || !myData) {
    hudEl.hidden = true;
    return;
  }
  hudEl.hidden = false;
  roundEl.textContent = `RONDA ${currentRound}`;
  myStatsEl.innerHTML = renderHudCard(playerDisplayName.toUpperCase(), myData, "self");
  oppStatsEl.innerHTML = renderHudCard(opponentDisplayName.toUpperCase(), oppData, "rival");
}

function showPanels() {
  // Decide qual painel fica visível com base no estado composto do cliente.
  // Assim, cada mensagem WebSocket não precisa de gerir o DOM manualmente.
  if (!hasEnteredName) {
    namePanel.hidden = false;
    hudEl.hidden = true;
    loadoutPanel.hidden = true;
    actionsPanel.hidden = true;
    waitPanel.hidden = true;
    rematchPanel.hidden = true;
    setMessage("Introduz o teu nome para comecar.");
    return;
  }

  if (gameOver) {
    namePanel.hidden = true;
    loadoutPanel.hidden = true;
    actionsPanel.hidden = true;
    waitPanel.hidden = true;
    hudEl.hidden = true;
    rematchPanel.hidden = false;
    updateRematchHeader();
    setMessage("");
    return;
  }

  namePanel.hidden = true;
  const inLoadout = matchPhase === "loadout" || matchPhase === "lobby";
  const needLoadout = inLoadout && myData && !myData.loadoutReady;
  const playing = matchPhase === "playing" && !gameOver;
  const waiting = awaitingOpponentFromLoadout && inLoadout;

  loadoutPanel.hidden = !needLoadout;
  actionsPanel.hidden = !playing || uiPhase === "reveal";
  waitPanel.hidden = !waiting;
  rematchPanel.hidden = !gameOver;

  if (waiting) {
    loadoutPanel.hidden = true;
    actionsPanel.hidden = true;
    updateWaitPanel();
    setMessage("");
    return;
  }

  if (needLoadout) {
    renderLoadoutPanel();
  } else if (playing) {
    renderActionPanel();
  }
}

function updatePlayState() {
  updatePhaseClass();
  updateHud();
  showPanels();
  if (matchPhase === "playing" && !actionLocked && !gameOver && uiPhase === "playing") setMessage("Escolhe a tua acao.");
}

function showReveal(msg) {
  // Fase intermédia: mostra as escolhas antes de aparecer o log da ronda.
  uiPhase = "reveal";
  if (msg.playerNames) {
    latestPlayerNames = {
      player1: normalizePlayerName(msg.playerNames.player1 ?? latestPlayerNames.player1),
      player2: normalizePlayerName(msg.playerNames.player2 ?? latestPlayerNames.player2),
    };
  }
  actionsPanel.hidden = true;
  setMessage("A revelar...");
  resultEl.innerHTML = `
    <h2>Acoes reveladas</h2>
    <p class="reveal-action p1">${escapeHtml(getPlayerName("player1"))}: <strong>${escapeHtml(actionLabel(msg.player1Action))}</strong></p>
    <p class="reveal-action p2">${escapeHtml(getPlayerName("player2"))}: <strong>${escapeHtml(actionLabel(msg.player2Action))}</strong></p>
  `;
  resultEl.hidden = false;
}

function showResolve(msg) {
  // Os logs já vêm com nomes finais do servidor; aqui só escapamos HTML e renderizamos.
  applyMatchData(msg);
  const lines = (msg.log ?? []).map((l) => `<li>${escapeHtml(l)}</li>`).join("");
  resultEl.innerHTML = `
    <h2>RONDA ${currentRound - 1} RESOLVIDA</h2>
    <ul class="resolve-log">${lines}</ul>
  `;
  updateHud();
}

function showGameOver(msg) {
  gameOver = true;
  uiPhase = "gameover";
  const text = msg.winner === "draw" ? "EMPATE" : (msg.winner === myPlayer ? "VENCESTE" : "PERDESTE");
  gameOverOutcome = msg.winner === "draw" ? "draw" : (msg.winner === myPlayer ? "win" : "lose");
  updatePhaseClass();
  rematchRequested = false;
  rematchStatusText = "";
  rematchBtn.disabled = false;
  setMessage("");
  resultEl.innerHTML = `<p class="gameover-word">${text}</p>`;
  resultEl.hidden = false;
  rematchPanel.hidden = false;
  updateRematchHeader();
  setRematchWaiting(false);
  showPanels();
}

// Renderização do loadout
function updateLoadoutScale() {
  const safeWidth = Math.max(320, window.innerWidth - 24);
  const safeHeight = Math.max(320, window.innerHeight - 24);
  const scale = Math.min(safeWidth / 1600, safeHeight / 900);
  document.documentElement.style.setProperty("--loadout-scale", String(scale));
}

function renderLoadoutPanel() {
  if (!loadoutOptions) return;
  specialPicksEl.innerHTML = "";
  updateLoadoutScale();

  // Indexa as opções recebidas do servidor para montar colunas fixas na ordem visual desejada.
  const byId = new Map();
  for (const item of (loadoutOptions.visibleSpecials ?? [])) byId.set(item.id, item);
  for (const item of (loadoutOptions.hiddenSpecials ?? [])) byId.set(item.id, item);
  for (const item of (loadoutOptions.ultimates ?? [])) byId.set(item.id, item);

  const categories = [
    {
      key: "special",
      label: "ESPECIAL",
      headIcon: "assets/ui/icon-category-special.png",
      selected: selectedVisibleSpecial,
      ids: ["POWER_SHOT", "PIERCE_SHOT", "BROKEN_HAND", "CURSE_BRAND_HIDDEN"],
      icons: {
        POWER_SHOT: "assets/ui/icon-power-shot.png",
        PIERCE_SHOT: "assets/ui/icon-pierce-shot.png",
        BROKEN_HAND: "assets/ui/icon-broken-hand.png",
        CURSE_BRAND_HIDDEN: "assets/ui/icon-devil-mark.png",
      },
    },
    {
      key: "secret",
      label: "SECRETO",
      headIcon: "assets/ui/icon-category-hidden.png",
      selected: selectedHiddenSpecial,
      ids: ["DODGE", "DOUBLE_CHARGE", "REFLECT_SHIELD", "VAMPIRIC_SHOT"],
      icons: {
        DODGE: "assets/ui/icon-dodge.png",
        DOUBLE_CHARGE: "assets/ui/icon-double-charge.png",
        REFLECT_SHIELD: "assets/ui/icon-reflect-shield.png",
        VAMPIRIC_SHOT: "assets/ui/icon-vampiric-shot.png",
      },
    },
    {
      key: "ultimato",
      label: "ULTIMATO",
      headIcon: "assets/ui/icon-category-ultimate.png",
      selected: selectedUltimate,
      ids: ["OVERLOAD", "FORTRESS", "BLOOD_PACT", "SCAN"],
      icons: {
        OVERLOAD: "assets/ui/icon-overload.png",
        FORTRESS: "assets/ui/icon-fortress.png",
        BLOOD_PACT: "assets/ui/icon-blood-pact.png",
        SCAN: "assets/ui/icon-scan.png",
      },
    },
  ];

  const wrap = document.createElement("div");
  wrap.className = "loadout-scale-wrap";
  const stage = document.createElement("div");
  stage.className = "loadout-stage";
  stage.innerHTML = `
    <img class="loadout-bg" src="assets/ui/bg-loadout.png" alt="" />
    <div class="loadout-vignette"></div>
    <div class="loadout-ui-layer">
      <div class="loadout-columns"></div>
    </div>
  `;

  const colHost = stage.querySelector(".loadout-columns");
  for (const cat of categories) {
    const col = document.createElement("section");
    col.className = `loadout-column ${cat.key}`;
    col.innerHTML = `<h4 class="loadout-column-title"><img src="${cat.headIcon}" alt="" /><span>${cat.label}</span></h4><div class="loadout-column-cards"></div>`;
    const cards = col.querySelector(".loadout-column-cards");
    for (const id of cat.ids) {
      const sp = byId.get(id);
      if (!sp) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "loadout-card";
      btn.dataset.action = sp.id;
      btn.dataset.category = cat.key;
      const pips = "<span class=\"pip on\"></span>".repeat(Math.max(0, sp.cost)) + "<span class=\"pip\"></span>".repeat(Math.max(0, 5 - sp.cost));
      btn.innerHTML = `
        <span class="loadout-card-icon"><img src="${cat.icons[sp.id]}" alt="" /></span>
        <span class="loadout-card-body">
          <span class="loadout-card-title">${actionLabel(sp.id)}</span>
          <span class="loadout-card-desc">${LOADOUT_COPY[sp.id] ?? sp.desc}</span>
          <span class="loadout-card-pips">${pips}</span>
        </span>
      `;
      if (cat.selected === sp.id) btn.classList.add("selected");
      btn.addEventListener("click", () => {
        if (cat.key === "special") selectedVisibleSpecial = sp.id;
        if (cat.key === "secret") selectedHiddenSpecial = sp.id;
        if (cat.key === "ultimato") selectedUltimate = sp.id;
        renderLoadoutPanel();
      });
      cards.appendChild(btn);
    }
    colHost.appendChild(col);
  }

  const dock = document.createElement("div");
  dock.className = "loadout-actions-dock";
  dock.innerHTML = `
    <button type="button" class="stage-btn stage-confirm" ${selectedVisibleSpecial && selectedHiddenSpecial && selectedUltimate ? "" : "disabled"}>CONFIRMAR</button>
    <button type="button" class="stage-btn stage-back">VOLTAR</button>
  `;
  dock.querySelector(".stage-confirm").addEventListener("click", () => {
    sendLoadoutSelection();
  });
  dock.querySelector(".stage-back").addEventListener("click", () => {
    hasEnteredName = false;
    updatePlayState();
  });
  stage.querySelector(".loadout-ui-layer").appendChild(dock);

  wrap.appendChild(stage);
  specialPicksEl.appendChild(wrap);
}

// Renderização das ações
function makeActionButton(actionId, onClick) {
  const meta = ACTION_META[actionId];
  const ui = ACTION_UI_META[actionId] ?? {};
  const iconSrc = ACTION_ICON_ASSET[actionId] ?? null;
  const extraShieldCost = actionId === "SHIELD" ? (myData?.shieldPenaltyCost ?? 0) : 0;
  const displayCost = meta.cost + extraShieldCost;
  const iconHtml = iconSrc
    ? `<img src="${iconSrc}" alt="" class="action-icon-img" />`
    : `<span class="action-icon-empty" aria-hidden="true"></span>`;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "action-btn battle-action";
  btn.dataset.action = actionId;
  btn.innerHTML = `
    <span class="action-icon" aria-hidden="true">${iconHtml}</span>
    <span class="action-name">${ui.label ?? meta.label.toUpperCase()}</span>
    <span class="action-desc">${ui.desc ?? meta.label}</span>
    <span class="action-cost">${displayCost}E</span>
  `;
  btn.disabled = !canUseAction(actionId);
  btn.addEventListener("click", () => onClick(actionId));
  return btn;
}

function renderActionPanel() {
  baseActionsEl.innerHTML = "";
  specialActionsEl.innerHTML = "";
  for (const id of ["CHARGE", "SHOOT", "SHIELD"]) baseActionsEl.appendChild(makeActionButton(id, sendAction));
  if (myData.visibleSpecial) specialActionsEl.appendChild(makeActionButton(myData.visibleSpecial, sendAction));
  if (myData.hiddenSpecial && !myData.hiddenSpecialBroken) specialActionsEl.appendChild(makeActionButton(myData.hiddenSpecial, sendAction));
  if (myData.ultimate && !myData.ultimateUsed) specialActionsEl.appendChild(makeActionButton(myData.ultimate, sendAction));
}

// Validação local da interface
function shouldShowHudLoadoutIcon(actionId, data) {
  // O HUD não mostra secretos quebrados nem ultimatos já gastos.
  if (!actionId) return false;
  if (actionId === data.hiddenSpecial && data.hiddenSpecialBroken) return false;
  if (!ONE_TIME_ACTIONS.has(actionId)) return true;
  if (actionId === data.ultimate) return !data.ultimateUsed;
  return true;
}

// Envio de ações
function submitNameEntry() {
  // Nome vazio fica como null para o servidor atribuir "Jogador 1/2" conforme o slot.
  const submittedName = readSubmittedPlayerName();
  const displayName = submittedName ?? getPlayerName(myPlayer);
  hasEnteredName = true;
  applyPlayerName(displayName);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "SET_NAME", name: submittedName }));
  }
  updatePlayState();
}

function sendAction(actionId) {
  if (!canUseAction(actionId)) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    setMessage("Ligacao perdida. Recarrega para voltar a ligar.");
    return;
  }
  actionLocked = true;
  hideResult();
  ws.send(JSON.stringify({ type: "ACTION", action: actionId }));
  setMessage(`Trancado: ${actionLabel(actionId)}`);
  renderActionPanel();
}

function sendLoadoutSelection() {
  if (!selectedVisibleSpecial || !selectedHiddenSpecial || !selectedUltimate) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    setMessage("Ligacao perdida. Recarrega para voltar a ligar.");
    return;
  }
  ws.send(JSON.stringify({ type: "SELECT_SPECIALS", specials: [selectedVisibleSpecial, selectedHiddenSpecial, selectedUltimate] }));
  awaitingOpponentFromLoadout = true;
  updatePlayState();
}

function renderHudLoadoutIcons(data) {
  const entries = [
    { key: "special", label: "S", actionId: data.visibleSpecial },
    { key: "secret", label: "H", actionId: data.hiddenSpecial },
    { key: "ultimate", label: "U", actionId: data.ultimate },
  ];

  const html = entries.map((entry) => {
    if (!shouldShowHudLoadoutIcon(entry.actionId, data)) return "";
    const src = ACTION_ICON_ASSET[entry.actionId];
    if (!src) return "";
    return `<span class="hud-power-icon hud-power-${entry.key}" title="${actionLabel(entry.actionId)}"><img src="${src}" alt="${entry.label}" /></span>`;
  }).join("");

  return html ? `<div class="hud-powers">${html}</div>` : "";
}

function canUseAction(actionId) {
  // Validação local apenas para desativar botões e evitar cliques inúteis.
  // A validação definitiva continua no servidor em validateAction().
  if (!myData || actionLocked || gameOver || matchPhase !== "playing" || uiPhase !== "playing") return false;
  const meta = ACTION_META[actionId];
  if (!meta) return false;

  const isInLoadout =
    actionId === myData.visibleSpecial ||
    actionId === myData.hiddenSpecial ||
    actionId === myData.ultimate ||
    ["CHARGE", "SHOOT", "SHIELD"].includes(actionId);
  if (!isInLoadout) return false;

  const extraShieldCost = actionId === "SHIELD" ? (myData.shieldPenaltyCost ?? 0) : 0;
  const totalCost = meta.cost + extraShieldCost;
  if (myData.energy < totalCost) return false;

  if ((myData.cooldowns?.[actionId] ?? 0) > 0) return false;

  if (actionId === "BLOOD_PACT" && myData.hp <= 1) return false;

  if (actionId === myData.visibleSpecial && myData.visibleSpecialDisabledRounds > 0) return false;
  if (actionId === myData.hiddenSpecial && myData.hiddenSpecialBroken) return false;

  if (actionId === myData.visibleSpecial) return true;
  if (actionId === myData.hiddenSpecial) return true;
  if (actionId === myData.ultimate) return !myData.ultimateUsed;
  return ["CHARGE", "SHOOT", "SHIELD"].includes(actionId);
}

// Utilidades
function normalizePlayerName(raw) {
  const trimmed = (raw ?? "").trim().slice(0, 16);
  return trimmed || "Jogador";
}

function readSubmittedPlayerName() {
  const trimmed = String(nameInput?.value ?? "").trim().slice(0, 16);
  return trimmed || null;
}

function applyPlayerName(name) {
  playerDisplayName = name;
}

function updateOnlineStatus(count = playersOnline) {
  playersOnline = Math.max(0, Number(count) || 0);
  setStatus(`Jogadores online: ${playersOnline}`);
}

function actionLabel(id) {
  return ACTION_META[id]?.label ?? id;
}

function getPlayerName(playerId) {
  return normalizePlayerName(latestPlayerNames[playerId] ?? DEFAULT_PLAYER_NAMES[playerId]);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Configuração de Event Listeners e Inicialização
rematchBtn.addEventListener("click", () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    setMessage("Ligacao perdida. Recarrega para voltar a ligar.");
    return;
  }
  rematchRequested = true;
  rematchBtn.disabled = true;
  setRematchWaiting(true);
  updateRematchHeader("A aguardar resposta do rival...");
  ws.send(JSON.stringify({ type: "REMATCH" }));
  setMessage("A aguardar resposta do rival...");
});

waitCancelBtn?.addEventListener("click", () => {
  awaitingOpponentFromLoadout = false;
  hasEnteredName = false;
  selectedVisibleSpecial = null;
  selectedHiddenSpecial = null;
  selectedUltimate = null;
  loadoutOptions = null;
  if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  setTimeout(connect, 120);
  updatePlayState();
});

window.addEventListener("resize", updateLoadoutScale);
nameSubmitBtn.addEventListener("click", submitNameEntry);
nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitNameEntry();
});

if (nameInput) nameInput.value = "";
updateOnlineStatus();
updatePhaseClass();
connect();
