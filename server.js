const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const PHASES = [
  { key: 'prep', label: 'Preparation', seconds: 180 },
  { key: 'speaking', label: 'Speaking', seconds: 120 },
  { key: 'rebuttal', label: 'Rebuttal', seconds: 90 },
  { key: 'huddle', label: 'Huddle', seconds: 60 },
  { key: 'vote', label: 'Vote', seconds: 60 },
];

const TOTAL_ROUNDS = 3;

const TEAMS = [
  { key: 'aqua',    name: 'AQUA',    tag: 'TIDAL CORE',  color: '#00f5ff' },
  { key: 'atlas',   name: 'ATLAS',   tag: 'RED CORE',    color: '#ff00aa' },
  { key: 'viper',   name: 'VIPER',   tag: 'VENOM SQUAD', color: '#aaff00' },
  { key: 'phoenix', name: 'PHOENIX', tag: 'EMBER WING',  color: '#ffaa00' },
];
const TEAM_KEYS = TEAMS.map(t => t.key);

const defaultScenario = () =>
  'Should students be allowed to use AI assistants on homework assignments?';

const initialScores = () =>
  TEAM_KEYS.reduce((o, k) => (o[k] = 0, o), {});

const initialState = () => ({
  round: 1,
  phaseIndex: 0,
  scenario: defaultScenario(),
  scores: initialScores(),
  streaks: initialScores(),
  lastScored: null,
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
    teams: TEAMS,
    scores: state.scores,
    streaks: state.streaks,
    lastScored: state.lastScored,
    timer: {
      running: state.timer.running,
      remaining: computeRemaining(),
      duration: currentPhase().seconds,
    },
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/state', (_req, res) => res.json(publicState()));

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
  const { team, side, delta } = req.body || {};
  const key = team || side;
  if (!TEAM_KEYS.includes(key)) {
    return res.status(400).json({ error: `team must be one of ${TEAM_KEYS.join(', ')}` });
  }
  const d = Number(delta);
  if (!Number.isFinite(d)) return res.status(400).json({ error: 'delta required' });

  const prev = state.scores[key];
  state.scores[key] = Math.max(0, prev + d);

  if (d > 0) {
    state.streaks[key] = (state.lastScored === key ? state.streaks[key] : 0) + 1;
    for (const k of TEAM_KEYS) if (k !== key) state.streaks[k] = 0;
    state.lastScored = key;
  } else if (d < 0 && state.scores[key] < prev) {
    state.streaks[key] = 0;
  }

  res.json(publicState());
});

app.post('/api/reset', (_req, res) => {
  state = initialState();
  res.json(publicState());
});

app.listen(PORT, () => {
  console.log(`Debate Arena running on port ${PORT}`);
});
