// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { FORMAT, latestRecord, events } from './format.mjs';

const module = new WebAssembly.Module(fs.readFileSync('build/mc1.wasm'));
const native = JSON.parse(fs.readFileSync('build/native.json'));
const tap = (e, button) => { e.emu_input(0, 1 << button); e.emu_input(0, 0); };
function boot(image) {
    const e = new WebAssembly.Instance(module, {}).exports;
    const flash = new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), e.emu_flash_size());
    assert.equal(flash.length, 73728); flash.fill(255); if (image) flash.set(image);
    e.emu_init(); assert.equal(e.emu_state(27), 64); return e;
}
function save(e) {
    const generation = e.emu_flash_gen(); tap(e, 9); tap(e, 9);
    assert.equal(e.emu_flash_gen() - generation, 11, 'SAVE erases nine sectors, writes body and commits header');
    return new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), e.emu_flash_size()).slice();
}
const hashBytes = bytes => bytes.reduce((hash, byte) => Math.imul(hash ^ byte, 16777619) >>> 0, 2166136261);
const step = (record, pattern, part, index) => record.slice(FORMAT.stepOffset + ((pattern * 4 + part) * 16 + index) * 8, FORMAT.stepOffset + ((pattern * 4 + part) * 16 + index + 1) * 8);

const e = boot(); tap(e, 6);
for (let pattern = 0; pattern < 64; pattern++) {
    e.emu_enc(1, pattern - e.emu_state(9)); e.emu_enc(2, 15 - e.emu_state(28));
    e.emu_input(1 << (pattern % 27), 0); e.emu_input(0, 0);
}
e.emu_enc(0, 3); e.emu_enc(3, 15 - e.emu_state(28)); e.emu_input(1 << 15, 0); e.emu_input(0, 0);
tap(e, 8); e.emu_enc(0, -3); tap(e, 13); tap(e, 12); e.emu_render(1);
assert.equal(e.emu_state(9), 63);
e.emu_input(1 << 7, 0); e.emu_input(0, 0); e.emu_enc(2, 17);
e.emu_enc(0, 3); tap(e, 2); tap(e, 2); e.emu_enc(2, 41); tap(e, 12); tap(e, 13);
save(e); const image = save(e); const record = latestRecord(image);
assert.equal(hashBytes(record), native.patternRecordHash, 'all 64 patterns and high automation addresses serialize identically to native C');
for (let pattern = 0; pattern < 64; pattern++) {
    assert.equal(step(record, pattern, 0, 15)[0], 53 + pattern % 27, `pattern ${pattern + 1} keeps its own edited last step`);
}
assert.equal(step(record, 63, 0, 0)[0], 60, 'live REC stores the played note in pattern 64');
assert.equal(step(record, 63, 3, 15)[7] & 128, 128, 'pattern 64 retains drum lane 16 at its last step');
assert.deepEqual(events(record).map(event => [event[0], event[1], event[2]]), [[315, 0, 4], [318, 0, 40]], '16-bit addresses preserve pattern 64 automation on melodic and drum tracks');
assert.equal(events(record)[1][3], 41);
const restored = boot(image); restored.emu_enc(1, 63); tap(restored, 12);
let audioHash = 2166136261, energy = 0;
for (let block = 0; block < 256; block++) {
    restored.emu_render(512);
    for (const sample of new Float32Array(restored.memory.buffer, restored.emu_audio_ptr(), 1024)) {
        assert(Number.isFinite(sample) && Math.abs(sample) < 1); energy += sample * sample;
        const pcm = Math.round(sample * 32768) & 65535;
        audioHash = Math.imul(audioHash ^ (pcm & 255), 16777619) >>> 0;
        audioHash = Math.imul(audioHash ^ (pcm >> 8), 16777619) >>> 0;
    }
}
assert(energy > 0.1); assert.equal(audioHash, native.pattern64Hash);
assert.equal(restored.emu_parameter(3, 40), 41, 'high-address drum-track send automation replays after reload');
tap(restored, 12); const reserialized = latestRecord(save(restored));
assert.deepEqual(reserialized.slice(20), record.slice(20), 'all project data survives v6 save, reboot, replay and resave');

const queue = boot(image); tap(queue, 12); queue.emu_render(1); queue.emu_enc(1, 63);
assert.equal(queue.emu_state(9), 0); assert.equal(queue.emu_state(26), 63);
for (let i = 0; i < 100000 && queue.emu_state(9) !== 63; i++) queue.emu_render(1);
assert.equal(queue.emu_state(9), 63); assert.equal(queue.emu_state(24), 0, 'queued pattern 64 begins at the bar boundary');
queue.emu_enc(1, 1); assert.equal(queue.emu_state(26), 0, 'queue wraps pattern 64 to pattern 1');
assert.equal(queue.emu_state(9), 63, 'queued wrap does not cut the playing pattern short');
const shortcuts = boot();
const beforeShortcuts = latestRecord(save(shortcuts)).slice(20);
const whiteKeys = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23, 24, 26];
const bankKeys = [1, 3, 5, 8];
for (let bank = 0; bank < 4; bank++) {
    shortcuts.emu_input(0, 1);
    shortcuts.emu_input(1 << bankKeys[bank], 1); shortcuts.emu_input(0, 1);
    for (let index = 0; index < 16; index++) {
        shortcuts.emu_input(1 << whiteKeys[index], 1); shortcuts.emu_input(0, 1);
        assert.equal(shortcuts.emu_state(9), bank * 16 + index);
    }
    shortcuts.emu_input(0, 0);
}
assert.equal(shortcuts.emu_midi_pop(), 0, 'pattern chords do not emit musical MIDI notes');
shortcuts.emu_render(128);
assert(new Float32Array(shortcuts.memory.buffer, shortcuts.emu_audio_ptr(), 256).every(sample => sample === 0), 'pattern chords do not sound notes');
assert.deepEqual(latestRecord(save(shortcuts)).slice(20), beforeShortcuts, 'pattern selection does not edit or record project data');
shortcuts.emu_input(1, 0);
const untransposed = shortcuts.emu_midi_pop();
assert.equal((untransposed >> 8) & 127, 53, 'modifier chords do not transpose subsequent notes');
shortcuts.emu_input(0, 0);
const shortcutQueue = boot(); tap(shortcutQueue, 12);
shortcutQueue.emu_input(0, 1);
shortcutQueue.emu_input(1 << bankKeys[3], 1); shortcutQueue.emu_input(0, 1);
shortcutQueue.emu_input(1 << whiteKeys[15], 1);
assert.equal(shortcutQueue.emu_state(9), 0); assert.equal(shortcutQueue.emu_state(26), 63);
shortcutQueue.emu_input(1 << whiteKeys[15], 0); shortcutQueue.emu_input(0, 0);
for (let block = 0; block < 1000 && shortcutQueue.emu_state(9) !== 63; block++) shortcutQueue.emu_render(128);
assert.equal(shortcutQueue.emu_state(9), 63); assert.equal(shortcutQueue.emu_state(24), 0);
console.log(JSON.stringify({ scenario: 'OCT- four-bank/all64 shortcuts, no note/record/transpose leakage and bar-quantized queue', pass: true }));
console.log(JSON.stringify({ scenario: '64-pattern edit, last-step drums, live REC, queue/wrap, 16-bit automation, v6 A/B save/reload and native/WASM parity', patterns: 64, flashBytes: image.length, audioHash, recordHash: hashBytes(record), pass: true }));
