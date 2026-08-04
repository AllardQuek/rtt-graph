# Riding Theory Graph (SPF Riding Theory Quiz)

Interactive study companion for the Singapore SPF riding theory test. This prototype turns the question bank into a navigable concept map and timed riding drills.

## What's in this repo

- `frontend/` — Vite + React app with the visual "Course Map" graph, "Free Ride" runner, and "Junction Drill" challenge modes.
- `scripts/` — Python tooling that builds the graph data from `riding_theory_questions.json`.
- `riding_theory_questions.json` — the raw question bank.
- `plans/redesign-plan.md` — design notes and concept options.

## Data pipeline

The frontend expects these JSON files in `frontend/public/`:

- `questions-tagged.json`
- `concept-graph.json`
- `concept-graph-nlp.json`

Generate them with `uv run` (uses the `.venv` created above):

```bash
# 1. Tag questions and build the keyword-based concept graph
uv run python scripts/build-concept-graph.py

# 2. Build the NLP-extracted concept graph
uv run python scripts/build-nlp-graph.py
```

You will need the Python dependencies used by the scripts (`networkx`, `yake`). Install them with `uv`:

```bash
uv venv
uv pip install -r requirements.txt
```

## Frontend setup

The frontend uses [Bun](https://bun.sh) (or any package manager that reads `package.json`).

```bash
cd frontend
bun install
bun run dev
```

Then open the URL printed by Vite (default <http://localhost:5173>).

Other useful commands:

```bash
bun run build    # production build to frontend/dist/
bun run preview  # preview the production build
bun run lint     # run Oxlint
```

## Ports

The dev server runs on Vite's default port `5173` and the preview server on `4173` by default. Vite will automatically pick the next available port if those are in use.
