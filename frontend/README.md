# SPF Riding Theory Quiz

Interactive study companion for the Singapore SPF riding theory test.

The app turns the question bank into a navigable concept map and timed riding drills, so revision feels more like route planning and hazard avoidance than a multiple-choice form.

## Tech stack

- React 19 + Vite
- Plain CSS with custom properties (no Tailwind / shadcn)
- SVG/Canvas-free graph rendering for the road network
- `localStorage` for lightweight progress persistence

## Design intent

The visual language is deliberately "riding HUD" rather than generic SaaS:

- **Dark slate background** (`#090a0f`) keeps focus on the road and SVG map.
- **Cyan accent (`#00f0ff`)** signals information, progress, and the rider.
- **Magenta (`#ff0055`)** marks danger, hazards, and incorrect answers.
- **Green (`#00ff9d`)** confirms success and cleared junctions.
- **Display type `Orbitron`**, body `Rajdhani`, and mono `Share Tech Mono` give the interface a dashboard/head-up-display rhythm.

These choices should look intentional, not like a default AI "cyberpunk" skin. If you add new UI, keep the color jobs consistent and avoid adding decorative gradients or glows that do not map to information, hazards, or motion.

## Available scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build

## Data files

The build expects two JSON files in the public directory:

- `questions-tagged.json` — the tagged theory question bank
- `concept-graph.json` — the generated concept/junction graph

Both are produced by the tooling in the repo root (`scripts/` and `plans/`).
