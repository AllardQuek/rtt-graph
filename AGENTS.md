# Project notes

## Verification commands

```bash
# Regenerate the graph data from the question bank (must print coverage: 393/393)
uv run python scripts/build-concept-graph.py

# Lint and build the frontend
cd frontend
bun run lint
bun run build
```

## Architecture quick-reference

- `frontend/src/hooks/useStats.js` persists per-question mastery in `localStorage` under `spf-riding-v3`.
- `frontend/src/lib/selection.js` provides `selectForNode` and `selectForRide` for unseen-first, Fisher–Yates question selection.
- `frontend/src/components/Runner.jsx` snapshots its question set in `game.questions`; every "Try Again" draws a fresh set.
- `scripts/build-concept-graph.py` generates `frontend/public/concept-graph.json` and `questions-tagged.json`, with a build-time assertion that every question is reachable from at least one node.
