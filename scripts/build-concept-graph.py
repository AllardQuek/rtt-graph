import json
import math
from collections import Counter, defaultdict
from pathlib import Path
import networkx as nx

ROOT = Path(__file__).resolve().parent.parent
IN = ROOT / 'riding_theory_questions.json'
OUT_GRAPH = ROOT / 'frontend' / 'public' / 'concept-graph.json'
OUT_QS = ROOT / 'frontend' / 'public' / 'questions-tagged.json'

CONCEPTS = [
    ('alcohol', 'Alcohol', ['alcohol', 'drink', 'drunk']),
    ('ambulance', 'Ambulance', ['ambulance']),
    ('bend', 'Bend / Corner', ['bend', 'corner', 'curve']),
    ('blind-spot', 'Blind Spot', ['blind spot', 'blindspot']),
    ('braking', 'Braking', ['brake', 'braking']),
    ('bus-lane', 'Bus Lane', ['bus lane']),
    ('cyclist', 'Cyclist', ['cyclist', 'cyclists', 'bicycle']),
    ('demerit-points', 'Demerit Points', ['demerit', 'demerit points']),
    ('dipped-headlights', 'Dipped Headlights', ['dipped', 'headlight']),
    ('distance', 'Safe Distance', ['tailgating', 'following distance', 'too close']),
    ('emergency-vehicle', 'Emergency Vehicle', ['emergency vehicle', 'emergency vehicles']),
    ('expressway', 'Expressway', ['expressway']),
    ('filter-lane', 'Filter Lane', ['filter lane']),
    ('flood', 'Flood', ['flood', 'flooded']),
    ('give-way', 'Give Way', ['give way']),
    ('helmet', 'Helmet', ['helmet']),
    ('horn', 'Horn', ['horn']),
    ('junction', 'Junction', ['junction', 'intersection']),
    ('lane-discipline', 'Lane Discipline', ['lane discipline', 'lane change', 'change lane']),
    ('lorry', 'Lorry / Heavy Vehicle', ['lorry', 'heavy vehicle']),
    ('motorcycle-control', 'Motorcycle Control', ['handlebar', 'balance', 'control of', 'skid']),
    ('overtaking', 'Overtaking', ['overtake', 'overtaking']),
    ('parking', 'Parking', ['park', 'parking']),
    ('pedestrian', 'Pedestrian', ['pedestrian', 'pedestrians']),
    ('pillion', 'Pillion', ['pillion']),
    ('probation', 'Probation', ['probation']),
    ('rain', 'Wet / Rain', ['rain', 'wet road', 'wet weather']),
    ('rear-view-mirror', 'Rear View Mirror', ['rear view mirror', 'rear-view mirror']),
    ('reverse', 'Reverse', ['reverse', 'reversing']),
    ('right-of-way', 'Right of Way', ['right of way', 'right-of-way']),
    ('road-shoulder', 'Road Shoulder', ['road shoulder', 'shoulder']),
    ('roundabout', 'Roundabout', ['roundabout']),
    ('signal', 'Signal / Indicator', ['signal', 'indicator', 'indicate']),
    ('siren', 'Siren', ['siren']),
    ('skid', 'Skid', ['skid', 'skidding']),
    ('speed-limit', 'Speed Limit', ['speed limit', 'exceed speed']),
    ('stop-line', 'Stop Line', ['stop line']),
    ('traffic-light', 'Traffic Light', ['traffic light', 'red light', 'amber light', 'green light']),
    ('u-turn', 'U-Turn', ['u-turn', 'u turn']),
    ('zebra-crossing', 'Crossing', ['zebra crossing', 'pedestrian crossing', 'crossing']),
]

TOPIC_COLORS = {
    'Alcohol / Road Safety': '#ef4444',
    'Traffic Rules': '#3b82f6',
    'General Questions': '#22c55e',
    'Road Safety': '#f59e0b',
    'Competency': '#8b5cf6',
    'Lane Discipline / Overtaking': '#ec4899',
    'Unknown': '#94a3b8',
}


def topic(category):
    if 'Alcohol' in category or 'Road Safety' in category and 'Set' not in category:
        return 'Alcohol / Road Safety'
    if 'Traffic Rules' in category:
        return 'Traffic Rules'
    if 'General Questions' in category:
        return 'General Questions'
    if 'Road Safety' in category:
        return 'Road Safety'
    if 'Competency' in category:
        return 'Competency'
    if 'Lane Discipline' in category or 'Overtaking' in category:
        return 'Lane Discipline / Overtaking'
    return 'Unknown'


def topic_color(category):
    return TOPIC_COLORS.get(topic(category), '#94a3b8')


questions = json.loads(IN.read_text())

def normalize(text):
    return (text or '').lower()

for q in questions:
    blob = normalize(q['question']) + ' ' + ' '.join(normalize(o) for o in q['options']) + ' ' + normalize(q['answer_text'])
    q['_blob'] = blob
    q['conceptIds'] = []

for cid, label, aliases in CONCEPTS:
    for q in questions:
        if any(normalize(a) in q['_blob'] for a in aliases):
            q['conceptIds'].append(cid)

concept_counts = Counter()
concept_cats = defaultdict(Counter)
concept_qids = defaultdict(list)
edge_counts = defaultdict(int)
edge_cats = defaultdict(Counter)
edge_qids = defaultdict(list)

for q in questions:
    cids = q['conceptIds']
    cat = q['category']
    for cid in cids:
        concept_counts[cid] += 1
        concept_cats[cid][cat] += 1
        concept_qids[cid].append(q['id'])
    for i in range(len(cids)):
        for j in range(i + 1, len(cids)):
            a, b = cids[i], cids[j]
            if a == b:
                continue
            key = tuple(sorted((a, b)))
            edge_counts[key] += 1
            edge_cats[key][cat] += 1
            edge_qids[key].append(q['id'])

# Build graph for layout
G = nx.Graph()
for cid, label, aliases in CONCEPTS:
    if concept_counts[cid] == 0:
        continue
    primary_cat = concept_cats[cid].most_common(1)[0][0]
    G.add_node(
        cid,
        label=label,
        count=concept_counts[cid],
        category=primary_cat,
        topic=topic(primary_cat),
        color=topic_color(primary_cat),
        questionIds=concept_qids[cid][:50],
    )

raw_edges = []
for (a, b), weight in edge_counts.items():
    if a not in G or b not in G:
        continue
    primary_cat = edge_cats[(a, b)].most_common(1)[0][0]
    raw_edges.append({
        'a': a,
        'b': b,
        'weight': weight,
        'category': primary_cat,
        'topic': topic(primary_cat),
        'color': topic_color(primary_cat),
        'questionIds': edge_qids[(a, b)][:30],
    })

# Filter edges: keep only meaningful ones, then top 70 to avoid clutter
raw_edges = [e for e in raw_edges if e['weight'] >= 2]
raw_edges.sort(key=lambda e: -e['weight'])
raw_edges = raw_edges[:70]

for e in raw_edges:
    G.add_edge(e['a'], e['b'], **{k: v for k, v in e.items() if k not in ('a', 'b')})

# Seed layout by category to form clusters
unique_cats = list({G.nodes[n]['category'] for n in G.nodes()})
unique_cats.sort()
seed = {}
for n in G.nodes():
    idx = unique_cats.index(G.nodes[n]['category'])
    angle = (idx / len(unique_cats)) * 2 * math.pi
    # add slight jitter per node so same-category nodes don't land exactly on top
    jitter = (hash(n) % 1000) / 1000
    angle += (jitter - 0.5) * 0.4
    seed[n] = (0.8 * math.cos(angle), 0.8 * math.sin(angle))

def normalize_positions(pos):
    xs = [p[0] for p in pos.values()]
    ys = [p[1] for p in pos.values()]
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(ys), max(ys)
    out = {}
    for n, (x, y) in pos.items():
        nxv = 500 if xmax == xmin else 40 + ((x - xmin) / (xmax - xmin)) * 920
        nyv = 500 if ymax == ymin else 40 + ((y - ymin) / (ymax - ymin)) * 920
        out[n] = {'x': nxv, 'y': nyv}
    return out

# 1. Circular topic wheel: evenly spread, colour-coded by topic
topic_members = defaultdict(list)
for n in G.nodes():
    topic_members[G.nodes[n]['topic']].append(n)

topics = sorted(topic_members.keys())
topic_count = len(topics)

circular_pos = {}
for topic in topics:
    members = topic_members[topic]
    base = (topics.index(topic) / topic_count) * 2 * math.pi
    spread = (2 * math.pi / topic_count) * 0.75
    for i, n in enumerate(members):
        frac = (i + 0.5) / len(members)
        angle = base + (frac - 0.5) * spread
        r = 320 + 90 * (i % 2)
        circular_pos[n] = (math.cos(angle) * r, math.sin(angle) * r)

# 2. Force-directed: proximity = relatedness
force_pos = nx.spring_layout(G, k=6.0, iterations=500, seed=42, weight='weight')

# 3. Spread: force layout with stronger repulsion and unweighted edges for a looser view
spread_pos = nx.spring_layout(G, k=4.0, iterations=500, seed=123, weight=None)

layouts = {
    'circular': normalize_positions(circular_pos),
    'force': normalize_positions(force_pos),
    'spread': normalize_positions(spread_pos),
}

pos = circular_pos

def norm(x, lo, hi):
    if hi == lo:
        return 500
    return 40 + ((x - lo) / (hi - lo)) * 920

xs = [p[0] for p in pos.values()]
ys = [p[1] for p in pos.values()]
xmin, xmax = min(xs), max(xs)
ymin, ymax = min(ys), max(ys)

nodes = []
for cid in G.nodes():
    x, y = pos[cid]
    data = G.nodes[cid]
    nodes.append({
        'id': cid,
        'label': data['label'],
        'x': norm(x, xmin, xmax),
        'y': norm(y, ymin, ymax),
        'r': 6 + min(data['count'] * 0.45, 16),
        'count': data['count'],
        'category': data['category'],
        'topic': data['topic'],
        'color': data['color'],
        'questionIds': data['questionIds'],
    })

edges = []
for a, b, data in G.edges(data=True):
    edges.append({
        'source': a,
        'target': b,
        'weight': data['weight'],
        'category': data['category'],
        'topic': data['topic'],
        'color': data['color'],
        'questionIds': data['questionIds'],
    })

graph = {
    'nodes': nodes,
    'edges': edges,
    'categories': unique_cats,
    'layouts': layouts,
}

OUT_GRAPH.write_text(json.dumps(graph, indent=2))

for q in questions:
    del q['_blob']
OUT_QS.write_text(json.dumps(questions, indent=2))

print(f'Wrote {len(nodes)} nodes and {len(edges)} edges to {OUT_GRAPH}')
print(f'Wrote {len(questions)} tagged questions to {OUT_QS}')
