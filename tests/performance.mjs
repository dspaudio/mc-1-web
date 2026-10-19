// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { FORMAT, latestRecord, events as recordEvents } from './format.mjs';

const mod = new WebAssembly.Module(fs.readFileSync('build/mc1.wasm'));
const BTN = { FX: 2, ENV: 4, LFO: 5, EDIT: 6, GLO: 7, HOME: 8, SAVE: 9, ARP: 10, PLAY: 12, REC: 13 };
const tap = (e, name) => { e.emu_input(0, 1 << BTN[name]); e.emu_input(0, 0); };
function boot(image) {
    const e = new WebAssembly.Instance(mod, {}).exports;
    assert.equal(typeof e.emu_parameter, 'function');
    const flash = new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), e.emu_flash_size());
    flash.fill(255); if (image) flash.set(image);
    e.emu_init(); return e;
}
const select = (e, part) => e.emu_enc(0, part - e.emu_state(1));
function save(e) {
    assert.equal(e.emu_state(4), 0);
    const generation = e.emu_flash_gen(); tap(e, 'SAVE'); tap(e, 'SAVE');
    assert(e.emu_flash_gen() > generation, 'project saves through the panel');
    const image = new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), e.emu_flash_size()).slice();
    const record = latestRecord(image);
    return { image, record };
}
function render(e, frames) {
    let hash = 2166136261, energy = 0;
    while (frames) {
        const n = Math.min(frames, 512); e.emu_render(n); frames -= n;
        for (const sample of new Float32Array(e.memory.buffer, e.emu_audio_ptr(), n * 2)) {
            assert(Number.isFinite(sample) && Math.abs(sample) < 1);
            energy += sample * sample;
            const x = Math.round(sample * 32768) & 65535;
            hash = Math.imul(hash ^ (x & 255), 16777619) >>> 0;
            hash = Math.imul(hash ^ (x >> 8), 16777619) >>> 0;
        }
    }
    return { hash, energy };
}
function nextStep(e) {
    const previous = e.emu_state(24);
    for (let block = 0; block < 1000; block++) {
        e.emu_render(128);
        if (e.emu_state(24) !== previous) return;
    }
    assert.fail('playing sequencer advances to another step');
}
function fxPage(e, scope) {
    select(e, scope); tap(e, 'HOME'); tap(e, 'FX');
    assert.equal(e.emu_state(2), 3);
}
const frame = e => { e.emu_frame(); return new Uint16Array(e.memory.buffer, e.emu_fb_ptr(), 240 * 240).slice(); };
const region = (pixels, x, y, width, height) => Array.from({ length: height }, (_, row) => Array.from(pixels.slice((y + row) * 240 + x, (y + row) * 240 + x + width))).flat();

const sendParams = [40, 41, 44, 45], typeParams = [42, 43, 46, 47];
const effects = boot();
for (let scope = 0; scope < 4; scope++) {
    fxPage(effects, scope);
    for (let knob = 0; knob < 4; knob++) effects.emu_enc(knob + 2, 30 + scope + knob - effects.emu_parameter(scope, sendParams[knob]));
    tap(effects, 'ENV');
    for (let knob = 0; knob < 4; knob++) {
        for (let type = 0; type < 8; type++) {
            effects.emu_enc_at(knob + 2, type - effects.emu_parameter(4, typeParams[knob]), 1000 + type);
            assert.equal(effects.emu_parameter(4, typeParams[knob]), type, 'each global bank exposes all eight choices without acceleration');
            for (let part = 0; part < 4; part++) assert.equal(effects.emu_parameter(part, typeParams[knob]), type);
        }
        effects.emu_enc_at(knob + 2, 1, 1010); assert.equal(effects.emu_parameter(4, typeParams[knob]), 7);
        effects.emu_enc(knob + 2, -100); assert.equal(effects.emu_parameter(4, typeParams[knob]), 0);
        effects.emu_enc(knob + 2, 4 + knob);
    }
}
for (let scope = 0; scope < 4; scope++) for (let knob = 0; knob < 4; knob++)
    assert.equal(effects.emu_parameter(scope, sendParams[knob]), 30 + scope + knob, 'all sixteen sends remain independent');
for (let parameter = 14; parameter <= 23; parameter++) assert.equal(effects.emu_parameter(4, parameter), -1, 'legacy master FX scope is inactive');
const legacyMaster = effects.emu_state(5);
fxPage(effects, 0); tap(effects, 'FX'); effects.emu_enc(2, 7);
assert.equal(effects.emu_parameter(0, 40), 37, 'FX again keeps editing the selected part send');
assert.equal(effects.emu_state(5), legacyMaster);
const effectsSave = save(effects);
const restoredEffects = boot(effectsSave.image);
for (let scope = 0; scope < 4; scope++) for (const parameter of [...sendParams, ...typeParams])
    assert.equal(restoredEffects.emu_parameter(scope, parameter), effects.emu_parameter(scope, parameter), 'all four sends and bank types survive v8 reload');
console.log(JSON.stringify({ scenario: 'sixteen independent sends, four eight-type banks and v8 save/reload', pass: true }));

const analog = boot();
for (let part = 0; part < 3; part++) {
    select(analog, part); tap(analog, 'HOME');
    for (let page = 0; page < 6; page++) tap(analog, 'GLO');
    assert.equal(analog.emu_state(2), 10);
    analog.emu_enc(2, 30 + part * 20);
    for (let knob = 3; knob < 6; knob++) analog.emu_enc(knob, 127);
    assert.equal(analog.emu_parameter(part, 48), 30 + part * 20, 'only knob 1 adjusts the selected melodic part');
}
select(analog, 3); analog.emu_enc(2, 127); assert.equal(analog.emu_parameter(3, 48), -1);
const analogReload = boot(save(analog).image);
for (let part = 0; part < 3; part++) assert.equal(analogReload.emu_parameter(part, 48), 30 + part * 20);
const analogAudio = [];
for (const amount of [0, 0, 100, 100]) {
    const e = boot(); tap(e, 'HOME'); for (let page = 0; page < 6; page++) tap(e, 'GLO');
    e.emu_enc(2, amount); e.emu_input(1 << 7, 0); analogAudio.push(render(e, 44100).hash);
}
assert.equal(analogAudio[0], analogAudio[1]); assert.equal(analogAudio[2], analogAudio[3]);
assert.notEqual(analogAudio[0], analogAudio[2], 'Analog changes actual PCM deterministically');
console.log(JSON.stringify({ scenario: 'Analog GLO page, per-part controls, drum exclusion, v8 reload and audible deterministic variance', pass: true }));

const arpAudio = [];
for (let mode = 0; mode < 6; mode++) {
    const e = boot(); const testPreset = e.emu_state(25); const part = mode % 3;
    select(e, part); e.emu_enc(6, testPreset - e.emu_state(6)); tap(e, 'ARP');
    assert.equal(e.emu_state(2), 6); assert.equal(e.emu_state(16), 0);
    e.emu_enc(2, mode + 1); e.emu_enc(4, 1); e.emu_enc(5, -25);
    assert.deepEqual([16, 17, 18, 19, 20, 21].map(key => e.emu_state(key)), [1, mode, 2, 2, 50, 0]);
    e.emu_input(1 << 7, 0); e.emu_input((1 << 7) | 1, 0); e.emu_input((1 << 7) | 1 | (1 << 4), 0);
    const audio = render(e, 44100);
    assert(audio.energy > 0.1, 'each ARP mode produces audio while keys are held');
    assert(e.emu_state(15) >= 4, 'standalone ARP generates repeated events with transport stopped');
    e.emu_input(0, 0); const saved = save(e); const restored = boot(saved.image); select(restored, part);
    assert.deepEqual([16, 17, 18, 19, 20, 21].map(key => restored.emu_state(key)), [1, mode, 2, 2, 50, 0]);
    arpAudio.push({ mode, ...audio });
}
const latch = boot(); tap(latch, 'ARP'); latch.emu_enc(2, 1); tap(latch, 'LFO');
assert(region(frame(latch), 14, 66, 180, 14).includes(0x67e8), 'enabled ARP mode is bright green');
assert(region(frame(latch), 14, 151, 100, 7).includes(0x67e8), 'enabled LATCH is bright green');
assert.equal(latch.emu_state(21), 1); latch.emu_input(1 << 7, 0); render(latch, 8192); latch.emu_input(0, 0);
const heldEvents = latch.emu_state(15); render(latch, 16384);
assert(latch.emu_state(15) > heldEvents, 'LATCH continues after physical release');
tap(latch, 'LFO'); render(latch, 8192);
assert.equal(latch.emu_state(21), 0); assert.equal(latch.emu_state(15), 0, 'turning latch off releases the held ARP');
assert(!region(frame(latch), 14, 151, 100, 7).includes(0x67e8), 'disabled LATCH loses the active green color');
const drums = boot(); select(drums, 3); tap(drums, 'ARP'); drums.emu_enc(2, 6);
assert.equal(drums.emu_state(2), 6); assert.equal(drums.emu_state(16), 0, 'ARP page does not enable a melodic ARP on drums');

const recordedArp = boot(); tap(recordedArp, 'ARP'); recordedArp.emu_enc(2, 6);
recordedArp.emu_enc(3, -2); recordedArp.emu_enc(5, -25);
tap(recordedArp, 'REC'); tap(recordedArp, 'PLAY');
recordedArp.emu_input(1 | (1 << 4) | (1 << 7), 0); render(recordedArp, 200000);
assert(recordedArp.emu_state(15) >= 8);
tap(recordedArp, 'PLAY'); const arpRecord = save(recordedArp).record;
for (let step = 0; step < 16; step++) {
    const data = Array.from(arpRecord.slice(92 + step * 8, 100 + step * 8));
    if (step % 4 < 2) {
        assert.deepEqual(data.slice(0, 3), [53, 57, 60], 'REC stores generated chord notes');
        assert.equal(data[4], 100); assert.equal(data[5], step % 4 ? 4 : 0, 'long gates use tied sixteenth steps');
    } else assert.deepEqual(data, Array(8).fill(0), 'the remainder of a quarter-note gate is silent');
}
console.log(JSON.stringify({ scenario: 'six ARP modes, rate/octave/gate settings, latch, melodic-only scope, generated chord REC and v6 settings reload', arpAudio, pass: true }));

const automation = boot();
for (let part = 0; part < 3; part++) {
    select(automation, part); tap(automation, 'HOME'); tap(automation, 'ENV');
    for (let knob = 0; knob < 4; knob++) automation.emu_enc(knob + 2, -automation.emu_parameter(part, 6 + knob));
}
tap(automation, 'HOME'); tap(automation, 'REC'); tap(automation, 'PLAY'); automation.emu_render(1);
for (let step = 0; step < 16; step++) {
    assert.equal(automation.emu_state(24), step);
    for (let scope = 0; scope < 4; scope++) {
        fxPage(automation, scope);
        for (let knob = 0; knob < 2; knob++) automation.emu_enc(knob + 2, step + 1 - automation.emu_parameter(scope, 40 + knob));
        if (scope < 3) {
            tap(automation, 'HOME'); tap(automation, 'ENV');
            for (let knob = 0; knob < 4; knob++) automation.emu_enc(knob + 2, step + 1 - automation.emu_parameter(scope, 6 + knob));
        }
    }
    tap(automation, 'HOME'); tap(automation, 'GLO');
    for (let part = 0; part < 4; part++) automation.emu_enc(part + 2, step + 1 - automation.emu_parameter(part, 12));
    assert.equal(automation.emu_state(22), (step + 1) * 24, 'each step records eight sends, twelve envelope values and four levels');
    if (step < 15) nextStep(automation);
}
select(automation, 0); tap(automation, 'HOME'); automation.emu_enc(2, 1);
assert.equal(automation.emu_state(22), 384); assert.equal(automation.emu_state(23), 1, 'a new event at capacity reports full');
fxPage(automation, 0); automation.emu_enc(2, 1);
assert.equal(automation.emu_state(22), 384, 'overwriting the same step and parameter does not consume capacity');
tap(automation, 'PLAY'); tap(automation, 'REC');
const automationSave = save(automation);
const events = recordEvents(automationSave.record);
assert.equal(events.length, 384);
assert.equal(new Set(events.map(event => event.slice(0, 3).join(','))).size, 384);
assert.deepEqual(events.find(event => event[0] === 0 && event[1] === 15 && event[2] === 40), [0, 15, 40, 17]);
const replay = boot(automationSave.image); assert.equal(replay.emu_state(22), 384);
fxPage(replay, 0); replay.emu_enc(2, -replay.emu_parameter(0, 40)); tap(replay, 'PLAY'); replay.emu_render(1);
assert.equal(replay.emu_parameter(0, 40), 1, 'playback applies recorded step-zero send automation');
nextStep(replay); assert.equal(replay.emu_parameter(0, 40), 2, 'playback advances to the next recorded value');
tap(replay, 'PLAY'); tap(replay, 'HOME'); for (let i = 0; i < 4; i++) tap(replay, 'GLO');
assert.equal(replay.emu_state(2), 7); tap(replay, 'EDIT');
assert.equal(replay.emu_state(22), 0); assert.equal(replay.emu_state(23), 0);

const patterns = boot();
for (let pattern = 0; pattern < 2; pattern++) {
    patterns.emu_enc(1, pattern - patterns.emu_state(9)); tap(patterns, 'REC'); tap(patterns, 'PLAY'); patterns.emu_render(1);
    patterns.emu_enc(2, 1); tap(patterns, 'PLAY'); tap(patterns, 'REC');
}
assert.equal(patterns.emu_state(22), 2);
for (let i = 0; i < 4; i++) tap(patterns, 'GLO'); tap(patterns, 'EDIT');
assert.equal(patterns.emu_state(22), 1, 'clearing one pattern preserves automation in another pattern');
const remaining = save(patterns).record;
assert.equal(recordEvents(remaining)[0][0], 0); assert.equal(recordEvents(remaining)[0][2], 4, 'the retained event is the first pattern sound cutoff');
console.log(JSON.stringify({ scenario: '384 step-quantized automation events, track/master/mix capture, overwrite/full, replay, pattern-only clear and v6 reload', pass: true }));

const origin = boot(); const preset = origin.emu_state(25); const original = frame(origin); const initialCutoff = origin.emu_state(7);
origin.emu_enc(2, 1); const changed = frame(origin);
assert.equal(origin.emu_state(25), preset, 'editing retains the originating preset ID');
assert.deepEqual(region(changed, 96, 30, 96, 14), region(original, 84, 30, 96, 14), 'ACID SAW name remains visible after the leading edit marker');
assert.notDeepEqual(region(changed, 84, 30, 12, 14), region(original, 84, 30, 12, 14), 'a leading asterisk marks the changed sound');
const originSave = save(origin); assert.equal(originSave.record[FORMAT.presetOffset], preset);
const restoredOrigin = boot(originSave.image); assert.equal(restoredOrigin.emu_state(25), preset);
assert.deepEqual(region(frame(restoredOrigin), 84, 30, 108, 14), region(changed, 84, 30, 108, 14), 'preset name and asterisk survive save/reload');
restoredOrigin.emu_enc(2, initialCutoff - restoredOrigin.emu_state(7));
assert.deepEqual(region(frame(restoredOrigin), 84, 30, 108, 14), region(original, 84, 30, 108, 14), 'returning to original parameters removes the asterisk');
console.log(JSON.stringify({ scenario: 'originating preset name and changed marker survive editing and v6 reload', pass: true }));
