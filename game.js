// Configuração base
const STARTING_HP = 5;
const MAX_HP = 5;
const STARTING_ENERGY = 1;
const MAX_ENERGY = 5;
const DEFAULT_PLAYER_NAMES = {
  player1: "Jogador 1",
  player2: "Jogador 2",
};

// Metadados das ações
const RULES_METADATA = {
  startingHP: STARTING_HP,
  maxHP: MAX_HP,
  startingEnergy: STARTING_ENERGY,
  maxEnergy: MAX_ENERGY,
  categories: {
    BASE: "base",
    VISIBLE_SPECIAL: "visible_special",
    HIDDEN_SPECIAL: "hidden_special",
    ULTIMATE: "ultimate"
  },
  actions: {
    CHARGE: {
      id: "CHARGE",
      label: "Carregar",
      category: "base",
      cost: 0,
      desc: "+1 Energia (máx. 5)",
      energyGain: 1,
      oneTimeUse: false
    },
    SHOOT: {
      id: "SHOOT",
      label: "Disparar",
      category: "base",
      cost: 1,
      desc: "1 dano",
      damage: 1,
      type: "normal",
      oneTimeUse: false
    },
    SHIELD: {
      id: "SHIELD",
      label: "Defender",
      category: "base",
      cost: 0,
      desc: "Bloqueia Disparar",
      type: "defense",
      oneTimeUse: false
    },
    POWER_SHOT: {
      id: "POWER_SHOT",
      label: "Tiro poderoso",
      category: "visible_special",
      cost: 3,
      desc: "2 dano, causa 1 através da Defesa",
      damage: 2,
      type: "heavy",
      oneTimeUse: false
    },
    PIERCE_SHOT: {
      id: "PIERCE_SHOT",
      label: "Tiro perfurante",
      category: "visible_special",
      cost: 2,
      desc: "1 dano, ignora Defesa",
      damage: 1,
      type: "piercing",
      oneTimeUse: false
    },
    REFLECT_SHIELD: {
      id: "REFLECT_SHIELD",
      label: "Escudo refletor",
      category: "hidden_special",
      cost: 1,
      desc: "Reflete Disparar. Recarga de 2 rondas",
      cooldown: 2,
      type: "defense",
      oneTimeUse: false
    },
    VAMPIRIC_SHOT: {
      id: "VAMPIRIC_SHOT",
      label: "Tiro vampírico",
      category: "hidden_special",
      cost: 2,
      desc: "1 dano, cura 1 Vida (se acertar)",
      damage: 1,
      heal: 1,
      cooldown: 2,
      type: "attack_heal",
      oneTimeUse: false
    },
    DODGE: {
      id: "DODGE",
      label: "Esquiva",
      category: "hidden_special",
      cost: 1,
      desc: "Evita ataque não-ultimato. Recarga de 2 rondas",
      cooldown: 2,
      type: "evasion",
      oneTimeUse: false
    },
    DOUBLE_CHARGE: {
      id: "DOUBLE_CHARGE",
      label: "Carga dupla",
      category: "hidden_special",
      cost: 0,
      desc: "Ganha +2 Energia. Recarga de 2 rondas",
      energyGain: 2,
      cooldown: 2,
      oneTimeUse: false
    },
    BROKEN_HAND: {
      id: "BROKEN_HAND",
      label: "Mão quebrada",
      category: "visible_special",
      cost: 2,
      desc: "1 dano. Desativa o Especial inimigo na próxima ronda",
      damage: 1,
      type: "attack_disable",
      disableVisibleSpecialOnHit: 1,
      oneTimeUse: false
    },
    CURSE_BRAND_HIDDEN: {
      id: "CURSE_BRAND_HIDDEN",
      label: "Marca da maldição",
      category: "visible_special",
      cost: 2,
      desc: "1 dano. Se acertar, rouba 1 Energia",
      damage: 1,
      type: "attack_drain",
      energyDrainOnHit: 1,
      oneTimeUse: false
    },
    OVERLOAD: {
      id: "OVERLOAD",
      label: "Canhão de energia",
      category: "ultimate",
      cost: 4,
      desc: "3 dano; 2 contra Defesa; quebra refletor",
      damage: 3,
      type: "ultimate_attack",
      oneTimeUse: true
    },
    FORTRESS: {
      id: "FORTRESS",
      label: "Fortaleza",
      category: "ultimate",
      cost: 0,
      desc: "Bloqueia todo o dano, uma vez por duelo",
      type: "ultimate_defense",
      oneTimeUse: true
    },
    BLOOD_PACT: {
      id: "BLOOD_PACT",
      label: "Pacto de sangue",
      category: "ultimate",
      cost: 0,
      desc: "Perde 1 Vida, ganha +4 Energia. Uma vez por duelo",
      type: "ultimate_resource",
      oneTimeUse: true
    },
    SCAN: {
      id: "SCAN",
      label: "Análise",
      category: "ultimate",
      cost: 0,
      desc: "Revela o secreto inimigo, ou ganha +1 Energia se já estiver revelado. Uma vez por duelo",
      type: "ultimate_info",
      oneTimeUse: true
    }
  }
};

// Criação de estado
function createPlayer() {
  return {
    hp: STARTING_HP,
    energy: STARTING_ENERGY,
    visibleSpecial: null,
    hiddenSpecial: null,
    ultimate: null,
    hiddenSpecialBroken: false,
    hiddenSpecialRevealed: false,
    ultimateUsed: false,
    loadoutReady: false,
    shieldStreak: 0,
    shieldPenaltyCost: 0,
    guardBroken: false,
    visibleSpecialDisabledRounds: 0,
    cooldowns: {
      DODGE: 0,
      DOUBLE_CHARGE: 0,
      REFLECT_SHIELD: 0,
      VAMPIRIC_SHOT: 0
    }
  };
}

function createGameState() {
  return {
    phase: "lobby",
    round: 1,
    gameOver: false,
    player1: createPlayer(),
    player2: createPlayer(),
    player1Action: null,
    player2Action: null,
  };
}

// Validação de ações
function getActionCost(actionId) {
  const actionMeta = RULES_METADATA.actions[actionId];
  return actionMeta !== undefined ? actionMeta.cost : null;
}

function isValidActionId(actionId) {
  return !!RULES_METADATA.actions[actionId];
}

function validateSpecialsList(list) {
  if (!Array.isArray(list) || list.length !== 3) {
    return { ok: false, error: "Escolhe exatamente 1 especial, 1 secreto e 1 ultimato." };
  }
  const [visId, hidId, ultId] = list;

  const visMeta = RULES_METADATA.actions[visId];
  if (!visMeta || visMeta.category !== "visible_special") {
    return { ok: false, error: `Especial inválido: ${visId}` };
  }

  const hidMeta = RULES_METADATA.actions[hidId];
  if (!hidMeta || hidMeta.category !== "hidden_special") {
    return { ok: false, error: `Secreto inválido: ${hidId}` };
  }

  const ultMeta = RULES_METADATA.actions[ultId];
  if (!ultMeta || ultMeta.category !== "ultimate") {
    return { ok: false, error: `Ultimato inválido: ${ultId}` };
  }

  return { ok: true };
}

function validatePlayerAction(player, actionId) {
  if (!isValidActionId(actionId)) {
    return { ok: false, error: "Ação desconhecida." };
  }

  const actionMeta = RULES_METADATA.actions[actionId];

  // O cliente só mostra ações equipadas, mas o servidor valida sempre o pedido recebido.
  // Isto bloqueia mensagens WebSocket forjadas ou estados internos inconsistentes.
  if (actionMeta.category === "visible_special" && player.visibleSpecial !== actionId) {
    return { ok: false, error: "Esse especial não está no teu equipamento." };
  }
  if (actionMeta.category === "hidden_special") {
    if (player.hiddenSpecial !== actionId) {
      return { ok: false, error: "Esse especial não está no teu equipamento." };
    }
    if (player.hiddenSpecialBroken) {
      return { ok: false, error: "O secreto está quebrado." };
    }
  }
  if (actionMeta.category === "ultimate") {
    if (player.ultimate !== actionId) {
      return { ok: false, error: "Esse ultimato não está no teu equipamento." };
    }
    if (player.ultimateUsed) {
      return { ok: false, error: "O ultimato já foi usado." };
    }
    if (actionId === "BLOOD_PACT" && player.hp <= 1) {
      return { ok: false, error: "Não podes usar Pacto de sangue com 1 de Vida." };
    }
  }

  const cost = getActionCost(actionId);
  const totalCost = actionId === "SHIELD" ? cost + player.shieldPenaltyCost : cost;
  if (player.energy < totalCost) {
    return { ok: false, error: "Não tens energia suficiente." };
  }

  if (actionMeta.category === "visible_special" && player.visibleSpecialDisabledRounds > 0) {
    return { ok: false, error: "O teu especial está desativado nesta ronda." };
  }

  if ((player.cooldowns?.[actionId] ?? 0) > 0) {
    return { ok: false, error: `${actionMeta.label} está em recarga.` };
  }

  return { ok: true };
}

function validateAction(player, actionId) {
  return validatePlayerAction(player, actionId);
}

function bothLocked(state) {
  return state.player1Action !== null && state.player2Action !== null;
}

function bothLoadoutsReady(state) {
  return state.player1.loadoutReady && state.player2.loadoutReady;
}

// Aplicação de efeitos
function getAttackProfile(actionId) {
  const actionMeta = RULES_METADATA.actions[actionId];
  if (!actionMeta || actionMeta.damage === undefined) {
    return null;
  }

  return {
    damage: actionMeta.damage,
    normal: actionMeta.type === "normal",
    breaksShield: actionMeta.type === "heavy",
    ignoresShield: actionMeta.type === "piercing",
    heal: actionMeta.heal ?? 0,
  };
}

function resolveCombat(attacker, attAction, defender, defAction, log, atkName, defName) {
  const atk = getAttackProfile(attAction);
  if (!atk) {
    return { toDefender: 0, toAttacker: 0 };
  }

  let toDefender = atk.damage;
  let toAttacker = 0;

  const usedShield = defAction === "SHIELD";
  const usedReflect = defAction === "REFLECT_SHIELD";
  const usedDodge = defAction === "DODGE";
  const usedFortress = defAction === "FORTRESS";

  // Algumas combinações não seguem a regra genérica de ataque/defesa.
  // Estas exceções ficam primeiro para a tabela de combate ser explícita.
  if (attAction === "POWER_SHOT") {
    if (usedShield) {
      toDefender = 1;
      log.push(`O ataque de ${atkName} atravessou a Defesa e causou 1 de dano.`);
      return { toDefender, toAttacker };
    }
    if (usedReflect) {
      toDefender = 1;
      toAttacker = 0;
      log.push(`O ataque de ${atkName} atravessou o Escudo refletor e causou 1 de dano.`);
      return { toDefender, toAttacker };
    }
    if (usedDodge) {
      toDefender = 0;
      log.push(`${defName} esquivou-se ao ataque de ${atkName}!`);
      return { toDefender, toAttacker };
    }
    if (usedFortress) {
      toDefender = 0;
      log.push(`A Fortaleza de ${defName} bloqueou todo o dano e ganhou +2 Energia!`);
      const { overcharged } = applyOvercharge(defender, 2);
      if (overcharged) logOvercharge(log, defName);
      return { toDefender, toAttacker };
    }
  }

  if (attAction === "OVERLOAD") {
    if (usedShield) {
      toDefender = 2;
      log.push(`O Canhão de energia de ${atkName} esmagou a Defesa e causou 2 de dano.`);
      return { toDefender, toAttacker };
    }
    if (usedReflect) {
      toDefender = 1;
      toAttacker = 0;
      defender.hiddenSpecialBroken = true;
      defender.hiddenSpecialRevealed = true;
      log.push(`O Canhão de energia de ${atkName} quebrou o Escudo refletor de ${defName} e causou 1 de dano.`);
      return { toDefender, toAttacker };
    }
    if (usedDodge) {
      toDefender = 3;
      log.push(`O ataque de ${atkName} atravessou a Esquiva e causou 3 de dano!`);
      return { toDefender, toAttacker };
    }
    if (usedFortress) {
      toDefender = 0;
      log.push(`A Fortaleza de ${defName} bloqueou todo o dano e ganhou +2 Energia!`);
      const { overcharged } = applyOvercharge(defender, 2);
      if (overcharged) logOvercharge(log, defName);
      return { toDefender, toAttacker };
    }
  }

  // A partir daqui aplicam-se as regras gerais de defesa.
  const attMeta = RULES_METADATA.actions[attAction];
  const isUltimateAttack = attMeta && attMeta.category === "ultimate";

  // A Esquiva evita ataques normais/especiais, mas não ultimatos.
  if (usedDodge && !isUltimateAttack) {
    toDefender = 0;
    log.push(`${defName} esquivou-se ao ataque de ${atkName}!`);
    return { toDefender, toAttacker };
  }

  // Fortaleza só ganha energia quando efetivamente bloqueia dano.
  if (usedFortress && toDefender > 0) {
    toDefender = 0;
    log.push(`A Fortaleza de ${defName} bloqueou todo o dano e ganhou +2 Energia!`);
    const { overcharged } = applyOvercharge(defender, 2);
    if (overcharged) logOvercharge(log, defName);
    return { toDefender, toAttacker };
  }

  if (usedReflect && atk.normal) {
    toDefender = 0;
    toAttacker = atk.damage;
    log.push(`${defName} refletiu o ataque de ${atkName}!`);
    return { toDefender, toAttacker };
  }

  if (usedShield) {
    if (defender.guardBroken) {
      defender.guardBroken = false;
      log.push(`A Defesa de ${defName} falhou (guarda quebrada)!`);
    } else if (atk.ignoresShield) {
      log.push(`O ataque de ${atkName} perfurou a Defesa!`);
    } else if (atk.breaksShield) {
      log.push(`O ataque de ${atkName} quebrou a Defesa!`);
    } else if (atk.normal) {
      toDefender = 0;
      log.push(`${defName} bloqueou com Defesa.`);
      return { toDefender, toAttacker };
    } else {
      toDefender = 0;
      log.push(`${defName} bloqueou com Defesa.`);
      return { toDefender, toAttacker };
    }
  }

  if (toDefender > 0) {
    log.push(`${atkName} acertou em ${defName} e causou ${toDefender} de dano.`);
  }

  return { toDefender, toAttacker };
}

function applyCharge(player, actionId, log, name) {
  if (actionId === "CHARGE") {
    const { gained, overcharged } = applyOvercharge(player, 1);
    if (gained > 0 || overcharged) {
      log.push(`${name} carregou (+1 Energia).`);
    }
    if (overcharged) logOvercharge(log, name);
  } else if (actionId === "DOUBLE_CHARGE") {
    log.push(`${name} fez carga dupla (+2 Energia).`);
    const { overcharged } = applyOvercharge(player, 2);
    if (overcharged) logOvercharge(log, name);
  }
}

function applyOvercharge(player, energyGain) {
  const energyBefore = player.energy;
  const energyAfter = Math.min(MAX_ENERGY, energyBefore + energyGain);
  const actualGain = energyAfter - energyBefore;
  const overcharged = energyBefore + energyGain > MAX_ENERGY;
  
  player.energy = energyAfter;
  
  // Sobrecarga: a energia fica limitada ao máximo e o jogador perde 1 de Vida.
  if (overcharged) {
    player.hp -= 1;
  }
  
  return { gained: actualGain, overcharged };
}

function logOvercharge(log, name) {
  log.push(`${name} entrou em sobrecarga: energia limitada a ${MAX_ENERGY} e perdeu 1 de Vida.`);
}

function applyBloodPact(player, actionId, log, name) {
  if (actionId === "BLOOD_PACT") {
    if (player.hp <= 1) {
      log.push(`${name} não pode usar Pacto de sangue com 1 de Vida!`);
      return false;
    }
    player.hp -= 1;
    log.push(`${name} usou Pacto de sangue: -1 Vida, +4 Energia.`);
    const { overcharged } = applyOvercharge(player, 4);
    if (overcharged) logOvercharge(log, name);
    return true;
  }
  return true;
}

function applyScan(user, userAction, opponent, log, userName, opponentName) {
  if (userAction !== "SCAN") {
    return;
  }
  if (!opponent.hiddenSpecialRevealed) {
    opponent.hiddenSpecialRevealed = true;
    const revealedId = opponent.hiddenSpecial;
    const revealedLabel = RULES_METADATA.actions[revealedId]?.label || revealedId || "Desconhecido";
    log.push(`${userName} analisou e revelou o secreto de ${opponentName}: ${revealedLabel}.`);
    return;
  }
  log.push(`${userName} analisou, mas o secreto já estava revelado. ${userName} ganhou +1 Energia.`);
  const { overcharged } = applyOvercharge(user, 1);
  if (overcharged) logOvercharge(log, userName);
}

function applyOnHitBonus(attacker, actionId, combatResult, defender, log, attackerName, defenderName) {
  const actionMeta = RULES_METADATA.actions[actionId];
  if (!actionMeta || combatResult.toDefender <= 0) {
    return;
  }

  if (actionMeta.energyDrainOnHit) {
    const drain = Math.min(actionMeta.energyDrainOnHit, defender.energy);
    if (drain > 0) {
      defender.energy -= drain;
      attacker.energy = Math.min(MAX_ENERGY, attacker.energy + drain);
      log.push(`A Marca da maldição de ${attackerName} roubou ${drain} Energia a ${defenderName}.`);
    }
  }

  if (actionMeta.disableVisibleSpecialOnHit) {
    defender.visibleSpecialDisabledRounds = Math.max(defender.visibleSpecialDisabledRounds, actionMeta.disableVisibleSpecialOnHit);
    log.push(`A Mão quebrada de ${attackerName} desativou o Especial de ${defenderName} na próxima ronda.`);
  }
}

function updateShieldStreak(player, actionId, log, name) {
  const previousPenaltyCost = player.shieldPenaltyCost;

  if (actionId === "SHIELD") {
    player.shieldStreak += 1;
    if (player.shieldStreak >= 3) {
      player.guardBroken = true;
      player.shieldStreak = 0;
    }
    // Anti-stall: duas Defesas seguidas fazem a próxima Defesa custar 1 Energia.
    // À terceira Defesa seguida, a guarda parte e o ciclo reinicia.
    if (player.shieldStreak === 2) {
      player.shieldPenaltyCost = 1;
    } else {
      player.shieldPenaltyCost = 0;
    }
  } else {
    player.shieldStreak = 0;
    player.shieldPenaltyCost = 0;
  }

  if (previousPenaltyCost === 0 && player.shieldPenaltyCost === 1) {
    log.push(`A Defesa de ${name} vai custar 1 Energia na próxima utilização.`);
  } else if (previousPenaltyCost === 1 && player.shieldPenaltyCost === 0) {
    log.push(`A Defesa de ${name} voltou a custar 0 Energia.`);
  }
}

function markUsedFlags(player, actionId) {
  const actionMeta = RULES_METADATA.actions[actionId];
  if (!actionMeta) return;
  
  if (actionMeta.category === "hidden_special") {
    player.hiddenSpecialRevealed = true;
  }
  if (actionMeta.category === "ultimate") {
    player.ultimateUsed = true;
  }
}

function assertValidActionAtResolution(player, actionId, playerName) {
  // O host já valida antes de guardar ações. Se resolveRound receber algo inválido,
  // é erro de fluxo e deve falhar de forma explícita, não cair num fallback silencioso.
  const check = validatePlayerAction(player, actionId);
  if (!check.ok) {
    throw new Error(`resolveRound recebeu uma ação inválida para ${playerName}: ${check.error}`);
  }
}

function isSuddenDeathRound(round) {
  return round >= 15 && (round - 15) % 3 === 0;
}

function applySuddenDeath(state, log) {
  state.player1.hp = Math.max(0, state.player1.hp - 1);
  state.player2.hp = Math.max(0, state.player2.hp - 1);
  log.push("Morte súbita: ambos os jogadores perdem 1 de Vida.");
}

function getRoundPlayerNames(playerNames = {}) {
  return {
    player1: playerNames.player1 ?? DEFAULT_PLAYER_NAMES.player1,
    player2: playerNames.player2 ?? DEFAULT_PLAYER_NAMES.player2,
  };
}

function expireRoundStatuses(player, visibleSpecialDisabledBeforeRound) {
  if (visibleSpecialDisabledBeforeRound > 0) {
    player.visibleSpecialDisabledRounds = Math.max(0, player.visibleSpecialDisabledRounds - 1);
  }
}

function applyActionCooldown(player, actionId) {
  const actionMeta = RULES_METADATA.actions[actionId];
  if (!actionMeta?.cooldown) {
    return;
  }
  player.cooldowns[actionId] = actionMeta.cooldown;
}

function expireCooldowns(player, cooldownsBeforeRound) {
  // Cooldowns só descem quando já estavam ativos no início da ronda.
  // Isto evita que uma ação usada agora perca imediatamente 1 ronda de recarga.
  for (const [actionId, cooldownBeforeRound] of Object.entries(cooldownsBeforeRound)) {
    if (cooldownBeforeRound > 0) {
      player.cooldowns[actionId] = Math.max(0, (player.cooldowns[actionId] ?? 0) - 1);
    }
  }
}

// Resolução da ronda
function resolveRound(state, playerNames) {
  const p1 = state.player1;
  const p2 = state.player2;
  const names = getRoundPlayerNames(playerNames);
  const p1Name = names.player1;
  const p2Name = names.player2;
  const resolvingRound = state.round;
  const requestedA1 = state.player1Action;
  const requestedA2 = state.player2Action;
  const log = [];
  const p1VisibleSpecialDisabledBeforeRound = p1.visibleSpecialDisabledRounds;
  const p2VisibleSpecialDisabledBeforeRound = p2.visibleSpecialDisabledRounds;
  const p1CooldownsBeforeRound = { ...p1.cooldowns };
  const p2CooldownsBeforeRound = { ...p2.cooldowns };

  // 1) Validar antes de gastar energia ou aplicar efeitos.
  assertValidActionAtResolution(p1, requestedA1, p1Name);
  assertValidActionAtResolution(p2, requestedA2, p2Name);
  const a1 = requestedA1;
  const a2 = requestedA2;

  // 2) Pagar custos antes dos ganhos/efeitos da ronda.
  const cost1 = getActionCost(a1) + (a1 === "SHIELD" ? p1.shieldPenaltyCost : 0);
  const cost2 = getActionCost(a2) + (a2 === "SHIELD" ? p2.shieldPenaltyCost : 0);

  p1.energy -= cost1;
  p2.energy -= cost2;
  p1.energy = Math.max(0, p1.energy);
  p2.energy = Math.max(0, p2.energy);

  // 3) Efeitos de preparação acontecem antes do combate direto.
  applyCharge(p1, a1, log, p1Name);
  applyCharge(p2, a2, log, p2Name);

  applyBloodPact(p1, a1, log, p1Name);
  applyBloodPact(p2, a2, log, p2Name);
  applyScan(p1, a1, p2, log, p1Name, p2Name);
  applyScan(p2, a2, p1, log, p2Name, p1Name);

  // 4) Resolver dano/reflexos de ambos os lados sem aplicar Vida até ambos terminarem.
  const r1 = resolveCombat(p1, a1, p2, a2, log, p1Name, p2Name);
  const r2 = resolveCombat(p2, a2, p1, a1, log, p2Name, p1Name);
  if (a1 === "SHIELD" && a2 === "SHIELD") {
    log.push("Ambos os jogadores defenderam. Nenhum dano foi causado.");
  }

  // 5) Bónus on-hit só contam se o ataque realmente causou dano.
  applyOnHitBonus(p1, a1, r1, p2, log, p1Name, p2Name);
  applyOnHitBonus(p2, a2, r2, p1, log, p2Name, p1Name);

  p1.hp = Math.max(0, p1.hp - r2.toDefender - r1.toAttacker);
  p2.hp = Math.max(0, p2.hp - r1.toDefender - r2.toAttacker);

  const heal1 = getAttackProfile(a1)?.heal ?? 0;
  const heal2 = getAttackProfile(a2)?.heal ?? 0;
  // Tiro vampírico só cura se o dano entrou.
  if (heal1 > 0 && r1.toDefender > 0) {
    p1.hp = Math.min(STARTING_HP, p1.hp + heal1);
    log.push(`${p1Name} curou ${heal1} de Vida.`);
  }
  if (heal2 > 0 && r2.toDefender > 0) {
    p2.hp = Math.min(STARTING_HP, p2.hp + heal2);
    log.push(`${p2Name} curou ${heal2} de Vida.`);
  }

  // 6) Estados persistentes atualizam no fim da ronda válida.
  updateShieldStreak(p1, a1, log, p1Name);
  updateShieldStreak(p2, a2, log, p2Name);

  markUsedFlags(p1, a1);
  markUsedFlags(p2, a2);
  applyActionCooldown(p1, a1);
  applyActionCooldown(p2, a2);

  expireRoundStatuses(p1, p1VisibleSpecialDisabledBeforeRound);
  expireRoundStatuses(p2, p2VisibleSpecialDisabledBeforeRound);
  expireCooldowns(p1, p1CooldownsBeforeRound);
  expireCooldowns(p2, p2CooldownsBeforeRound);

  // 7) Morte súbita só acontece se o combate normal ainda não terminou o jogo.
  const combatEndedGame = p1.hp <= 0 || p2.hp <= 0;
  if (!combatEndedGame && isSuddenDeathRound(resolvingRound)) {
    applySuddenDeath(state, log);
  }

  state.player1Action = null;
  state.player2Action = null;
  state.round += 1;

  const gameOver = p1.hp <= 0 || p2.hp <= 0;
  state.gameOver = gameOver;

  let winner = null;
  if (p1.hp <= 0 && p2.hp <= 0) {
    winner = "draw";
  } else if (p1.hp <= 0) {
    winner = "player2";
  } else if (p2.hp <= 0) {
    winner = "player1";
  }

  return {
    log,
    winner,
    player1Action: a1,
    player2Action: a2,
    gameOver,
  };
}

// Estado público
function getPublicPlayer(player, viewerId, state) {
  // O próprio jogador vê o seu secreto/cooldowns; o adversário só vê secretos revelados.
  const isSelf = viewerId && (
    (viewerId === "player1" && player === state?.player1) ||
    (viewerId === "player2" && player === state?.player2)
  );
  
  return {
    hp: player.hp,
    energy: player.energy,
    visibleSpecial: player.visibleSpecial,
    ultimate: player.ultimate,
    hiddenSpecial: isSelf || player.hiddenSpecialRevealed ? player.hiddenSpecial : null,
    hiddenSpecialBroken: player.hiddenSpecialBroken,
    hiddenSpecialRevealed: player.hiddenSpecialRevealed,
    ultimateUsed: player.ultimateUsed,
    loadoutReady: player.loadoutReady,
    shieldPenaltyCost: isSelf ? (player.shieldPenaltyCost ?? 0) : 0,
    guardBroken: player.guardBroken,
    visibleSpecialDisabledRounds: player.visibleSpecialDisabledRounds,
    cooldowns: isSelf ? { ...player.cooldowns } : {},
  };
}

function getMatchState(state, viewerId) {
  return {
    phase: state.phase,
    round: state.round,
    gameOver: state.gameOver,
    player1: getPublicPlayer(state.player1, viewerId, state),
    player2: getPublicPlayer(state.player2, viewerId, state),
  };
}

// Exportações
module.exports = {
  STARTING_HP,
  MAX_HP,
  STARTING_ENERGY,
  MAX_ENERGY,
  RULES_METADATA,
  createGameState,
  validateSpecialsList,
  validateAction,
  bothLocked,
  bothLoadoutsReady,
  resolveRound,
  getMatchState,
};
