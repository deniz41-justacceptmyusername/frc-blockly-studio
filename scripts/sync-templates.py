"""Refresh embedded runtime templates without changing other upstream assets."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
target = root / 'integration-assets.js'
text = target.read_text(encoding='utf-8')
prefix = "'use strict';\nFRC.integrationAssets="
if not text.startswith(prefix):
    raise SystemExit('Unexpected integration-assets.js format; refusing to overwrite it.')
assets = json.loads(text[len(prefix):].strip().removesuffix(';'))
assets['templates'] = {
    path.name.removesuffix('.java.txt'): path.read_text(encoding='utf-8')
    for path in sorted((root / 'templates').glob('*.java.txt'))
}
target.write_text(prefix + json.dumps(assets, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(f'Updated {len(assets["templates"])} runtime templates.')
