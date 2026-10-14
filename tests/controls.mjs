// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import assert from 'node:assert/strict';

const mod = new WebAssembly.Module(fs.readFileSync('build/mc1.wasm'));
function boot() {
    const e = new WebAssembly.Instance(mod, {}).exports;
    assert.equal(typeof e.emu_enc_at, 'function', 'WASM exposes timestamped encoder input');
    assert.equal(typeof e.emu_ui_tick, 'function', 'WASM exposes a UI clock independent of playback');
    new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), e.emu_flash_size()).fill(255);
    e.emu_init();
    return e;
}

const tap = (e, button) => { e.emu_input(0, 1 << button); e.emu_input(0, 0); };
const frame = e => { e.emu_frame(); return new Uint16Array(e.memory.buffer, e.emu_fb_ptr(), 240 * 240).slice(); };
const cutoff = () => { const e = boot(); e.emu_enc(2, 64 - e.emu_state(7)); return e; };
const presetZero = () => { const e = boot(); e.emu_enc(6, -e.emu_state(6)); return e; };

const slow = cutoff();
for (const ms of [1000, 1060, 1121]) slow.emu_enc_at(2, 1, ms);
assert.equal(slow.emu_state(7), 67, 'slow turns and the exact 60ms boundary move one unit');
const fast = cutoff();
fast.emu_enc_at(2, 1, 1000); assert.equal(fast.emu_state(7), 65);
fast.emu_enc_at(2, 1, 1059); assert.equal(fast.emu_state(7), 68, 'under 60ms multiplies continuous controls by three');
fast.emu_enc_at(2, -1, 1060); assert.equal(fast.emu_state(7), 67, 'direction reversal starts with one unit');
fast.emu_enc_at(2, -1, 1070); assert.equal(fast.emu_state(7), 64);
fast.emu_enc_at(2, -1, 1200); assert.equal(fast.emu_state(7), 63, 'idle resets acceleration');
fast.emu_enc_at(3, 1, 1201);
fast.emu_enc_at(2, -1, 1202); assert.equal(fast.emu_state(7), 62, 'another encoder resets acceleration');
tap(fast, 8);
fast.emu_enc_at(2, -1, 1203); assert.equal(fast.emu_state(7), 61, 'button/context change resets acceleration');
fast.emu_input(1, 0); fast.emu_input(0, 0);
fast.emu_enc_at(2, -1, 1204); assert.equal(fast.emu_state(7), 60, 'keyboard input resets acceleration');
fast.emu_enc(2, 1); assert.equal(fast.emu_state(7), 61, 'raw encoder preserves its exact delta');
fast.emu_enc_at(2, 1, 1205); assert.equal(fast.emu_state(7), 62, 'raw input resets timed acceleration');

const tempo = boot(); tap(tempo, 7); tap(tempo, 7);
assert.equal(tempo.emu_state(2), 2);
tempo.emu_enc_at(2, 1, 1000); assert.equal(tempo.emu_state(0), 119);
tempo.emu_enc_at(2, 1, 1059); assert.equal(tempo.emu_state(0), 125, 'fast BPM turns use six units');
tempo.emu_enc_at(2, 1, 1119); assert.equal(tempo.emu_state(0), 126);
tempo.emu_enc_at(2, -1, 1120); assert.equal(tempo.emu_state(0), 125);
console.log(JSON.stringify({ scenario: 'slow/fast controls, BPM, exact threshold, direction, idle and context reset', pass: true }));

const choices = boot();
for (let i = 1; i <= 4; i++) { choices.emu_enc_at(0, 1, 1000 + i); assert.equal(choices.emu_state(1), i % 4); }
choices.emu_enc_at(0, -1, 1005); assert.equal(choices.emu_state(1), 3);
for (let i = 1; i <= 4; i++) { choices.emu_enc_at(1, 1, 1010 + i); assert.equal(choices.emu_state(9), i % 4); }
choices.emu_enc_at(1, -1, 1015); assert.equal(choices.emu_state(9), 3);
for (let i = 1; i <= 8; i++) { choices.emu_enc_at(6, 1, 1020 + i); assert.equal(choices.emu_state(8), i % 8); }
choices.emu_enc_at(6, -1, 1029); assert.equal(choices.emu_state(8), 7);
assert.equal(choices.emu_state(14), 1, 'drum kit choices also open the popup');
console.log(JSON.stringify({ scenario: 'four parts, four patterns and eight drum kits stay one step at fast speed and wrap', pass: true }));

const presets = presetZero();
presets.emu_enc_at(6, 1, 1000); assert.equal(presets.emu_state(6), 1);
presets.emu_enc_at(6, 1, 1010); assert.equal(presets.emu_state(6), 4, '128-preset list accelerates by three');
presets.emu_enc_at(6, -1, 1020); assert.equal(presets.emu_state(6), 3);
presets.emu_enc_at(6, -1, 1030); assert.equal(presets.emu_state(6), 0);
presets.emu_enc_at(6, -1, 1040); assert.equal(presets.emu_state(6), 125, 'accelerated reverse wraps at preset 1');
presets.emu_enc_at(6, 1, 1050); assert.equal(presets.emu_state(6), 126);
presets.emu_enc_at(6, 1, 1060); assert.equal(presets.emu_state(6), 1, 'accelerated forward wraps at preset 128');

const popup = presetZero();
const home = frame(popup);
popup.emu_enc_at(6, 1, 1000);
assert.equal(popup.emu_state(6), 1, 'popup selection applies immediately without confirmation');
assert.equal(popup.emu_state(14), 1);
const opened = frame(popup);
assert(opened.reduce((count, pixel, i) => count + (pixel !== home[i]), 0) > 1000, 'popup changes a substantial region of the actual C framebuffer');
assert.equal(popup.emu_state(4), 0);
popup.emu_ui_tick(1499); assert.equal(popup.emu_state(14), 1, 'popup remains visible at 499ms while sequencer is stopped');
popup.emu_ui_tick(1500); assert.equal(popup.emu_state(14), 0, 'popup closes at exactly 500ms without audio rendering');
assert.equal(popup.emu_state(6), 1, 'closing retains the immediately selected preset');
assert.notDeepEqual(frame(popup), opened, 'actual framebuffer returns from the list to HOME');
popup.emu_enc_at(6, 1, 2000);
popup.emu_enc_at(6, 1, 2400);
popup.emu_ui_tick(2500); assert.equal(popup.emu_state(14), 1, 'another turn refreshes the popup deadline');
popup.emu_ui_tick(2899); assert.equal(popup.emu_state(14), 1);
popup.emu_ui_tick(2900); assert.equal(popup.emu_state(14), 0);
popup.emu_enc_at(6, 1, 3000);
popup.emu_enc_at(6, 0, 3400); popup.emu_enc_at(7, 1, 3450);
assert.equal(popup.emu_state(14), 1, 'zero/invalid inputs neither close nor refresh the popup');
popup.emu_ui_tick(3500); assert.equal(popup.emu_state(14), 0, 'zero/invalid inputs do not extend the deadline');
popup.emu_enc_at(6, 1, 0xfffffff0);
popup.emu_ui_tick((0xfffffff0 + 499) >>> 0); assert.equal(popup.emu_state(14), 1);
popup.emu_ui_tick((0xfffffff0 + 500) >>> 0); assert.equal(popup.emu_state(14), 0, 'deadline survives a 32-bit clock wrap');

for (const [name, action] of [
    ['other encoder', e => e.emu_enc_at(2, 1, 1010)],
    ['part selection', e => e.emu_enc_at(0, 1, 1010)],
    ['button', e => tap(e, 8)],
    ['keyboard', e => e.emu_input(1, 0)],
    ['raw encoder', e => e.emu_enc(6, 1)],
]) {
    const e = boot(); e.emu_enc_at(6, 1, 1000); action(e);
    assert.equal(e.emu_state(14), 0, `${name} closes the popup`);
}
const volume = boot(); volume.emu_enc_at(6, 1, 1000); volume.emu_adc_set(4, 800);
assert.equal(volume.emu_state(14), 1, 'master ADC polling does not dismiss the list');
const release = boot(); release.emu_input(1, 0); release.emu_enc_at(6, 1, 1000);
release.emu_input(0, 0);
assert.equal(release.emu_state(14), 0, 'releasing a held key also closes the popup');

const saved = presetZero(); tap(saved, 9); tap(saved, 9);
const before = new Uint8Array(saved.memory.buffer, saved.emu_flash_ptr() + 24, 12).slice();
saved.emu_enc_at(6, 1, 1000); tap(saved, 9); tap(saved, 9);
const after = new Uint8Array(saved.memory.buffer, saved.emu_flash_ptr() + 4096 + 24, 12).slice();
assert.notDeepEqual(after, before, 'popup selection changes the saved sound immediately');
console.log(JSON.stringify({ scenario: '128-preset acceleration and wrap, rendered popup, immediate sound selection, idle expiry/refresh, input dismissal and clock wrap', pass: true }));
