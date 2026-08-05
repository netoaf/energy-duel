# Energy Duel

Energy Duel is a local-network 1v1 browser game. Two players choose a loadout
and lock one action per round; the Node.js server validates both choices and
resolves the round for both players.

This is an individual portfolio project built to practise server-authoritative
state, real-time communication, validation and automated rule testing.

## Highlights

- Real-time two-player sessions over WebSocket
- Server-side state and action validation
- Configurable special, hidden and ultimate abilities
- Cooldowns, rematches, anti-stall rules and sudden death
- Automated tests for combat resolution and invalid actions
- Browser interface that works across devices on the same local network

## Stack

- Node.js
- Express
- WebSocket (`ws`)
- Vanilla JavaScript, HTML and CSS

## Run locally

Requirements: Node.js and npm.

```bash
npm install
npm start
```

Open `http://localhost:3000` on the host computer. A second player on the same
network can open:

```text
http://<HOST_LOCAL_IP>:3000
```

The server listens on `0.0.0.0:3000`, so use it only on a network you trust.

## Validation

```bash
npm run check
npm test
```

At the time this repository was prepared for publication, the syntax checks
passed and all existing combat-resolution scenarios passed.

## Project structure

```text
game.js          Core rules, validation and round resolution
host.js          Express/WebSocket server and match lifecycle
public/          Browser interface and client-side rendering
test.js          Automated combat-resolution tests
```

## Current scope

Energy Duel is a local portfolio project. It does not include public hosting,
persistent accounts, matchmaking, analytics or production security claims.

