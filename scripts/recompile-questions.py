import json
import re
from pathlib import Path

MAIN_FORM = Path('/tmp/riding_form.json')
QUIZ_DIR = Path('/tmp/quiz_forms')
OUT = Path('/Users/allard/Local-Projects/Utils/spf-quiz/riding_theory_questions.json')

def clean_option(text):
    return re.sub(r'^[A-C]\)\s*', '', text)

# Build form-id -> category and form URL maps from the main launcher form
main = json.loads(MAIN_FORM.read_text())
category_map = {}
form_url_map = {}
for sec in main['form']['form_fields']:
    url = sec.get('description', '')
    if url.startswith('https://form.gov.sg/'):
        fid = url.rstrip('/').split('/')[-1]
        category_map[fid] = sec['title']
        form_url_map[fid] = url

questions = []
seen = set()

for path in sorted(QUIZ_DIR.glob('*.json')):
    form_id = path.stem
    category = category_map.get(form_id, 'Unknown')
    form = json.loads(path.read_text())
    fields = form['form']['form_fields']

    i = 0
    while i < len(fields):
        f = fields[i]
        if f.get('fieldType') == 'radiobutton':
            q = {
                'id': f"{form_id}:{f['_id']}",
                'globalId': f.get('globalId'),
                'formId': form_id,
                'category': category,
                'formUrl': form_url_map.get(form_id),
                'question': f.get('title', ''),
                'options': f.get('fieldOptions', []),
                'answer_letter': None,
                'answer_text': None,
                'explanation': None,
            }
            # Look ahead for answer statement
            j = i + 1
            while j < len(fields) and fields[j].get('fieldType') == 'statement':
                desc = fields[j].get('description', '').strip()
                m = re.match(r'Answer\s*:\s*([A-Z])\s*\)?\s*(.*)', desc, re.S | re.I)
                if m:
                    q['answer_letter'] = m.group(1).upper()
                    q['answer_text'] = m.group(2).strip()
                    rest = desc.split('\n', 1)
                    if len(rest) > 1:
                        q['explanation'] = rest[1].strip()
                    break
                j += 1

            text_key = q['question'].strip().lower()
            if text_key and text_key not in seen:
                seen.add(text_key)
                questions.append(q)
            i += 1
        else:
            i += 1

OUT.write_text(json.dumps(questions, indent=2))
print(f'Wrote {len(questions)} unique questions to {OUT}')
