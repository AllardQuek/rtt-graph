#!/usr/bin/env python3
"""Build a concept graph from the quiz questions using NLP keyword extraction."""

import json
import math
import re
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path

import networkx as nx
from yake import KeywordExtractor

IN = Path(__file__).parent.parent / 'frontend' / 'public' / 'questions-tagged.json'
OUT = Path(__file__).parent.parent / 'frontend' / 'public' / 'concept-graph-nlp.json'

STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'which',
    'who', 'what', 'how', 'why', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'must', 'shall', 'you', 'your', 'we', 'our', 'they', 'their', 'it', 'its', 'this',
    'that', 'these', 'those', 'one', 'two', 'three', 'for', 'from', 'with', 'without', 'of',
    'on', 'at', 'to', 'into', 'onto', 'by', 'about', 'as', 'like', 'so', 'such', 'all', 'any',
    'some', 'each', 'every', 'both', 'either', 'neither', 'more', 'most', 'other', 'another',
    'same', 'different', 'new', 'old', 'first', 'last', 'next', 'previous', 'following',
    'above', 'below', 'over', 'under', 'between', 'among', 'during', 'before', 'after',
    'until', 'since', 'while', 'because', 'although', 'though', 'unless', 'whether', 'once',
    'upon', 'up', 'down', 'in', 'out', 'off', 'away', 'back', 'forward', 'through', 'across',
    'along', 'around', 'behind', 'beside', 'near', 'far', 'against', 'towards', 'against',
    'not', 'no', 'yes', 'only', 'just', 'also', 'even', 'still', 'already', 'yet', 'ever',
    'never', 'always', 'often', 'sometimes', 'usually', 'rarely', 'really', 'very', 'quite',
    'too', 'much', 'many', 'little', 'few', 'less', 'least', 'more', 'most', 'well', 'better',
    'best', 'bad', 'worse', 'worst', 'good', 'great', 'right', 'wrong', 'true', 'false',
    'correct', 'incorrect', 'possible', 'impossible', 'likely', 'unlikely', 'certain',
    'sure', 'unsure', 'likely', 'probably', 'maybe', 'perhaps', 'possibly', 'option',
    'options', 'answer', 'question', 'choose', 'select', 'pick', 'following', 'given',
    'a', 'b', 'c', 'd', 'e'
}

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


def clean(text):
    if not text:
        return ''
    # remove option prefixes like A) B)
    text = re.sub(r'\b[A-E]\)\s*', ' ', text)
    return text


def normalize_kw(kw):
    kw = kw.lower().strip()
    kw = re.sub(r'[^a-z0-9\s-]+', '', kw)
    kw = re.sub(r'\s+', ' ', kw).strip()
    return kw


def concept_id(kw):
    return re.sub(r'[^a-z0-9]+', '-', kw.strip('-'))


questions = json.loads(IN.read_text())
kw_extractor = KeywordExtractor(lan='en', n=2, dedupLim=0.7, top=6)

concept_counts = Counter()
concept_qids = defaultdict(list)
concept_categories = defaultdict(Counter)
edge_counts = Counter()

for q in questions:
    text = clean(q['question'])
    text += ' ' + ' '.join(clean(o) for o in q.get('options', []))
    text += ' ' + clean(q.get('answer_text', ''))

    kws = []
    seen = set()
    for kw, score in kw_extractor.extract_keywords(text):
        kw = normalize_kw(kw)
        if not kw:
            continue
        cid = concept_id(kw)
        if not cid or cid in STOPWORDS or cid in seen:
            continue
        # skip single words shorter than 4 chars and pure stop phrases
        parts = cid.split('-')
        if len(parts) == 1 and len(parts[0]) < 4:
            continue
        if all(p in STOPWORDS for p in parts):
            continue
        seen.add(cid)
        kws.append(cid)
        concept_counts[cid] += 1
        concept_qids[cid].append(q['id'])
        concept_categories[cid][topic(q['category'])] += 1

    for a, b in combinations(sorted(set(kws)), 2):
        if a == b:
            continue
        edge_counts[(a, b)] += 1

# keep top 80 concepts by count
keep = set([c for c, _ in concept_counts.most_common(80)])

# filter edges to kept concepts
filtered_edges = {(a, b): w for (a, b), w in edge_counts.items() if a in keep and b in keep}

G = nx.Graph()
for cid in keep:
    primary_cat = concept_categories[cid].most_common(1)[0][0]
    label = cid.replace('-', ' ').title()
    G.add_node(
        cid,
        label=label,
        count=concept_counts[cid],
        category=primary_cat,
        topic=primary_cat,
        color=topic_color(primary_cat),
        questionIds=concept_qids[cid][:50],
    )

for (a, b), w in filtered_edges.items():
    common = [qid for qid in concept_qids[a] if qid in set(concept_qids[b])]
    primary_cat = (G.nodes[a]['category'] if G.nodes[a]['count'] >= G.nodes[b]['count'] else G.nodes[b]['category'])
    G.add_edge(
        a, b,
        weight=w,
        category=primary_cat,
        topic=primary_cat,
        color=topic_color(primary_cat),
        questionIds=common[:30],
    )


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


# Circular topic wheel layout
topic_members = defaultdict(list)
for n in G.nodes():
    topic_members[G.nodes[n]['topic']].append(n)

topics = sorted(topic_members.keys())
circular_pos = {}
for topic in topics:
    members = topic_members[topic]
    base = (topics.index(topic) / len(topics)) * 2 * math.pi
    spread = (2 * math.pi / len(topics)) * 0.75
    for i, n in enumerate(members):
        frac = (i + 0.5) / len(members)
        angle = base + (frac - 0.5) * spread
        r = 320 + 90 * (i % 2)
        circular_pos[n] = (math.cos(angle) * r, math.sin(angle) * r)

# Force and spread layouts
force_pos = nx.spring_layout(G, k=6.0, iterations=500, seed=42, weight='weight')
spread_pos = nx.spring_layout(G, k=4.0, iterations=500, seed=123, weight=None)

layouts = {
    'circular': normalize_positions(circular_pos),
    'force': normalize_positions(force_pos),
    'spread': normalize_positions(spread_pos),
}

pos = circular_pos
xs = [p[0] for p in pos.values()]
ys = [p[1] for p in pos.values()]
xmin, xmax = min(xs), max(xs)
ymin, ymax = min(ys), max(ys)


def norm(x, lo, hi):
    if hi == lo:
        return 500
    return 40 + ((x - lo) / (hi - lo)) * 920


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
    'categories': sorted({G.nodes[n]['category'] for n in G.nodes()}),
    'layouts': layouts,
}

OUT.write_text(json.dumps(graph, indent=2))
print(f'Wrote {len(nodes)} nodes and {len(edges)} edges to {OUT}')
