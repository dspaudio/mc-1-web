// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { FORMAT, latestRecord } from './format.mjs';

const source = fs.readFileSync('site/emu.js', 'utf8');
const html = fs.readFileSync('site/index.html', 'utf8');
assert.match(html, /--play:\s*#63ff42\s*;/, 'panel uses the bright green playback color');
assert.match(source, /if\s*\(fw\s*===\s*'PLAY'\)\s*b\.classList\.add\('play'\)/, 'only PLAY receives the dedicated green button class');
assert.match(html, /\.btn\.play\.lit\s*\{[^}]*rgba\(99,255,66/, 'lit PLAY uses green feedback');
const greenKeyRules = Array.from(html.matchAll(/([^{}]+)\{([^{}]+)\}/g)).filter(([, selector, body]) => selector.includes('.pill') && body.includes('var(--play)'));
assert.deepEqual(greenKeyRules.map(([, selector]) => selector.trim()), ['.pill.wk.lit .slot'], 'green sequencer-key styling is limited to white keys');
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
function melodyAudio(e) {
    let hash = 2166136261, energy = 0;
    for (const note of [0, 7, 14, 26]) {
        for (const down of [true, false]) {
            e.emu_input(down ? 1 << note : 0, 0);
            for (let block = 0; block < 32; block++) {
                e.emu_render(128);
                for (const sample of new Float32Array(e.memory.buffer, e.emu_audio_ptr(), 256)) {
                    assert(Number.isFinite(sample) && Math.abs(sample) < 1);
                    energy += sample * sample;
                    const pcm = Math.round(sample * 32768) & 65535;
                    hash = Math.imul(hash ^ (pcm & 255), 16777619) >>> 0;
                    hash = Math.imul(hash ^ (pcm >> 8), 16777619) >>> 0;
                }
            }
        }
    }
    assert(energy > 0.1, 'saved melodic sound remains audible');
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
    tap(e, 'EDIT');
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
    assert.equal(saved[4], 8, 'the saved project uses format version 8');
    // v7 preserves the header, existing settings and step offsets.
    const notes = Array.from({ length: 7 }, (_, step) => saved[20 + 72 + part * 16 * 8 + step * 8]);
    assert.deepEqual(notes, [60, 72, 60, 48, 24, 96, 108], `OCT buttons transpose part ${part + 1} and clamp at +/-3`);
    octaveNotes.push(notes);
}
console.log(JSON.stringify({ scenario: 'OCT input to saved notes, all three melodic parts', octaveNotes }));

const allButtons = Array.from({ length: 14 }, (_, id) => id);
const buttonsOnly = e => litKeys(e).filter(id => id < 14);
const octave = boot();
assert.deepEqual(buttonsOnly(octave), allButtons, 'all menu and OCT buttons are lit');
octave.emu_ui_tick(250);
assert.deepEqual(buttonsOnly(octave), allButtons.filter(id => id !== panel.BTN.HOME), 'selected HOME blinks off at 250ms');
octave.emu_ui_tick(500);
assert.deepEqual(buttonsOnly(octave), allButtons, 'selected menu returns at 500ms');
tap(octave, 'FX'); octave.emu_ui_tick(750);
assert.deepEqual(buttonsOnly(octave), allButtons.filter(id => id !== panel.BTN.FX));
tap(octave, 'HOME'); tap(octave, 'OCT-');
assert(buttonsOnly(octave).includes(panel.BTN['OCT-']) && buttonsOnly(octave).includes(panel.BTN['OCT+']), 'OCT buttons stay lit independently of transpose');

const e = boot(); tap(e, 'REC'); tap(e, 'PLAY'); e.emu_ui_tick(250);
const sequence = []; let previous = -1;
for (let block = 0; block < 2500 && sequence.length < 17; block++) {
    const lit = litKeys(e), step = e.emu_state(24);
    assert.equal(lit.includes(panel.BTN.PLAY), step % 4 < 2, 'PLAY pulses with sequencer quarter notes');
    assert(lit.includes(panel.BTN.HOME), 'HOME remains lit while playing');
    assert(!lit.includes(panel.BTN.REC), 'armed REC joins the selected-menu blink');
    const keys = lit.filter(id => id >= 14).map(id => id - 14);
    assert.equal(keys.length, 1);
    if (keys[0] !== previous) {
        assert.equal(keys[0], panel.WHITE_IDS[sequence.length % 16]);
        sequence.push(keys[0]); previous = keys[0];
    }
    e.emu_render(128);
}
assert.equal(sequence.length, 17); tap(e, 'PLAY');
assert.deepEqual(litKeys(e).filter(id => id >= 14), [], 'stopping removes the key cursor');
const heldLeds = boot();
for (let playing = 0; playing < 2; playing++) {
    if (playing) tap(heldLeds, 'PLAY');
    for (let note = 0; note < 27; note++) {
        heldLeds.emu_input(1 << note, 0);
        const expected = [...new Set([14 + note, ...(playing ? [14 + panel.WHITE_IDS[0]] : [])])].sort((a, b) => a - b);
        assert.deepEqual(litKeys(heldLeds).filter(id => id >= 14), expected);
        heldLeds.emu_input(0, 0);
        assert.deepEqual(litKeys(heldLeds).filter(id => id >= 14), playing ? [14 + panel.WHITE_IDS[0]] : []);
        while (heldLeds.emu_midi_pop()) {}
    }
}
console.log(JSON.stringify({ scenario: 'shared menu/OCT lights, exact 2Hz blink, tempo PLAY, HOME steady and 27-key cursor overlay', sequence, pass: true }));

const colors = boot();
const factoryImage = saveFlash(colors); tap(colors, 'PLAY'); colors.emu_render(1);
const pixelsAt = e => { e.emu_frame(); return new Uint16Array(e.memory.buffer, e.emu_fb_ptr(), 240 * 240).slice(); };
let pixels = pixelsAt(colors);
for (let part = 0; part < 4; part++)
    assert.equal(pixels[(82 + part * 27) * 240 + 30], 0x67e8, 'each populated home row has a playback underline');
const first = pixels.slice(82 * 240, 84 * 240);
colors.emu_render(512); pixels = pixelsAt(colors);
assert.notDeepEqual(pixels.slice(82 * 240, 84 * 240), first, 'underline flows within the sixteenth step');
tap(colors, 'GLO'); tap(colors, 'ARP'); tap(colors, 'HOME'); pixels = pixelsAt(colors);
assert(!pixels.slice(82 * 240, 84 * 240).includes(0x67e8), 'muted melodic row loses its underline');
colors.emu_enc(0, 3); pixels = pixelsAt(colors);
for (let lane = 0; lane < 16; lane++) {
    const populated = Array.from({ length: 16 }, (_, step) => factoryImage[92 + 3 * 128 + step * 8 + 6] | factoryImage[92 + 3 * 128 + step * 8 + 7] << 8).some(bits => bits & 1 << lane);
    assert.equal(pixels.slice((32 + lane * 10) * 240, (33 + lane * 10) * 240).includes(0x67e8), populated, 'only populated drum rows have underlines');
}
tap(colors, 'GLO'); tap(colors, 'ARP'); tap(colors, 'HOME'); pixels = pixelsAt(colors);
assert(!pixels.slice(24 * 240, 184 * 240).includes(0x67e8), 'muted drums have no playback underlines');
tap(colors, 'PLAY'); pixels = pixelsAt(colors);
assert(!pixels.slice(24 * 240, 184 * 240).includes(0x67e8));
const empty = boot(); empty.emu_enc(1, 63); tap(empty, 'PLAY');
assert(!pixelsAt(empty).slice(59 * 240, 168 * 240).includes(0x67e8), 'empty pattern rows do not imply sounding content');
console.log(JSON.stringify({ scenario: 'flowing populated-row underlines, empty/mute/stop semantics and drum row spacing', pass: true }));

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
assert.deepEqual(Array.from(latestRecord(restoredFlash).slice(60, 64)), [0, 127, 0, 127], 'mixer levels survive save and reboot');
tap(mixer, 'GLO'); assert.equal(mixer.emu_state(2), 2);
tap(mixer, 'GLO'); assert.equal(mixer.emu_state(2), 4);
tap(mixer, 'GLO'); assert.equal(mixer.emu_state(2), 7);
tap(mixer, 'GLO'); assert.equal(mixer.emu_state(2), 9);
tap(mixer, 'GLO'); assert.equal(mixer.emu_state(2), 10);
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
    assert.equal(saved[23], kit, 'format v4 preserves the stored kit byte');
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
const trackFx = Array.from({ length: 4 }, (_, part) => Array.from({ length: 2 }, (_, knob) => (part + 1) * 10 + knob));
for (let part = 0; part < 4; part++) {
    fx.emu_enc(2, -127); fx.emu_enc(3, -127);
    for (let knob = 0; knob < 2; knob++) fx.emu_enc(knob + 2, trackFx[part][knob]);
    fx.emu_enc(4, 100); fx.emu_enc(5, 100);
    fx.emu_enc(0, 1);
}
for (let part = 0; part < 4; part++) {
    assert.deepEqual(Array.from({ length: 2 }, (_, knob) => fx.emu_state(knob + 10)), trackFx[part], `FX changes only selected part ${part + 1}`);
    fx.emu_enc(0, 1);
}
assert.equal(fx.emu_state(5), 0, 'editing track effects preserves inactive legacy master data');
tap(fx, 'FX'); fx.emu_enc(2, 19);
trackFx[0][0] += 19;
assert.equal(fx.emu_state(5), 0, 'FX never opens a master scope');
assert.equal(fx.emu_state(10), 29, 'FX again keeps the selected-track scope');
tap(fx, 'HOME'); tap(fx, 'FX'); fx.emu_enc(2, 1);
trackFx[0][0]++;
assert.equal(fx.emu_state(10), 30, 'HOME then FX retains selected-track values');
assert.equal(fx.emu_state(5), 0);
const fxFlash = saveFlash(fx);
assert.equal(fxFlash[4], 8);
assert.equal(fxFlash[6] + fxFlash[7] * 256, FORMAT.bodyBytes, 'v7 includes 64 patterns, automation and shared FX');
assert.deepEqual(Array.from(fxFlash.slice(FORMAT.fxSendOffset, FORMAT.fxSendOffset + 8)), trackFx.flat(), 'all eight part sends are serialized');
const restoredFx = boot(fxFlash);
assert.equal(restoredFx.emu_state(5), 0, 'track-only editing leaves legacy master data unchanged through reboot');
for (let part = 0; part < 4; part++) {
    assert.deepEqual(Array.from({ length: 2 }, (_, knob) => restoredFx.emu_state(knob + 10)), trackFx[part], `part ${part + 1} FX survives reboot`);
    restoredFx.emu_enc(0, 1);
}
console.log(JSON.stringify({ scenario: 'selected-part send independence, no master toggle, HOME reset and v7 save/reboot', trackFx, pass: true }));

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
const legacyAudioHash = melodyAudio(legacy).hash;
legacy.emu_enc(0, 3);
legacy.emu_enc(6, 7);
const upgradedFlash = saveFlash(legacy);
assert.deepEqual(latestRecord(upgradedFlash).slice(24, 60), new Uint8Array(legacyV2.slice(24, 60)), 'v2 patch parameters survive bank reordering and resave');
const upgraded = boot(upgradedFlash);
assert.equal(upgraded.emu_state(0), 137, 'saving an old project preserves its tempo');
assert.equal(upgraded.emu_state(5), 37, 'saving an old project preserves its effects');
assert.equal(upgraded.emu_state(8), 7, 'saving an old project adds the selected kit');
assert.equal(melodyAudio(upgraded).hash, legacyAudioHash, 'v2 patch keeps identical PCM through resave');
console.log(JSON.stringify({ scenario: 'real v2 project import, original sound, default kit, dry track FX and resave with kit 8', audioHash: legacyAudioHash, pass: true }));

// Captured from 0.1.2: CELLAR ORGAN (old index 48), HOUSE kit and track delay/reverb.
const legacyV3 = inflateSync(Buffer.from('eJzNkc1Kw1AQhU9qq0UK1ZW40pVYi1AKJVaC5hItoUlIWhosQfCHu3EjguAb+W4+hlEnNT0RCt5N72aYme8MIV/kjaINzJsWgHv/w33fPL59w3YdVuvZbVhHjzt4AGr7djtL7jRS1Kwn3bR0O4PWgdbuydzV9CDvFHhV1ndNFZYqFO9rwLDKGeWHjhsuPuYfzzR/DSR2qQ8BXe4nQGb/wYcy94kPiZ/Q/Znw8e/8pY/GV037P31e6+U+32+t2K/K79G+teg74qcjPkoVive5v0GVM8oPzhwjf6Z5RX7YZ0Q+C96X+RXxPvER3U+ED9bEf0/89MRHqULxPvfnVDmjvHPpGfkzzfvkJyafM/JZ8LHMA+Jj4md0/0b46Zr474qfrvgoVSje5/7sKmeUt88vjPyZ5j3yM17hs+DHMh8RPyY+pvtT4aO18H+Ig93l//EJLe6WFw==', 'base64'));
assert.equal(legacyV3.length, 2156);
assert.equal(legacyV3[4], 3);
const previousBank = boot(legacyV3);
assert.equal(previousBank.emu_state(8), 4);
assert.deepEqual(Array.from({ length: 4 }, (_, knob) => previousBank.emu_state(knob + 10)), [31, 0, 6, 0], 'v3 delay/reverb migrate to one RD send and global delay type');
const previousAudioHash = melodyAudio(previousBank).hash;
const resavedBank = saveFlash(previousBank);
assert.deepEqual(latestRecord(resavedBank).slice(24, 60), new Uint8Array(legacyV3.slice(24, 60)), 'all three saved patch parameter blocks remain unchanged');
assert.deepEqual(latestRecord(resavedBank).slice(FORMAT.trackFxOffset, FORMAT.trackFxOffset + 16), new Uint8Array(legacyV3.slice(2140, 2156)), 'saved track effects remain unchanged');
const rebootedBank = boot(resavedBank);
assert.equal(rebootedBank.emu_state(8), 4);
assert.equal(melodyAudio(rebootedBank).hash, previousAudioHash, '0.1.2 nonfactory saved sound remains identical after resave and reboot');
console.log(JSON.stringify({ scenario: 'real 0.1.2 v3 nonfactory patch, kit and track FX preserved through 128-preset reorder and resave', preset: 'CELLAR ORGAN', audioHash: previousAudioHash, pass: true }));
