// Imports e configuração
const http = require("http");
const path = require("path");
const express = require("express");
const { WebSocketServer } = require("ws");
const {
  createGameState,
  validateSpecialsList,
  validateAction,
  bothLocked,
  bothLoadoutsReady,
  resolveRound,
  getMatchState,
  RULES_METADATA,
} = require("./game");

// Estado do servidor
const PORT = 3000;
const players = { player1: null, player2: null };
let game = createGameState();
const rematchReady = { player1: false, player2: false };
const DEFAULT_PLAYER_NAMES = {
  player1: "Jogador 1",
  player2: "Jogador 2",
};

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Funções auxiliares de envio
function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

function broadcast(msg) {
  for (const ws of getAllPlayers()) {
    if (ws.readyState === 1) {
      send(ws, msg);
    }
  }
}

function broadcastGameState() {
  broadcast({ type: "GAME_STATE", playersConnected: getPlayerCount() });
}

function broadcastMatch() {
  const playerNames = getPlayerNames();
  for (const ws of getAllPlayers()) {
    if (ws.readyState === 1 && ws.playerId) {
      // Cada cliente recebe o mesmo jogo, mas filtrado pela sua perspetiva.
      // Isto protege secretos/cooldowns que o adversário ainda não deve ver.
      send(ws, { type: "MATCH", playerNames, ...getMatchState(game, ws.playerId) });
    }
  }
}

// Gestão de jogadores
function getPlayerCount() {
  return (players.player1 ? 1 : 0) + (players.player2 ? 1 : 0);
}

function getAllPlayers() {
  return [players.player1, players.player2].filter(Boolean);
}

function getPlayerNames() {
  const player1Name = players.player1?.displayName ?? DEFAULT_PLAYER_NAMES.player1;
  const player2Name = players.player2?.displayName ?? DEFAULT_PLAYER_NAMES.player2;

  // Se ambos escolherem o mesmo nome, a UI/logs continuam distinguíveis.
  if (player1Name === player2Name) {
    return {
      player1: `${player1Name} 1`,
      player2: `${player2Name} 2`,
    };
  }

  return {
    player1: player1Name,
    player2: player2Name,
  };
}

function normalizeDisplayName(raw) {
  const text = String(raw ?? "").trim().slice(0, 16);
  return text || null;
}

function assignPlayer(ws) {
  if (!players.player1) {
    players.player1 = ws;
    ws.playerId = "player1";
    return "player1";
  }
  if (!players.player2) {
    players.player2 = ws;
    ws.playerId = "player2";
    return "player2";
  }
  return null;
}

// Gestão de loadout
function broadcastLoadoutOptions(ws) {
  const visibleSpecials = [];
  const hiddenSpecials = [];
  const ultimates = [];
  
  // O servidor continua a ser a fonte das regras; o cliente só usa isto para montar o ecrã.
  for (const [id, action] of Object.entries(RULES_METADATA.actions)) {
    if (action.category === "visible_special") {
      visibleSpecials.push({ id, label: action.label, desc: action.desc, cost: action.cost });
    } else if (action.category === "hidden_special") {
      hiddenSpecials.push({ id, label: action.label, desc: action.desc, cost: action.cost });
    } else if (action.category === "ultimate") {
      ultimates.push({ id, label: action.label, desc: action.desc, cost: action.cost });
    }
  }
  
  send(ws, {
    type: "LOADOUT_OPTIONS",
    visibleSpecials,
    hiddenSpecials,
    ultimates,
  });
}

function tryStartMatch() {
  if (getPlayerCount() < 2 || !bothLoadoutsReady(game)) {
    return;
  }
  // A partida só começa quando os dois jogadores já confirmaram o equipamento.
  game.phase = "playing";
  console.log("Match started — both loadouts ready\n");
  broadcast({ type: "MATCH_START" });
  broadcastMatch();
  broadcastRoundStatus();
}

function handleSelectSpecials(ws, list) {
  const playerId = ws.playerId;
  if (!playerId) {
    return;
  }

  if (game.phase !== "lobby" && game.phase !== "loadout") {
    send(ws, { type: "ERROR", message: "O equipamento já está confirmado." });
    return;
  }

  const check = validateSpecialsList(list);
  if (!check.ok) {
    send(ws, { type: "ERROR", message: check.error });
    return;
  }

  const player = game[playerId];
  const [visId, hidId, ultId] = list;
  player.visibleSpecial = visId;
  player.hiddenSpecial = hidId;
  player.ultimate = ultId;
  player.loadoutReady = true;
  game.phase = "loadout";

  console.log(`${playerId} selected loadout: visible=${visId}, hidden=${hidId}, ultimate=${ultId}`);
  broadcastMatch();

  if (bothLoadoutsReady(game)) {
    tryStartMatch();
  }
}

// Gestão de ações
function broadcastRoundStatus() {
  broadcast({ type: "ROUND_STATUS" });
}

function handleAction(ws, actionId) {
  const playerId = ws.playerId;
  if (!playerId) {
    return;
  }

  if (game.phase !== "playing" || game.gameOver) {
    send(ws, { type: "ERROR", message: "O duelo ainda não está em curso." });
    return;
  }

  if (getPlayerCount() < 2) {
    send(ws, { type: "ERROR", message: "À espera do segundo jogador." });
    return;
  }

  const choiceKey = playerId === "player1" ? "player1Action" : "player2Action";
  if (game[choiceKey]) {
    send(ws, { type: "ERROR", message: "Já escolheste a tua ação nesta ronda." });
    return;
  }

  const player = game[playerId];
  const check = validateAction(player, actionId);
  if (!check.ok) {
    send(ws, { type: "ERROR", message: check.error });
    return;
  }

  // Só guardamos ações válidas; resolveRound não deve receber fallbacks silenciosos.
  game[choiceKey] = actionId;
  console.log(`${playerId} locked: ${actionId}`);
  broadcastRoundStatus();

  if (bothLocked(game)) {
    resolveCurrentRound();
  }
}

// Resolução de rondas
function resolveCurrentRound() {
  const playerNames = getPlayerNames();
  const result = resolveRound(game, playerNames);
  const { player1, player2 } = game;

  console.log(`--- Round ${game.round - 1} ---`);
  console.log(`P1: ${result.player1Action}  |  P2: ${result.player2Action}`);
  console.log(`HP — P1: ${player1.hp}  P2: ${player2.hp}`);
  console.log(`Energy — P1: ${player1.energy}  P2: ${player2.energy}`);
  for (const line of result.log) {
    console.log(`  ${line}`);
  }

  broadcast({
    type: "REVEAL",
    player1Action: result.player1Action,
    player2Action: result.player2Action,
    playerNames,
    log: result.log,
  });

  // Primeiro mostramos as ações reveladas; depois enviamos o resultado da ronda.
  // O pequeno atraso dá tempo à animação/feedback de revelação no cliente.
  setTimeout(() => {
    for (const ws of getAllPlayers()) {
      if (ws.readyState === 1 && ws.playerId) {
        send(ws, {
          type: "RESOLVE",
          ...getMatchState(game, ws.playerId),
          playerNames,
          log: result.log,
        });
      }
    }

    if (game.gameOver) {
      const winner =
        result.winner === "draw" ? "draw" : result.winner;
      broadcast({ type: "GAME_OVER", winner });
      game.phase = "gameover";
      console.log(`Game over — ${winner}\n`);
    } else {
      broadcastRoundStatus();
    }
  }, 1000);
}

// Rematch
function resetGame() {
  game = createGameState();
  rematchReady.player1 = false;
  rematchReady.player2 = false;
}

function handleRematch(ws) {
  const playerId = ws.playerId;
  if (!playerId) {
    return;
  }

  if (!game.gameOver && game.phase !== "gameover") {
    send(ws, { type: "ERROR", message: "O duelo ainda está em curso." });
    return;
  }

  rematchReady[playerId] = true;
  const playerNames = getPlayerNames();
  broadcast({
    type: "REMATCH_STATUS",
    player1Ready: rematchReady.player1,
    player2Ready: rematchReady.player2,
    requestedBy: playerId,
    requestedByName: playerNames[playerId],
    playerNames,
  });

  if (rematchReady.player1 && rematchReady.player2) {
    console.log("Rematch — resetting game\n");
    // O rematch mantém as ligações/nomes, mas cria um estado de jogo novo.
    resetGame();
    game.phase = "loadout";
    broadcast({ type: "REMATCH_START" });
    broadcastMatch();
    for (const w of getAllPlayers()) {
      broadcastLoadoutOptions(w);
    }
  }
}

function removePlayer(ws) {
  const id = ws.playerId;
  if (id === "player1") {
    players.player1 = null;
  } else if (id === "player2") {
    players.player2 = null;
  }
  return id;
}

// WebSocket events
wss.on("connection", (ws) => {
  const playerId = assignPlayer(ws);
  ws.displayName = null;

  if (!playerId) {
    send(ws, { type: "ERROR", message: "Servidor cheio. Só podem jogar 2 jogadores." });
    ws.close(1008, "Servidor cheio");
    return;
  }

  console.log(`Player connected: ${playerId}`);
  send(ws, { type: "ASSIGN_PLAYER", player: playerId });
  broadcastLoadoutOptions(ws);
  broadcastGameState();
  broadcastMatch();

  if (getPlayerCount() === 2) {
    game.phase = "loadout";
    broadcastMatch();
  }

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "ERROR", message: "Mensagem inválida." });
      return;
    }

    if (msg.type === "SELECT_SPECIALS") {
      handleSelectSpecials(ws, msg.specials);
    } else if (msg.type === "SET_NAME") {
      ws.displayName = normalizeDisplayName(msg.name);
      broadcastMatch();
    } else if (msg.type === "ACTION") {
      handleAction(ws, msg.action);
    } else if (msg.type === "REMATCH") {
      handleRematch(ws);
    } else {
      send(ws, { type: "ERROR", message: "Tipo de mensagem desconhecido." });
    }
  });

  ws.on("close", () => {
    const id = removePlayer(ws);
    if (!id) {
      return;
    }
    console.log(`Player disconnected: ${id}`);
    resetGame();
    broadcast({
      type: "OPPONENT_LEFT",
      message: "O outro jogador desligou-se.",
    });
    broadcastGameState();
  });

  ws.on("error", (err) => {
    console.log(`Socket error (${playerId}):`, err.message);
  });
});

// Arranque do servidor
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Energy Duel host on 0.0.0.0:${PORT}`);
  console.log(`http://<HOST_IP>:${PORT}\n`);
});
