const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const PHASES = [
  { key: 'prep', label: 'Preparation', seconds: 180 },
  { key: 'pro', label: 'Pro Argument', seconds: 120 },
  { key: 'con', label: 'Con Argument', seconds: 120 },
  { key: 'rebuttal', label: 'Rebuttal', seconds: 90 },
  { key: 'vote', label: 'Vote & Score', seconds: 60 },
];

const TOTAL_ROUNDS = 3;

const defaultScenario = () =>
  'Should students be allowed to use AI assistants on homework assignments?';

const initialState = () => ({
  round: 1,
  phaseIndex: 0,
  scenario: defaultScenario(),
  scores: { pro: 0, con: 0 },
  timer: { running: false, endsAt: null, remaining: PHASES[0].seconds },
});

let state = initialState();

function currentPhase() {
  return PHASES[state.phaseIndex];
}

function computeRemaining() {
  const phase = currentPhase();
  if (state.timer.running && state.timer.endsAt) {
    return Math.max(0, Math.round((state.timer.endsAt - Date.now()) / 1000));
  }
  if (state.timer.remaining != null) return state.timer.remaining;
  return phase.seconds;
}

function publicState() {
  return {
    round: state.round,
    totalRounds: TOTAL_ROUNDS,
    phaseIndex: state.phaseIndex,
    phase: currentPhase(),
    phases: PHASES,
    scenario: state.scenario,
    scores: state.scores,
    timer: {
      running: state.timer.running,
      remaining: computeRemaining(),
      duration: currentPhase().seconds,
    },
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/state', (_req, res) => {
  res.json(publicState());
});

app.post('/api/scenario', (req, res) => {
  const { scenario } = req.body || {};
  if (typeof scenario !== 'string') {
    return res.status(400).json({ error: 'scenario must be a string' });
  }
  state.scenario = scenario.slice(0, 500);
  res.json(publicState());
});

app.post('/api/phase/next', (_req, res) => {
  if (state.phaseIndex < PHASES.length - 1) {
    state.phaseIndex += 1;
  } else if (state.round < TOTAL_ROUNDS) {
    state.round += 1;
    state.phaseIndex = 0;
  }
  state.timer = { running: false, endsAt: null, remaining: currentPhase().seconds };
  res.json(publicState());
});

app.post('/api/phase/prev', (_req, res) => {
  if (state.phaseIndex > 0) {
    state.phaseIndex -= 1;
  } else if (state.round > 1) {
    state.round -= 1;
    state.phaseIndex = PHASES.length - 1;
  }
  state.timer = { running: false, endsAt: null, remaining: currentPhase().seconds };
  res.json(publicState());
});

app.post('/api/timer/start', (_req, res) => {
  const remaining = computeRemaining();
  state.timer.running = true;
  state.timer.endsAt = Date.now() + remaining * 1000;
  state.timer.remaining = remaining;
  res.json(publicState());
});

app.post('/api/timer/pause', (_req, res) => {
  state.timer.remaining = computeRemaining();
  state.timer.running = false;
  state.timer.endsAt = null;
  res.json(publicState());
});

app.post('/api/timer/reset', (_req, res) => {
  state.timer = { running: false, endsAt: null, remaining: currentPhase().seconds };
  res.json(publicState());
});

app.post('/api/score', (req, res) => {
  const { side, delta } = req.body || {};
  if (!['pro', 'con'].includes(side)) {
    return res.status(400).json({ error: 'side must be pro or con' });
  }
  const d = Number(delta);
  if (!Number.isFinite(d)) return res.status(400).json({ error: 'delta required' });
  state.scores[side] = Math.max(0, state.scores[side] + d);
  res.json(publicState());
});

app.post('/api/reset', (_req, res) => {
  state = initialState();
  res.json(publicState());
});

app.listen(PORT, () => {
  console.log(`Debate game running on port ${PORT}`);
});
