// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const files = await fs.readdir('build');
for (const name of ['index.html', 'emu.js', 'worklet.js', 'midi.js', 'mc1.wasm', 'build-info.json'])
    assert(files.includes(name), `Missing emulator resource: ${name}`);
for (const name of ['install.html', 'firmware-install.js', 'firmware-ota.js', 'firmware-release.json'])
    assert(!files.includes(name), `Installer resource in emulator build: ${name}`);
assert(!files.some(name => name.endsWith('.fwsc')));
const html = await fs.readFile('build/index.html', 'utf8');
for (const match of html.matchAll(/(?:href|src)=["']([^"'#?]+)(?:[?#][^"']*)?["']/g)) {
    const target = match[1];
    if (!/^(?:[a-z]+:|\/)/i.test(target))
        await fs.access(`build/${target}`);
}
const info = JSON.parse(await fs.readFile('build/build-info.json', 'utf8'));
assert.equal(info.version, (await fs.readFile('VERSION', 'utf8')).trim());
assert.equal(info.version, JSON.parse(await fs.readFile('package.json', 'utf8')).version);
console.log(JSON.stringify({emulatorOnlySite: 'PASS', version: info.version}));
