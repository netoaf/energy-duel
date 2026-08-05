const assert = require("assert");
const { createGameState, resolveRound, RULES_METADATA } = require("./game");

// Cria um estado limpo para cada cenário, evitando dependência entre testes.
function setupTestState(p1Hp, p1Energy, p2Hp, p2Energy) {
  const state = createGameState();
  state.player1.hp = p1Hp;
  state.player1.energy = p1Energy;
  state.player2.hp = p2Hp;
  state.player2.energy = p2Energy;
  return state;
}

function assertInvalidResolutionThrows(state, expectedError) {
  // A resolução não deve corrigir ações inválidas silenciosamente: tem de falhar claro.
  assert.throws(
    () => resolveRound(state),
    (error) =>
      error.message.includes("resolveRound recebeu uma ação inválida") &&
      (!expectedError || error.message.includes(expectedError)),
  );
}

function equipActionForTest(player, actionId) {
  const actionMeta = RULES_METADATA.actions[actionId];
  if (!actionMeta) return;
  if (actionMeta.category === "visible_special" && player.visibleSpecial === null) {
    player.visibleSpecial = actionId;
  } else if (actionMeta.category === "hidden_special" && player.hiddenSpecial === null) {
    player.hiddenSpecial = actionId;
  } else if (actionMeta.category === "ultimate" && player.ultimate === null) {
    player.ultimate = actionId;
  }
}

function resolveTestRound(state, names) {
  // Os testes montam estados mínimos à mão; este helper só preenche o equipamento em falta.
  equipActionForTest(state.player1, state.player1Action);
  equipActionForTest(state.player2, state.player2Action);
  return resolveRound(state, names);
}

console.log("Starting Energy Duel combat resolution tests...\n");

// Caso 1: P1 SHOOT vs P2 CHARGE -> P2 perde Vida, P1 não perde
{
  const state = setupTestState(5, 1, 5, 0);
  state.player1Action = "SHOOT";
  state.player2Action = "CHARGE";

  const result = resolveTestRound(state);

  console.log("Test Case 1: P1 SHOOT vs P2 CHARGE");
  console.log(`  P1 Actions: SHOOT, P2 Actions: CHARGE`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not lose HP");
  assert.strictEqual(state.player2.hp, 4, "Player 2 should lose 1 HP");
  assert.strictEqual(state.player2.energy, 1, "Player 2 should have gained 1 energy from Charge");
  assert.strictEqual(state.player1.energy, 0, "Player 1 should have consumed 1 energy to Shoot");
  console.log("✓ Case 1 passed!\n");
}

// Caso 2: P1 CHARGE vs P2 SHOOT -> P1 perde Vida, P2 não perde
{
  const state = setupTestState(5, 0, 5, 1);
  state.player1Action = "CHARGE";
  state.player2Action = "SHOOT";

  const result = resolveTestRound(state);

  console.log("Test Case 2: P1 CHARGE vs P2 SHOOT");
  console.log(`  P1 Actions: CHARGE, P2 Actions: SHOOT`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 4, "Player 1 should lose 1 HP");
  assert.strictEqual(state.player2.hp, 5, "Player 2 should not lose HP");
  assert.strictEqual(state.player1.energy, 1, "Player 1 should have gained 1 energy from Charge");
  assert.strictEqual(state.player2.energy, 0, "Player 2 should have consumed 1 energy to Shoot");
  console.log("✓ Case 2 passed!\n");
}

// Caso 2B: os nomes personalizados entram logo na origem das logs
{
  const state = setupTestState(5, 0, 5, 1);
  state.player1Action = "CHARGE";
  state.player2Action = "SHOOT";

  const result = resolveTestRound(state, { player1: "Ana", player2: "Bruno" });

  console.log("Test Case 2B: Custom player names in logs");
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.ok(result.log.some((line) => line.includes("Ana carregou (+1 Energia).")), "P1 custom name should appear in log");
  assert.ok(result.log.some((line) => line.includes("Bruno acertou em Ana")), "P2 custom name should appear in log");
  assert.ok(!result.log.some((line) => line.includes("Jogador 1") || line.includes("Jogador 2")), "Default labels should not need client-side patching");
  console.log("✓ Case 2B passed!\n");
}

// Caso 3: P1 REFLECT_SHIELD vs P2 SHOOT -> P2 perde Vida se o tiro refletir
{
  const state = setupTestState(5, 1, 5, 1);
  state.player1Action = "REFLECT_SHIELD";
  state.player2Action = "SHOOT";

  const result = resolveTestRound(state);

  console.log("Test Case 3: P1 REFLECT_SHIELD vs P2 SHOOT");
  console.log(`  P1 Actions: REFLECT_SHIELD, P2 Actions: SHOOT`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not lose HP (reflected)");
  assert.strictEqual(state.player2.hp, 4, "Player 2 should lose 1 HP (reflected damage)");
  assert.strictEqual(state.player1.cooldowns.REFLECT_SHIELD, 2, "Reflect Shield should enter 2-round cooldown");
  console.log("✓ Case 3 passed!\n");
}

// Caso 4: P2 REFLECT_SHIELD vs P1 SHOOT -> P1 perde Vida se o tiro refletir
{
  const state = setupTestState(5, 1, 5, 1);
  state.player1Action = "SHOOT";
  state.player2Action = "REFLECT_SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 4: P2 REFLECT_SHIELD vs P1 SHOOT");
  console.log(`  P1 Actions: SHOOT, P2 Actions: REFLECT_SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 4, "Player 1 should lose 1 HP (reflected damage)");
  assert.strictEqual(state.player2.hp, 5, "Player 2 should not lose HP (reflected)");
  assert.strictEqual(state.player2.cooldowns.REFLECT_SHIELD, 2, "Reflect Shield should enter 2-round cooldown");
  console.log("✓ Case 4 passed!\n");
}

// Caso 5: P1 POWER_SHOT vs P2 SHIELD -> P2 perde 1 Vida pela tabela de combate
{
  const state = setupTestState(5, 3, 5, 0);
  state.player1Action = "POWER_SHOT";
  state.player2Action = "SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 5: P1 POWER_SHOT vs P2 SHIELD");
  console.log(`  P1 Actions: POWER_SHOT, P2 Actions: SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not lose HP");
  assert.strictEqual(state.player2.hp, 4, "Player 2 should lose 1 HP (Power Shot hits through Shield)");
  console.log("✓ Case 5 passed!\n");
}

// Caso 6: P1 PIERCE_SHOT vs P2 SHIELD -> P2 perde 1 Vida porque ignora Defesa
{
  const state = setupTestState(5, 2, 5, 0);
  state.player1Action = "PIERCE_SHOT";
  state.player2Action = "SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 6: P1 PIERCE_SHOT vs P2 SHIELD");
  console.log(`  P1 Actions: PIERCE_SHOT, P2 Actions: SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not lose HP");
  assert.strictEqual(state.player2.hp, 4, "Player 2 should lose 1 HP (Pierce Shot ignores shield)");
  console.log("✓ Case 6 passed!\n");
}

// Testes da fase 3A

// Caso 7: P1 DODGE vs P2 SHOOT -> P1 evita dano não-ultimato
{
  const state = setupTestState(5, 1, 5, 1);
  state.player1Action = "DODGE";
  state.player2Action = "SHOOT";

  const result = resolveTestRound(state);

  console.log("Test Case 7: P1 DODGE vs P2 SHOOT");
  console.log(`  P1 Actions: DODGE, P2 Actions: SHOOT`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should dodge and not lose HP");
  assert.strictEqual(state.player2.hp, 5, "Player 2 should not lose HP");
  assert.strictEqual(state.player1.hiddenSpecialRevealed, true, "DODGE should be revealed after use");
  assert.strictEqual(state.player1.cooldowns.DODGE, 2, "DODGE should enter 2-round cooldown");
  console.log("✓ Case 7 passed!\n");
}

// Caso 8: P1 FORTRESS vs P2 POWER_SHOT -> P1 bloqueia dano e ganha +2 Energia
{
  const state = setupTestState(5, 0, 5, 3);
  state.player1Action = "FORTRESS";
  state.player2Action = "POWER_SHOT";

  const result = resolveTestRound(state);

  console.log("Test Case 8: P1 FORTRESS vs P2 POWER_SHOT");
  console.log(`  P1 Actions: FORTRESS, P2 Actions: POWER_SHOT`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should block all damage");
  assert.strictEqual(state.player2.hp, 5, "Player 2 should not lose HP");
  assert.strictEqual(state.player1.energy, 2, "Player 1 should gain +2 energy from Fortress");
  assert.strictEqual(state.player1.ultimateUsed, true, "FORTRESS should be marked used");
  console.log("✓ Case 8 passed!\n");
}

// Caso 9: P1 BLOOD_PACT -> perde 1 Vida e ganha +4 Energia
{
  const state = setupTestState(5, 0, 5, 0);
  state.player1Action = "BLOOD_PACT";
  state.player2Action = "SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 9: P1 BLOOD_PACT vs P2 SHIELD");
  console.log(`  P1 Actions: BLOOD_PACT, P2 Actions: SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 4, "Player 1 should lose 1 HP from Blood Pact");
  assert.strictEqual(state.player1.energy, 4, "Player 1 should gain +4 energy from Blood Pact");
  assert.strictEqual(state.player1.ultimateUsed, true, "BLOOD_PACT should be marked used");
  console.log("✓ Case 9 passed!\n");
}

// Caso 10: P1 LOADED_CHAMBER vs P2 SHIELD -> ação inválida lança erro
{
  const state = setupTestState(5, 0, 5, 0);
  state.player1.hiddenSpecial = "DODGE";
  state.player1.hiddenSpecialRevealed = false;
  state.player1Action = "LOADED_CHAMBER";
  state.player2Action = "SHIELD";

  console.log("Test Case 10: P1 LOADED_CHAMBER vs P2 SHIELD (invalid -> throws)");
  console.log(`  P1 Actions: LOADED_CHAMBER, P2 Actions: SHIELD`);

  assertInvalidResolutionThrows(state, "Ação desconhecida.");
  assert.strictEqual(state.player1.hp, 5, "Player 1 should not lose HP");
  assert.strictEqual(state.player2.hp, 5, "Player 2 should block with Shield");
  assert.strictEqual(state.player1.energy, 0, "Player 1 should not spend energy for invalid action");
  assert.strictEqual(state.player1.hiddenSpecialRevealed, false, "Invalid LOADED_CHAMBER should not reveal hidden special");
  console.log("✓ Case 10 passed!\n");
}

// Testes da fase 3B

// Caso 10B: BROKEN_HAND causa 1 dano e desativa o especial inimigo na próxima ronda
{
  const state = setupTestState(5, 2, 5, 2);
  state.player1.hiddenSpecial = "BROKEN_HAND";
  state.player2.visibleSpecial = "POWER_SHOT";
  state.player1Action = "BROKEN_HAND";
  state.player2Action = "CHARGE";

  const result = resolveTestRound(state);

  console.log("Test Case 10B: BROKEN_HAND disable behavior");
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  P2 visibleSpecialDisabledRounds: ${state.player2.visibleSpecialDisabledRounds}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player2.hp, 4, "Broken Hand should deal 1 damage");
  assert.strictEqual(state.player2.visibleSpecialDisabledRounds, 1, "Broken Hand should disable visible special next round");
  assert.ok(result.log.some((line) => line.includes("A Mão quebrada de Jogador 1 desativou o Especial de Jogador 2 na próxima ronda.")), "Should log Special disable");

  state.player1Action = "CHARGE";
  state.player2Action = "POWER_SHOT";
  assertInvalidResolutionThrows(state, "O teu especial está desativado nesta ronda.");
  assert.strictEqual(state.player2.visibleSpecialDisabledRounds, 1, "Disable should remain until a valid round resolves");

  state.player2Action = "SHIELD";
  const nextResult = resolveTestRound(state);

  console.log(`  Next Log: ${nextResult.log.join(" | ")}`);
  assert.strictEqual(state.player1.hp, 5, "Disabled Power Shot should not deal damage");
  assert.strictEqual(state.player2.visibleSpecialDisabledRounds, 0, "Disable should expire after the next round");
  console.log("OK Case 10B passed!\n");
}
// Caso 10C: CURSE_BRAND_HIDDEN causa 1 dano e drena 1 Energia ao acertar
{
  const state = setupTestState(5, 2, 5, 2);
  state.player1.hiddenSpecial = "CURSE_BRAND_HIDDEN";
  state.player1Action = "CURSE_BRAND_HIDDEN";
  state.player2Action = "CHARGE";

  const result = resolveTestRound(state);

  console.log("Test Case 10C: CURSE_BRAND_HIDDEN drain behavior");
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player2.hp, 4, "Curse Brand should deal 1 damage");
  assert.strictEqual(state.player1.energy, 1, "Player 1 should end with 1 energy after cost and drain");
  assert.strictEqual(state.player2.energy, 2, "Player 2 should end with 2 energy after charge and drain");
  console.log("✓ Case 10C passed!\n");
}

// Caso 10D: PIERCE_SHOT_HIDDEN já não é válido e lança erro
{
  const state = setupTestState(5, 2, 5, 0);
  state.player1.hiddenSpecial = "CURSE_BRAND_HIDDEN";
  state.player1.hiddenSpecialRevealed = false;
  state.player1Action = "PIERCE_SHOT_HIDDEN";
  state.player2Action = "SHIELD";

  console.log("Test Case 10D: PIERCE_SHOT_HIDDEN invalid -> throws");

  assertInvalidResolutionThrows(state, "Ação desconhecida.");
  assert.strictEqual(state.player1.energy, 2, "Invalid action should not spend energy");
  assert.strictEqual(state.player1.hiddenSpecialRevealed, false, "Invalid action should not reveal hidden special");
  console.log("✓ Case 10D passed!\n");
}

// Caso 11: P1 POWER_SHOT vs P2 REFLECT_SHIELD -> P2 sofre 1 dano pela tabela
{
  const state = setupTestState(5, 3, 5, 1);
  state.player1Action = "POWER_SHOT";
  state.player2Action = "REFLECT_SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 11: P1 POWER_SHOT vs P2 REFLECT_SHIELD");
  console.log(`  P1 Actions: POWER_SHOT, P2 Actions: REFLECT_SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not lose HP");
  assert.strictEqual(state.player2.hp, 4, "Player 2 should take 1 damage (Power Shot hits through Reflect)");
  assert.strictEqual(state.player2.cooldowns.REFLECT_SHIELD, 2, "Reflect Shield should enter 2-round cooldown");
  console.log("✓ Case 11 passed!\n");
}

// Caso 12: P1 POWER_SHOT vs P2 DODGE -> P2 evita dano
{
  const state = setupTestState(5, 3, 5, 1);
  state.player1Action = "POWER_SHOT";
  state.player2Action = "DODGE";

  const result = resolveTestRound(state);

  console.log("Test Case 12: P1 POWER_SHOT vs P2 DODGE");
  console.log(`  P1 Actions: POWER_SHOT, P2 Actions: DODGE`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not lose HP");
  assert.strictEqual(state.player2.hp, 5, "Player 2 should dodge Power Shot");
  console.log("✓ Case 12 passed!\n");
}

// Caso 13: P1 POWER_SHOT vs P2 FORTRESS -> P2 bloqueia dano e ganha Energia
{
  const state = setupTestState(5, 3, 5, 0);
  state.player1Action = "POWER_SHOT";
  state.player2Action = "FORTRESS";

  const result = resolveTestRound(state);

  console.log("Test Case 13: P1 POWER_SHOT vs P2 FORTRESS");
  console.log(`  P1 Actions: POWER_SHOT, P2 Actions: FORTRESS`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not lose HP");
  assert.strictEqual(state.player2.hp, 5, "Player 2 should block Power Shot");
  assert.strictEqual(state.player2.energy, 2, "Player 2 should gain +2 energy from Fortress");
  console.log("✓ Case 13 passed!\n");
}

// Caso 14: P1 OVERLOAD vs P2 SHIELD -> P2 sofre 2 danos
{
  const state = setupTestState(5, 4, 5, 1);
  state.player1Action = "OVERLOAD";
  state.player2Action = "SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 14: P1 OVERLOAD vs P2 SHIELD");
  console.log(`  P1 Actions: OVERLOAD, P2 Actions: SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not lose HP");
  assert.strictEqual(state.player2.hp, 3, "Player 2 should take 2 damage (Overload smashes through Shield)");
  console.log("✓ Case 14 passed!\n");
}

// Caso 15: P1 OVERLOAD vs P2 REFLECT_SHIELD -> P2 sofre 1 dano e perde o secreto
{
  const state = setupTestState(5, 4, 5, 1);
  state.player2.hiddenSpecial = "REFLECT_SHIELD";
  state.player1Action = "OVERLOAD";
  state.player2Action = "REFLECT_SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 15: P1 OVERLOAD vs P2 REFLECT_SHIELD");
  console.log(`  P1 Actions: OVERLOAD, P2 Actions: REFLECT_SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not take reflect damage from Overload");
  assert.strictEqual(state.player2.hp, 4, "Player 2 should take 1 damage from Overload breaking Reflect Shield");
  assert.strictEqual(state.player2.hiddenSpecialBroken, true, "Reflect Shield user's hidden secret should be broken");
  assert.strictEqual(state.player2.hiddenSpecialRevealed, true, "Broken Reflect Shield should be revealed");
  assert.ok(!result.log.some((line) => line.toLowerCase().includes("reflected")), "Log should not say Overload was reflected");

  state.player1.energy = 1;
  state.player2.energy = 1;
  state.player2.cooldowns.REFLECT_SHIELD = 0;
  state.player1Action = "SHOOT";
  state.player2Action = "REFLECT_SHIELD";
  assertInvalidResolutionThrows(state, "O secreto está quebrado.");
  assert.strictEqual(state.player2.hp, 4, "Broken Reflect Shield should not resolve again");
  console.log("✓ Case 15 passed!\n");
}

// Caso 16: P1 OVERLOAD vs P2 DODGE -> P2 sofre 3 danos porque ultimatos passam Esquiva
{
  const state = setupTestState(5, 4, 5, 1);
  state.player1Action = "OVERLOAD";
  state.player2Action = "DODGE";

  const result = resolveTestRound(state);

  console.log("Test Case 16: P1 OVERLOAD vs P2 DODGE");
  console.log(`  P1 Actions: OVERLOAD, P2 Actions: DODGE`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not lose HP");
  assert.strictEqual(state.player2.hp, 2, "Player 2 should take 3 damage (Overload hits through Dodge)");
  console.log("✓ Case 16 passed!\n");
}

// Caso 17: P1 OVERLOAD vs P2 FORTRESS -> P2 bloqueia dano e ganha Energia
{
  const state = setupTestState(5, 4, 5, 0);
  state.player1Action = "OVERLOAD";
  state.player2Action = "FORTRESS";

  const result = resolveTestRound(state);

  console.log("Test Case 17: P1 OVERLOAD vs P2 FORTRESS");
  console.log(`  P1 Actions: OVERLOAD, P2 Actions: FORTRESS`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not lose HP");
  assert.strictEqual(state.player2.hp, 5, "Player 2 should block Overload");
  assert.strictEqual(state.player2.energy, 2, "Player 2 should gain +2 energy from Fortress");
  console.log("✓ Case 17 passed!\n");
}

// Caso 18: P1 DOUBLE_CHARGE com 4 Energia -> sobrecarga e perda de 1 Vida
{
  const state = setupTestState(5, 4, 5, 0);
  state.player1Action = "DOUBLE_CHARGE";
  state.player2Action = "SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 18: P1 DOUBLE_CHARGE at 4 energy");
  console.log(`  P1 Actions: DOUBLE_CHARGE, P2 Actions: SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 4, "Player 1 should lose 1 HP from overcharge");
  assert.strictEqual(state.player1.energy, 5, "Player 1 energy should be capped at 5");
  assert.strictEqual(state.player1.cooldowns.DOUBLE_CHARGE, 2, "DOUBLE_CHARGE should enter 2-round cooldown");
  console.log("✓ Case 18 passed!\n");
}

// Caso 19: P1 BLOOD_PACT com 2 Energia -> perde Vida pelo pacto e pela sobrecarga
{
  const state = setupTestState(5, 2, 5, 0);
  state.player1Action = "BLOOD_PACT";
  state.player2Action = "SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 19: P1 BLOOD_PACT at 2 energy");
  console.log(`  P1 Actions: BLOOD_PACT, P2 Actions: SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 3, "Player 1 should lose 2 HP (1 from pact, 1 from overcharge)");
  assert.strictEqual(state.player1.energy, 5, "Player 1 energy should be capped at 5");
  console.log("✓ Case 19 passed!\n");
}

// Caso 20: anti-stall da Defesa -> 2 Defesas seguidas ativam penalização
{
  const state = setupTestState(5, 0, 5, 0);
  state.player1Action = "SHIELD";
  state.player2Action = "SHIELD";
  state.player1.shieldStreak = 1; // Simula uma defesa na ronda anterior.

  const result = resolveTestRound(state);

  console.log("Test Case 20: Shield anti-stall penalty");
  console.log(`  P1 Actions: SHIELD (streak=1), P2 Actions: SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  P1 shieldPenaltyCost: ${state.player1.shieldPenaltyCost}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.shieldPenaltyCost, 1, "P1 should have shield penalty cost");
  assert.strictEqual(state.player1.energy, 0, "P1 energy should be 0 (no cost for shield itself)");
  assert.ok(result.log.includes("Ambos os jogadores defenderam. Nenhum dano foi causado."), "Double shield should be logged");
  console.log("✓ Case 20 passed!\n");
}

// Caso 21: anti-stall da Defesa -> terceira Defesa com penalização custa 1 Energia
{
  const state = setupTestState(5, 1, 5, 1);
  state.player1Action = "SHIELD";
  state.player2Action = "SHOOT";
  state.player1.shieldPenaltyCost = 1; // Simula a penalização criada na ronda anterior.

  const result = resolveTestRound(state);

  console.log("Test Case 21: Shield with penalty cost");
  console.log(`  P1 Actions: SHIELD (penalty=1), P2 Actions: SHOOT`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.energy, 0, "P1 energy should be 0 (paid 1 for penalty)");
  assert.strictEqual(state.player1.hp, 5, "P1 should block with Shield");
  console.log("✓ Case 21 passed!\n");
}

// Caso 22: Vampiric Shot vs Shield -> não cura porque não causou dano
{
  const state = setupTestState(5, 2, 5, 0);
  state.player1Action = "VAMPIRIC_SHOT";
  state.player2Action = "SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 22: Vampiric Shot vs Shield - no heal");
  console.log(`  P1 Actions: VAMPIRIC_SHOT, P2 Actions: SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "Player 1 should not heal (no damage dealt)");
  assert.strictEqual(state.player2.hp, 5, "Player 2 should block with Shield");
  assert.strictEqual(state.player1.cooldowns.VAMPIRIC_SHOT, 2, "Vampiric Shot should enter 2-round cooldown");
  console.log("✓ Case 22 passed!\n");
}

// Caso 22B: especiais em recarga só voltam após duas rondas válidas
{
  const state = setupTestState(5, 5, 5, 5);
  state.player1.hiddenSpecial = "VAMPIRIC_SHOT";
  state.player1Action = "VAMPIRIC_SHOT";
  state.player2Action = "CHARGE";
  resolveTestRound(state);

  state.player1Action = "VAMPIRIC_SHOT";
  state.player2Action = "CHARGE";

  console.log("Test Case 22B: VAMPIRIC_SHOT cooldown behavior");
  assertInvalidResolutionThrows(state, "Tiro vampírico está em recarga.");
  assert.strictEqual(state.player1.cooldowns.VAMPIRIC_SHOT, 2, "Cooldown should not tick down on an invalid resolution attempt");

  state.player1Action = "CHARGE";
  state.player2Action = "CHARGE";
  resolveTestRound(state);
  assert.strictEqual(state.player1.cooldowns.VAMPIRIC_SHOT, 1, "Cooldown should tick down after one valid round");

  state.player1Action = "CHARGE";
  state.player2Action = "CHARGE";
  resolveTestRound(state);
  assert.strictEqual(state.player1.cooldowns.VAMPIRIC_SHOT, 0, "Cooldown should expire after two valid rounds");

  state.player1Action = "VAMPIRIC_SHOT";
  state.player2Action = "CHARGE";
  const reusedResult = resolveTestRound(state);

  console.log("  Reused Actions: P1 VAMPIRIC_SHOT, P2 CHARGE (P2 at max Energy)");
  console.log(`  Reused Log: ${reusedResult.log.join(" | ")}`);
  assert.strictEqual(reusedResult.player1Action, "VAMPIRIC_SHOT", "Vampiric Shot should be reusable after cooldown");
  console.log("OK Case 22B passed!\n");
}
// Caso 23: penalização da Defesa sem Energia suficiente lança erro antes de descontar
{
  const state = setupTestState(5, 0, 5, 0);
  state.player1Action = "SHIELD";
  state.player2Action = "SHIELD";
  state.player1.shieldPenaltyCost = 1; // Força o caminho em que a penalização exige Energia.

  console.log("Test Case 23: Shield penalty without energy -> throws");
  console.log(`  P1 Actions: SHIELD (penalty=1), P2 Actions: SHIELD`);

  assertInvalidResolutionThrows(state, "Não tens energia suficiente.");
  assert.strictEqual(state.player1.energy, 0, "P1 energy should remain unchanged");
  assert.strictEqual(state.player2.energy, 0, "P2 energy should remain unchanged");
  console.log("✓ Case 23 passed!\n");
}

// Testes da fase 4A

// Caso 24: SHOOT sem Energia lança erro e não deixa Energia negativa
{
  const state = setupTestState(5, 0, 5, 0);
  state.player1Action = "SHOOT";
  state.player2Action = "CHARGE";

  console.log("Test Case 24: Unaffordable SHOOT -> throws");
  console.log(`  P1 Actions: SHOOT (0 energy), P2 Actions: CHARGE`);

  assertInvalidResolutionThrows(state, "Não tens energia suficiente.");
  assert.strictEqual(state.player1.hp, 5, "P1 should not attack when SHOOT is unaffordable");
  assert.strictEqual(state.player2.hp, 5, "P2 should take no damage from invalid SHOOT");
  assert.ok(state.player1.energy >= 0, "P1 energy should never be negative");
  console.log("✓ Case 24 passed!\n");
}

// Caso 25: secreto reutilizável revela-se e entra em recarga
{
  const state = setupTestState(5, 1, 5, 0);
  state.player1.hiddenSpecial = "DODGE";
  state.player1.hiddenSpecialRevealed = false;
  state.player1Action = "DODGE";
  state.player2Action = "SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 25: Reusable hidden special cooldown behavior");
  console.log(`  P1 Actions: DODGE, P2 Actions: SHIELD`);
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "P1 should receive no special effect");
  assert.strictEqual(state.player2.hp, 5, "P2 should take no damage");
  assert.strictEqual(result.player1Action, "DODGE", "DODGE should resolve successfully because it is reusable");
  assert.strictEqual(state.player1.hiddenSpecialRevealed, true, "Hidden special should reveal after use");
  assert.strictEqual(state.player1.cooldowns.DODGE, 2, "DODGE should enter 2-round cooldown");
  console.log("✓ Case 25 passed!\n");
}

// Caso 26: ultimato reutilizado lança erro e não aplica efeito outra vez
{
  const state = setupTestState(5, 4, 5, 0);
  state.player1.ultimate = "OVERLOAD";
  state.player1.ultimateUsed = true;
  state.player1Action = "OVERLOAD";
  state.player2Action = "SHIELD";

  console.log("Test Case 26: Reused ultimate -> throws");
  console.log(`  P1 Actions: OVERLOAD (already used), P2 Actions: SHIELD`);

  assertInvalidResolutionThrows(state, "O ultimato já foi usado.");
  assert.strictEqual(state.player2.hp, 5, "P2 should take no damage from invalid reused ultimate");
  assert.strictEqual(state.player1.ultimateUsed, true, "Ultimate should remain previously used");
  console.log("✓ Case 26 passed!\n");
}

// Caso 27: BLOOD_PACT com 1 Vida lança erro
{
  const state = setupTestState(1, 0, 5, 0);
  state.player1.ultimate = "BLOOD_PACT";
  state.player1Action = "BLOOD_PACT";
  state.player2Action = "SHIELD";

  console.log("Test Case 27: BLOOD_PACT at 1 HP -> throws");
  console.log(`  P1 Actions: BLOOD_PACT (1 HP), P2 Actions: SHIELD`);

  assertInvalidResolutionThrows(state, "Não podes usar Pacto de sangue com 1 de Vida.");
  assert.strictEqual(state.player1.hp, 1, "P1 HP should remain unchanged");
  assert.strictEqual(state.player1.energy, 0, "P1 energy should remain unchanged");
  assert.strictEqual(state.player1.ultimateUsed, false, "Ultimate should not be consumed");
  console.log("✓ Case 27 passed!\n");
}

// Caso 28: ação fora do equipamento lança erro
{
  const state = setupTestState(5, 2, 5, 0);
  state.player1.visibleSpecial = "POWER_SHOT";
  state.player1Action = "PIERCE_SHOT";
  state.player2Action = "SHIELD";

  console.log("Test Case 28: Invalid loadout action -> throws");
  console.log(`  P1 Actions: PIERCE_SHOT (not owned), P2 Actions: SHIELD`);

  assertInvalidResolutionThrows(state, "Esse especial não está no teu equipamento.");
  assert.strictEqual(state.player2.hp, 5, "P2 should take no damage from invalid loadout action");
  console.log("✓ Case 28 passed!\n");
}

// Testes da fase 6A: morte súbita

// Caso 29: morte súbita não ativa antes da ronda 15
{
  const state = setupTestState(5, 0, 5, 0);
  state.round = 14;
  state.player1Action = "CHARGE";
  state.player2Action = "CHARGE";

  const result = resolveTestRound(state);

  console.log("Test Case 29: No Sudden Death on round 14");
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 5, "P1 should not lose HP before Sudden Death starts");
  assert.strictEqual(state.player2.hp, 5, "P2 should not lose HP before Sudden Death starts");
  assert.ok(!result.log.some((line) => line.includes("Morte súbita: ambos os jogadores perdem 1 de Vida.")), "No Sudden Death log expected");
  console.log("✓ Case 29 passed!\n");
}

// Caso 30: morte súbita ativa na ronda 15
{
  const state = setupTestState(5, 0, 5, 0);
  state.round = 15;
  state.player1Action = "CHARGE";
  state.player2Action = "CHARGE";

  const result = resolveTestRound(state);

  console.log("Test Case 30: Sudden Death on round 15");
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 4, "P1 should lose 1 HP from Sudden Death");
  assert.strictEqual(state.player2.hp, 4, "P2 should lose 1 HP from Sudden Death");
  assert.ok(result.log.some((line) => line.includes("Morte súbita: ambos os jogadores perdem 1 de Vida.")), "Sudden Death log expected");
  console.log("✓ Case 30 passed!\n");
}

// Caso 31: morte súbita não ativa nas rondas 16/17, mas ativa na 18
{
  const state16 = setupTestState(5, 0, 5, 0);
  state16.round = 16;
  state16.player1Action = "CHARGE";
  state16.player2Action = "CHARGE";
  const result16 = resolveTestRound(state16);

  const state17 = setupTestState(5, 0, 5, 0);
  state17.round = 17;
  state17.player1Action = "CHARGE";
  state17.player2Action = "CHARGE";
  const result17 = resolveTestRound(state17);

  const state18 = setupTestState(5, 0, 5, 0);
  state18.round = 18;
  state18.player1Action = "CHARGE";
  state18.player2Action = "CHARGE";
  const result18 = resolveTestRound(state18);

  console.log("Test Case 31: Sudden Death cadence (16/17 off, 18 on)");
  console.log(`  Round16 HP -> P1: ${state16.player1.hp}, P2: ${state16.player2.hp}`);
  console.log(`  Round17 HP -> P1: ${state17.player1.hp}, P2: ${state17.player2.hp}`);
  console.log(`  Round18 HP -> P1: ${state18.player1.hp}, P2: ${state18.player2.hp}`);

  assert.strictEqual(state16.player1.hp, 5, "Round 16 should not apply Sudden Death");
  assert.strictEqual(state16.player2.hp, 5, "Round 16 should not apply Sudden Death");
  assert.ok(!result16.log.some((line) => line.includes("Morte súbita: ambos os jogadores perdem 1 de Vida.")), "No Sudden Death log expected on round 16");

  assert.strictEqual(state17.player1.hp, 5, "Round 17 should not apply Sudden Death");
  assert.strictEqual(state17.player2.hp, 5, "Round 17 should not apply Sudden Death");
  assert.ok(!result17.log.some((line) => line.includes("Morte súbita: ambos os jogadores perdem 1 de Vida.")), "No Sudden Death log expected on round 17");

  assert.strictEqual(state18.player1.hp, 4, "Round 18 should apply Sudden Death");
  assert.strictEqual(state18.player2.hp, 4, "Round 18 should apply Sudden Death");
  assert.ok(result18.log.some((line) => line.includes("Morte súbita: ambos os jogadores perdem 1 de Vida.")), "Sudden Death log expected on round 18");
  console.log("✓ Case 31 passed!\n");
}

// Caso 32: morte súbita pode derrotar um jogador
{
  const state = setupTestState(1, 0, 2, 0);
  state.round = 15;
  state.player1Action = "CHARGE";
  state.player2Action = "CHARGE";

  const result = resolveTestRound(state);

  console.log("Test Case 32: Sudden Death causes single-player defeat");
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}, winner: ${result.winner}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 0, "P1 should reach 0 from Sudden Death");
  assert.strictEqual(state.player2.hp, 1, "P2 should lose 1 HP but survive");
  assert.strictEqual(result.winner, "player2", "Player 2 should win");
  assert.strictEqual(result.gameOver, true, "Game should be over");
  console.log("✓ Case 32 passed!\n");
}

// Caso 33: morte súbita pode empatar se ambos chegarem a 0
{
  const state = setupTestState(1, 0, 1, 0);
  state.round = 15;
  state.player1Action = "CHARGE";
  state.player2Action = "CHARGE";

  const result = resolveTestRound(state);

  console.log("Test Case 33: Sudden Death causes draw");
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}, winner: ${result.winner}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.hp, 0, "P1 should reach 0 from Sudden Death");
  assert.strictEqual(state.player2.hp, 0, "P2 should reach 0 from Sudden Death");
  assert.strictEqual(result.winner, "draw", "Result should be draw");
  assert.strictEqual(result.gameOver, true, "Game should be over");
  console.log("✓ Case 33 passed!\n");
}

// Testes do SCAN

// Caso 34: SCAN revela o secreto adversário e não causa dano
{
  const state = setupTestState(5, 0, 5, 0);
  state.player1.ultimate = "SCAN";
  state.player2.hiddenSpecial = "DODGE";
  state.player2.hiddenSpecialRevealed = false;
  state.player1Action = "SCAN";
  state.player2Action = "CHARGE";

  const result = resolveTestRound(state);

  console.log("Test Case 34: SCAN reveals hidden special");
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player2.hiddenSpecialRevealed, true, "SCAN should reveal opponent hidden special");
  assert.strictEqual(state.player1.hp, 5, "SCAN should not damage user");
  assert.strictEqual(state.player2.hp, 5, "SCAN should not damage opponent");
  assert.strictEqual(state.player1.ultimateUsed, true, "SCAN should consume ultimate use");
  assert.ok(result.log.some((line) => line.includes("Jogador 1 analisou e revelou o secreto de Jogador 2: Esquiva.")), "Reveal log expected");
  console.log("✓ Case 34 passed!\n");
}

// Caso 35: SCAN não pode ser reutilizado; segunda utilização lança erro
{
  const state = setupTestState(5, 0, 5, 0);
  state.player1.ultimate = "SCAN";
  state.player2.hiddenSpecial = "DODGE";
  state.player2.hiddenSpecialRevealed = false;
  state.player1Action = "SCAN";
  state.player2Action = "CHARGE";
  resolveTestRound(state);

  state.player1Action = "SCAN";
  state.player2Action = "CHARGE";

  console.log("Test Case 35: SCAN reuse -> throws");

  assertInvalidResolutionThrows(state, "O ultimato já foi usado.");
  console.log("✓ Case 35 passed!\n");
}

// Caso 36: SCAN num secreto já revelado dá +1 Energia
{
  const state = setupTestState(5, 0, 5, 0);
  state.player1.ultimate = "SCAN";
  state.player2.hiddenSpecial = "DODGE";
  state.player2.hiddenSpecialRevealed = true;
  state.player1Action = "SCAN";
  state.player2Action = "SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 36: SCAN grants +1 energy when already revealed");
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.energy, 1, "SCAN should grant +1 energy");
  assert.ok(result.log.some((line) => line.includes("Jogador 1 analisou, mas o secreto já estava revelado. Jogador 1 ganhou +1 Energia.")), "Energy gain log expected");
  console.log("✓ Case 36 passed!\n");
}

// Caso 37: SCAN respeita Energia máxima e comportamento de sobrecarga
{
  const state = setupTestState(5, 5, 5, 0);
  state.player1.ultimate = "SCAN";
  state.player2.hiddenSpecial = "DODGE";
  state.player2.hiddenSpecialRevealed = true;
  state.player1Action = "SCAN";
  state.player2Action = "SHIELD";

  const result = resolveTestRound(state);

  console.log("Test Case 37: SCAN overcharge behavior at max energy");
  console.log(`  Outcome HP -> P1: ${state.player1.hp}, P2: ${state.player2.hp}`);
  console.log(`  Energy -> P1: ${state.player1.energy}, P2: ${state.player2.energy}`);
  console.log(`  Log: ${result.log.join(" | ")}`);

  assert.strictEqual(state.player1.energy, 5, "Energy should remain capped at max");
  assert.strictEqual(state.player1.hp, 4, "Existing overcharge behavior should apply at cap");
  console.log("✓ Case 37 passed!\n");
}

console.log("All combat resolution tests passed successfully!");


