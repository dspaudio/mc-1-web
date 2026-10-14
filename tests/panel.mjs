// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';

const source = fs.readFileSync('site/emu.js', 'utf8');
const panel = vm.runInNewContext(
    source.slice(0, source.indexOf('let node =')) + '\n({ BTN, KEYMAP, WHITE_IDS, BLACK_IDS });',
    { document: { getElementById: () => ({}) } },
);
const mod = new WebAssembly.Module(fs.readFileSync('build/mc1.wasm'));
function boot(saved) {
    const e = new WebAssembly.Instance(mod, {}).exports;
    new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), e.emu_flash_size()).fill(255);
    if (saved) new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), saved.length).set(saved);
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
function saveFlash(e) {
    const generation = e.emu_flash_gen();
    tap(e, 'SAVE'); tap(e, 'SAVE');
    assert(e.emu_flash_gen() > generation, 'SAVE commits a new project record');
    return new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), e.emu_flash_size()).slice();
}
function drumAudio(e) {
    let hash = 2166136261, energy = 0;
    for (let lane = 0; lane < 16; lane++) {
        key(e, lane);
        for (let block = 0; block < 32; block++) {
            e.emu_render(128);
            const samples = new Float32Array(e.memory.buffer, e.emu_audio_ptr(), 256);
            for (const sample of samples) {
                assert(Number.isFinite(sample) && Math.abs(sample) < 1, 'drum output is finite and bounded');
                energy += sample * sample;
                const pcm = Math.round(sample * 32768) & 65535;
                hash = Math.imul(hash ^ (pcm & 255), 16777619) >>> 0;
                hash = Math.imul(hash ^ (pcm >> 8), 16777619) >>> 0;
            }
        }
    }
    assert(energy > 0.1, 'each kit produces non-silent audio');
    return { hash, energy };
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
    assert.equal(saved[4], 3, 'the saved project uses format version 3');
    // Format v3 keeps the 20-byte header, 72-byte settings and 8-byte steps.
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

const kits = boot();
kits.emu_enc(0, 3);
assert.equal(kits.emu_state(8), 0, 'factory project starts with kit 1');
kits.emu_enc(6, -1);
assert.equal(kits.emu_state(8), 7, 'PRESETS wraps backward from kit 1 to kit 8');
assert.equal(kits.emu_state(9), 0, 'changing kits does not change the pattern');
kits.emu_enc(6, 1);
assert.equal(kits.emu_state(8), 0, 'PRESETS wraps forward from kit 8 to kit 1');
kits.emu_enc(1, 1);
assert.equal(kits.emu_state(9), 1, 'ALGORITHM selects patterns with DRUMS selected');
assert.equal(kits.emu_state(8), 0, 'ALGORITHM does not change the selected kit');
kits.emu_enc(1, -1);
assert.equal(kits.emu_state(9), 0, 'ALGORITHM returns to the original pattern');

const kitAudio = [];
for (let kit = 0; kit < 8; kit++) {
    const drums = boot();
    drums.emu_enc(0, 3);
    drums.emu_enc(6, kit);
    assert.equal(drums.emu_state(8), kit, `PRESETS selects kit ${kit + 1}`);
    const saved = saveFlash(drums);
    assert.equal(saved[23], kit, 'format v3 stores the kit in the former reserved byte');
    const restored = boot(saved);
    restored.emu_enc(0, 3);
    assert.equal(restored.emu_state(8), kit, `kit ${kit + 1} survives save and reboot`);
    const audio = drumAudio(drums);
    assert.deepEqual(drumAudio(restored), audio, `kit ${kit + 1} sounds identical after reboot`);
    kitAudio.push({ kit: kit + 1, ...audio });
}
assert.equal(new Set(kitAudio.map(audio => audio.hash)).size, 8, 'all eight kits have different PCM output');
console.log(JSON.stringify({ scenario: 'eight drum kits: PRESETS wrap, ALGORITHM pattern, distinct audio, save and reboot', kitAudio, pass: true }));

const fx = boot();
tap(fx, 'FX');
const trackFx = Array.from({ length: 4 }, (_, part) => Array.from({ length: 4 }, (_, knob) => (part + 1) * 10 + knob));
for (let part = 0; part < 4; part++) {
    for (let knob = 0; knob < 4; knob++) fx.emu_enc(knob + 2, trackFx[part][knob]);
    fx.emu_enc(0, 1);
}
for (let part = 0; part < 4; part++) {
    assert.deepEqual(Array.from({ length: 4 }, (_, knob) => fx.emu_state(knob + 10)), trackFx[part], `FX changes only selected part ${part + 1}`);
    fx.emu_enc(0, 1);
}
assert.equal(fx.emu_state(5), 0, 'editing track effects preserves master effects');
tap(fx, 'FX'); fx.emu_enc(2, 19);
assert.equal(fx.emu_state(5), 19, 'FX again switches to master scope');
assert.equal(fx.emu_state(10), 10, 'master editing preserves track effects');
tap(fx, 'HOME'); tap(fx, 'FX'); fx.emu_enc(2, 1);
trackFx[0][0]++;
assert.equal(fx.emu_state(10), 11, 'HOME then FX returns to selected-track scope');
assert.equal(fx.emu_state(5), 19);
const fxFlash = saveFlash(fx);
assert.equal(fxFlash[4], 3);
assert.equal(fxFlash[6] + fxFlash[7] * 256, 2136, 'v3 appends 16 track-FX bytes');
assert.deepEqual(Array.from(fxFlash.slice(2140, 2156)), trackFx.flat(), 'all 16 track-FX parameters are serialized');
const restoredFx = boot(fxFlash);
assert.equal(restoredFx.emu_state(5), 19, 'master FX survives reboot');
for (let part = 0; part < 4; part++) {
    assert.deepEqual(Array.from({ length: 4 }, (_, knob) => restoredFx.emu_state(knob + 10)), trackFx[part], `part ${part + 1} FX survives reboot`);
    restoredFx.emu_enc(0, 1);
}
console.log(JSON.stringify({ scenario: 'selected-track FX independence, master toggle, HOME reset and v3 save/reboot', trackFx, pass: true }));

// Captured from the original v2 WASM writer: factory project, BPM 137 and delay 37.
const legacyV2 = inflateSync(Buffer.from('eJzNkUFKw1AQhv8ExVKELlyIOzcuaimEQnlWguYRLaFJSFoalGzcvI07waUn8EaewQt4BW+hqZ1q/CMEfJvOZpiZ75/Nl4bT1EXUcQA8vRwMXt/fPp7RxWr2SkcNu8oA7pHqlfmdQQHXuTcdx/RKGBMbE5zeBobqBOsaAo/a+eqFxq8OzXcXmDQ5q/zEDxKD/5dt/hrIVW1OAFOf50Cp/uAT2UfEJ8TP6f9S+Oxn/zDC7qoXo/Vc9Z36XN33Wu5t+UO673/PffHTFx+1Ds33yt+4yVnlx2e+lT/bvCY/7DMlnxs+kv0V8RHxKf3PhY+3xL8nfjzxUevQfK/8+U3OKu9fhlb+bPMR+cnI55J8bvhM9jHxGfFL+n8j/GJL/A/Ez0B81Do03yt/qslZ5dX5hZU/23xIfmYtPjf8TPZT4mfEZ/R/IXy6Ff6P8QkT/pff', 'base64'));
assert.equal(legacyV2[4], 2);
const legacy = boot(legacyV2);
assert.equal(legacy.emu_state(0), 137, 'old v2 tempo is restored');
assert.equal(legacy.emu_state(5), 37, 'old v2 effects are restored');
assert.equal(legacy.emu_state(8), 0, 'old v2 projects load with the original drum kit');
for (let part = 0; part < 4; part++) {
    assert.deepEqual(Array.from({ length: 4 }, (_, knob) => legacy.emu_state(knob + 10)), [0, 0, 0, 0], `old v2 part ${part + 1} FX defaults to dry`);
    legacy.emu_enc(0, 1);
}
legacy.emu_enc(0, 3);
legacy.emu_enc(6, 7);
const upgraded = boot(saveFlash(legacy));
assert.equal(upgraded.emu_state(0), 137, 'saving an old project preserves its tempo');
assert.equal(upgraded.emu_state(5), 37, 'saving an old project preserves its effects');
assert.equal(upgraded.emu_state(8), 7, 'saving an old project adds the selected kit');
console.log(JSON.stringify({ scenario: 'real v2 project import, default kit, dry track FX and resave with kit 8', pass: true }));
