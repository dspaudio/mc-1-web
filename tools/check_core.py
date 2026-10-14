# SPDX-License-Identifier: GPL-3.0-only
from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[1];m=json.loads((r/'CORE.json').read_text())
for name,expected in m['files'].items():assert hashlib.sha256((r/name).read_bytes()).hexdigest()==expected,name
assert not list((r/'site').glob('*.wasm'))
print('PASS pinned MC-1 source hashes; no bundled comparison ROMs')
