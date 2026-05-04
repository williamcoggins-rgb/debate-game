# debate-game

Classroom debate game — projector-friendly web app.

- Node.js + Express, no database (in-memory state)
- Single HTML page with dark theme, big text
- 3 rounds × 5 phases (Prep → Pro → Con → Rebuttal → Vote)
- Editable scenario/topic, active phase label, per-side scoring, phase timer

## Run locally

```
npm install
npm start
```

Open http://localhost:3000

## Deploy to Railway

Railway auto-detects Node and runs `npm start`. Set no env vars (uses `PORT`).

## Keyboard shortcuts

- `Space` — start/pause timer
- `←` / `→` — previous / next phase
