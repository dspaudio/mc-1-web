// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('site/emu.js', 'utf8');
const panel = vm.runInNewContext(
    source.slice(0, source.indexOf('let node =')) + '\n({ BTN, KEYMAP, WHITE_IDS, BLACK_IDS });',
    { document: { getElementById: () => ({}) } },
);
const mod = new WebAssembly.Module(fs.readFileSync('build/mc1.wasm'));
function boot() {
    const e = new WebAssembly.Instance(mod, {}).exports;
    new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), e.emu_flash_size()).fill(255);
    e.emu_init();
    return e;
}
function tap(e, name) {
    e.emu_input(0, 1 << panel.BTN[name]);
    e.emu_input(0, 0);
}
function key(e, id) {
    e.emu_input(1 << id, 0);
    e.emu_input(0, 0);
}
function litKeys(e) {
    e.emu_frame();
    const leds = new Uint8Array(e.memory.buffer, e.emu_led_ptr(), 11);
    const lit = [];
    for (let col = 0; col < 11; col++) {
        for (let row = 1; row < 5; row++) {
            if (leds[col] & (1 << row)) lit.push(panel.KEYMAP[row][col]);
        }
    }
    return lit.sort((a, b) => a - b);
}

const octaveNotes = [];
for (let part = 0; part < 3; part++) {
    const e = boot();
    e.emu_enc(0, part);
    tap(e, 'SEQ');
    key(e, 7);
    tap(e, 'OCT+'); key(e, 7);
    tap(e, 'OCT-'); key(e, 7);
    tap(e, 'OCT-'); key(e, 7);
    for (let i = 0; i < 6; i++) tap(e, 'OCT-');
    key(e, 7);
    for (let i = 0; i < 8; i++) tap(e, 'OCT+');
    key(e, 7);
    key(e, 26);
    tap(e, 'SAVE'); tap(e, 'SAVE');
    assert(e.emu_flash_gen() > 0, 'panel notes must be saved successfully');
    const saved = new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), e.emu_flash_size());
    assert.equal(saved[4], 2, 'the saved project uses format version 2');
    // Format v2: 20-byte header, 72-byte settings, then 8 bytes per step.
    const notes = Array.from({ length: 7 }, (_, step) => saved[20 + 72 + part * 16 * 8 + step * 8]);
    assert.deepEqual(notes, [60, 72, 60, 48, 24, 96, 108], `OCT buttons transpose part ${part + 1} and clamp at +/-3`);
    octaveNotes.push(notes);
}
console.log(JSON.stringify({ scenario: 'OCT input to saved notes, all three melodic parts', octaveNotes }));

const octave = boot();
assert.deepEqual(litKeys(octave), [], 'both OCT LEDs start off at the default octave');
tap(octave, 'OCT-');
assert.deepEqual(litKeys(octave), [panel.BTN['OCT-']], 'OCT- lights below the default octave');
tap(octave, 'OCT+');
assert.deepEqual(litKeys(octave), [], 'OCT LEDs clear on return to the default octave');
tap(octave, 'OCT+');
assert.deepEqual(litKeys(octave), [panel.BTN['OCT+']], 'OCT+ lights above the default octave');
tap(octave, 'OCT-');
assert.deepEqual(litKeys(octave), [], 'OCT+ clears on return to the default octave');
console.log(JSON.stringify({ scenario: 'OCT direction LED feedback and return to default', pass: true }));

const e = boot();
assert.deepEqual(litKeys(e), [], 'transport LEDs start off');
tap(e, 'REC');
assert.deepEqual(litKeys(e), [panel.BTN.REC], 'REC keeps its panel LED');
tap(e, 'REC');
tap(e, 'PLAY');
const sequence = [];
let previous = -1;
for (let block = 0; block < 2500 && sequence.length < 17; block++) {
    const lit = litKeys(e);
    assert(lit.includes(panel.BTN.PLAY), 'PLAY stays lit during playback');
    const notes = lit.filter(id => id >= 14).map(id => id - 14);
    assert.equal(notes.length, 1, 'exactly one sequencer key LED is lit');
    const note = notes[0];
    if (note !== previous) {
        const step = sequence.length % 16;
        assert.equal(note, panel.WHITE_IDS[step], `step ${step + 1} must light white key ${panel.WHITE_IDS[step]}, not chromatic key ${note}`);
        assert(!panel.BLACK_IDS.includes(note), 'sequencer must not light black keys');
        sequence.push(note);
        previous = note;
    }
    e.emu_render(128);
}
assert.equal(sequence.length, 17, 'all 16 steps and wraparound were observed');
tap(e, 'PLAY');
assert.deepEqual(litKeys(e), [], 'stopping clears the sequencer and PLAY LEDs');
console.log(JSON.stringify({ scenario: '16 white sequencer LEDs, wraparound, PLAY/REC/STOP', sequence, pass: true }));

const mixer = boot();
tap(mixer, 'GLO');
assert.equal(mixer.emu_state(2), 5, 'GLO opens the global mixer');
mixer.emu_enc(0, 3);
for (let knob = 0; knob < 4; knob++) mixer.emu_enc(knob + 2, knob % 2 ? 127 : -127);
mixer.emu_frame();
const mixerFrame = new Uint16Array(mixer.memory.buffer, mixer.emu_fb_ptr(), 240 * 240);
assert.equal(mixerFrame[120 * 240 + 205], 0xfb20, 'selected drums remain audible before ARP');
tap(mixer, 'ARP'); mixer.emu_frame();
assert.equal(mixerFrame[120 * 240 + 205], 0x4208, 'ARP dims the selected track in the mixer');
tap(mixer, 'ARP'); mixer.emu_frame();
assert.equal(mixerFrame[120 * 240 + 205], 0xfb20, 'ARP again unmutes the selected track');
tap(mixer, 'SAVE'); tap(mixer, 'SAVE');
const mixFlash = new Uint8Array(mixer.memory.buffer, mixer.emu_flash_ptr(), mixer.emu_flash_size()).slice();
assert.deepEqual(Array.from(mixFlash.slice(60, 64)), [0, 127, 0, 127], 'four mixer knobs control all part levels even with drums selected');
const restoredMixer = new WebAssembly.Instance(mod, {}).exports;
new Uint8Array(restoredMixer.memory.buffer, restoredMixer.emu_flash_ptr(), mixFlash.length).set(mixFlash);
restoredMixer.emu_init();
tap(restoredMixer, 'SAVE'); tap(restoredMixer, 'SAVE');
const restoredFlash = new Uint8Array(restoredMixer.memory.buffer, restoredMixer.emu_flash_ptr(), restoredMixer.emu_flash_size());
assert.deepEqual(Array.from(restoredFlash.slice(4096 + 60, 4096 + 64)), [0, 127, 0, 127], 'mixer levels survive save and reboot');
tap(mixer, 'GLO'); assert.equal(mixer.emu_state(2), 2);
tap(mixer, 'GLO'); assert.equal(mixer.emu_state(2), 4);
tap(mixer, 'GLO'); assert.equal(mixer.emu_state(2), 5);
console.log(JSON.stringify({ scenario: 'global mixer knobs, saved levels and GLO page cycle', pass: true }));
