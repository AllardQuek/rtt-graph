---
agent: devin-local
session: jewel-nannyberry
created: 2026-08-03T15:11:11Z
updated: 2026-08-03T15:35:00Z
---

# SPF Riding Theory Quiz — Redesign Plan (v2)

## 1. Retrospection on the first prototype

The first build made the quiz bank look nicer, but it is still a quiz app at heart. Each of the three modes (`Daily Commute`, `Rider's Quest`, `Lane Split Survival`) essentially asks the same FormSG-style multiple-choice questions inside a cleaner UI. The learning experience is still static, page-by-page, and does not change the *mental model* of the rider. That is why it feels lame.

What is missing:
- **Movement, pacing, and urgency** — riding is not a form; it is a continuous, dynamic flow.
- **A connected picture of knowledge** — rules, hazards, and road conditions are not isolated; they form a network of cause/effect and dependencies.
- **Embodied context** — learners need to feel like they are *in* the road situation, not reading about it.
- **Delight and novelty** — the app should not look like a government form or a generic flashcard app.

## 2. Research: graphify

`graphify` (PyPI `graphifyy`) turns a corpus of text/docs/code into a navigable knowledge graph. Relevant capabilities:
- Detects files and extracts entities/relationships.
- Builds a NetworkX graph, clusters communities with Leiden, and identifies "god nodes" (most-connected concepts).
- Outputs `graph.json` and an interactive `graph.html`.
- For documents/text it uses an LLM pass, so it can be costly and slow for 400 questions.

How we can use it for this project:
- Feed the 400 questions (or a prepared text corpus of question+answer pairs) through `graphify` to discover concept nodes, their relationships, and community clusters.
- The resulting graph becomes the **backbone of the learning map** — not a cosmetic diagram, but the actual navigation structure of the app.
- If `graphify` proves too slow/expensive for this small corpus, we can implement a lightweight custom extractor (regex + keyword co-occurrence) that produces the same `graph.json` shape.

## 3. Why a graph at all?

The 400 questions are not random; they cluster around concepts such as *blind spots, centrifugal force, bus lanes, emergency vehicles, alcohol impairment, overtaking, demerit points*. A graph makes those connections visible so a learner can see, for example, that "wet road" connects to "braking distance", "cornering", and "skidding". The graph is the curriculum map. The visual metaphor can be anything — the important part is that it is **networked and navigable**, not a list.

## 4. Radical UI/UX concept options

### Option A — Concept Road Network (graph-first, riding-themed)

Replace the metro idea with a **top-down road network of Singapore-style roads**.
- **Nodes** = junctions/roundabouts/interchanges named after concepts/hazards extracted from the questions (e.g., *Blind Spot Junction*, *Centrifugal Curve*, *Bus Lane Crossing*, *Emergency Merge*, *Alcohol Dip*).
- **Edges** = roads connecting related concepts. Road colour matches the original category (Alcohol, Traffic Rules, Road Safety, Competency, etc.). Road thickness shows how often the connection is tested.
- **God nodes** = major multi-lane interchanges that connect many concepts.
- **Navigation**:
  - Pan by dragging, zoom with scroll/pinch.
  - Click/tap a junction to start its challenge.
  - Arrow keys or WASD to ride the motorbike avatar from junction to junction.
- **Clearing a junction** unlocks the roads out of it and reveals adjacent junctions.
- Why it works: it is a graph, but the visual language is riding itself. No metro abstraction.

### Option B — Endless Rider (kinetic arcade)

A **side-scrolling motorbike game** built on the same questions.
- The rider moves continuously along a stylised Singapore road.
- Hazards/obstacles appear: junctions, cyclists, lorries, bus lanes, wet patches, emergency vehicles.
- When a hazard is imminent, the game slows and a decision bubble appears with the three answer choices.
- Choose correctly → speed boost, score up, smooth animation continues.
- Choose wrong or take too long → crash animation, the hazard replays in slow-mo, the rule is explained, and you lose a life.
- Add parallax backgrounds, motorbike tilt/lean, particle effects, increasing speed, and local high scores.
- Why it works: riding *is* movement. This mode makes the learner practise decisions under time pressure while keeping the rule bank identical.

### Option C — Rogue-lite Delivery Rush (narrative, extreme)

You are a food-delivery rider in Singapore. Each "shift" is a **procedural route** made of road segments.
- At every segment a scenario pops up (e.g., customer is waiting, rain starts, an ambulance approaches, a lorry is turning left).
- Correct answer = on-time delivery, tip, bike durability preserved.
- Wrong answer = delay, damaged bike, unhappy customer, lower rating.
- Between shifts: upgrade tires, brakes, helmet, or invest in "street knowledge" to unlock shortcuts.
- Unlock districts (Bedok, Clementi, Jurong, etc.) as you level up.
- Why it works: it is a fully fledged game where the theory test is the game mechanic. It does not look, feel, or behave like a quiz.

### Option D — Hazard Racer / Time Trial (competitive, bold)

A **race against the clock or a ghost rider** on a closed track.
- Questions appear as gates/checkpoints.
- You must answer before the bike reaches the gate.
- Correct answer = speed boost.
- Wrong answer = slow down / spin out.
- At the end of 10 gates you get a lap time and unlock harder tracks.
- Why it works: it is fast, replayable, and gives an immediate "can I beat my time" loop.

### Option E — Combined: Road Network + Endless Rider levels (recommended)

Use the **Road Network as the main navigation** and let each junction launch a short **Endless Rider level** focused on that concept.
- The map gives the "big picture" and lets learners choose what to study.
- The runner level turns that concept into kinetic, timed practice.
- Progress on a junction unlocks adjacent junctions and reveals new roads.
- This combines the strengths of Options A and B while keeping everything on-theme.

## 5. Detailed answer on "stations" and navigation for the combined option

**What are the stations/junctions?**
- Each junction is a concept/hazard/rule extracted from the question bank.
- Examples from the 400 questions: *Centrifugal Force*, *Blind Spot*, *Bus Lane*, *Emergency Vehicle*, *Overtaking*, *Alcohol*, *Flood*, *U-Turn*, *Demerit Points*.
- A junction can also be a cluster of very similar questions if they are too small individually.

**How does the user navigate?**
- **Mouse/touch:** drag to pan, pinch/scroll to zoom, click a junction to open its challenge.
- **Keyboard:** arrow keys or WASD to ride the motorbike avatar along the roads. Press `Enter`/`Space` to start the challenge at the current junction.
- **On mobile:** one-finger drag to pan, two-finger pinch to zoom, tap a junction to start.

**What happens at a junction?**
- A short overlay appears with 3–5 questions focused on that concept.
- Answer them to "clear" the junction.
- Clearing unlocks the roads (edges) to neighbouring junctions.
- God-node junctions (highly connected concepts) require more questions to clear, acting as boss checkpoints.

## 6. Recommended first milestone

Build **Option E** as a single-page prototype:
1. Generate a concept graph from the question bank (custom extractor or `graphify`).
2. Render it as a zoomable/pannable road network (SVG or Canvas).
3. Clicking a junction opens an overlay that runs an Endless Rider mini-level using questions tagged to that concept.
4. Track cleared junctions in `localStorage`.

Then add:
- Sound, particle effects, and crash replays.
- A "why" explanation after every wrong answer.
- Local high scores and per-junction mastery badges.

## 7. Open decisions

- Which 3 of the 5 options (A–E) should replace the current 3 tabs?
- Should we try `graphify` or build a lightweight custom concept extractor?
- 2D Canvas, SVG, or a library like Phaser/Three.js for the runner and map?
- How much narrative/visual polish vs. bare mechanics for this prototype?
