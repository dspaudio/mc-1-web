#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
import os,subprocess,shutil,json,hashlib
from pathlib import Path
r=Path(__file__).resolve().parents[1];os.chdir(r);out=r/'build';out.mkdir(exist_ok=True)
core=sorted(str(p) for p in (r/'core/src').glob('*.c'))
subprocess.run([os.environ.get('CLANG','clang'),'--target=wasm32','-O2','-fno-builtin','-ffreestanding','-nostdlib','-Wall','-Wextra','-Werror','-Icore/src','-Wl,--no-entry','-Wl,--export-memory','-Wl,-z,stack-size=1048576','-Wl,--global-base=1048576',*core,'src/mc1_wasm.c','-o',str(out/'mc1.wasm')],check=True)
for n in ['install.html','firmware-ota.js','firmware-install.js','firmware-release.json']:
    (out/n).unlink(missing_ok=True)
for p in out.glob('*.fwsc'):p.unlink()
(out/'LICENSES/Apache-2.0-AC79.txt').unlink(missing_ok=True)
for n in ['index.html','emu.js','worklet.js','midi.js']:shutil.copy(r/'site'/n,out/n)
shutil.copy(r/'core/LICENSES/CC0-VSCO.txt',out/'samples-LICENSE.txt')
shutil.copy(r/'core/assets/recorded/manifest.json',out/'recorded-samples.json')
shutil.copy(r/'LICENSE',out/'LICENSE.txt')
shutil.copy(r/'NOTICE.md',out/'NOTICE.md')
info={'product':'MC-1','version':(r/'VERSION').read_text().strip(),'core':json.loads((r/'CORE.json').read_text()),'wasm_sha256':hashlib.sha256((out/'mc1.wasm').read_bytes()).hexdigest(),'wasm_bytes':(out/'mc1.wasm').stat().st_size}
(out/'build-info.json').write_text(json.dumps(info,indent=2)+'\n')
