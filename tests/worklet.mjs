// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import { FORMAT, latestRecord } from './format.mjs';
let Processor;const messages=[];class Base{constructor(){this.port={postMessage:m=>messages.push(m)};}}
const clock={AudioWorkletProcessor:Base,WebAssembly,Uint8Array,Uint16Array,Float32Array,Math,currentTime:0,registerProcessor:(n,p)=>Processor=p};
vm.runInNewContext(fs.readFileSync('site/worklet.js','utf8'),clock);
const p=new Processor({processorOptions:{wasmBytes:fs.readFileSync('build/mc1.wasm')}});
assert(messages.some(m=>m.t==='ready'));
const compiled = new WebAssembly.Module(fs.readFileSync('build/mc1.wasm'));
const compiledProcessor = new Processor({processorOptions:{wasmModule:compiled}});
assert.equal(compiledProcessor.failed, undefined);
const broken = new Processor({processorOptions:{wasmBytes:new Uint8Array([0])}});
assert.equal(broken.failed, true);
assert(messages.some(m=>m.t==='error' && /CompileError/.test(m.message)));
assert.equal(broken.process([], [[new Float32Array(128), new Float32Array(128)]]), false);
const send=m=>p.port.onmessage({data:m});
// A full tap before any audio callback must not disappear.
for(let i=0;i<3;i++){send({t:'input',notes:0,buttons:1<<7});send({t:'input',notes:0,buttons:0});}assert.equal(p.e.emu_state(2),4);
send({t:'enc',e:5,steps:1});assert.equal(p.e.emu_state(3),1);
send({t:'input',notes:0,buttons:1<<12});send({t:'input',notes:0,buttons:0});let energy=0;
for(let i=0;i<1000;i++){clock.currentTime=i*128/44100;const out=[new Float32Array(128),new Float32Array(128)];assert(p.process([],[out]));for(const v of out[0])energy+=v*v;}
assert(energy>1);assert(messages.some(m=>m.t==='frame'));console.log('PASS AudioWorklet rapid panel input, demo and non-silent PCM');

clock.currentTime=10;
const timed=new Processor({processorOptions:{wasmModule:compiled}});
const homeFrame=messages.filter(m=>m.t==='frame').at(-1).fb;
const initialPreset=timed.e.emu_state(6);
const turn=()=>timed.port.onmessage({data:{t:'enc',e:6,steps:1}});
const process=()=>assert(timed.process([],[[new Float32Array(128),new Float32Array(128)]]));
turn();assert.equal(timed.e.emu_state(6),initialPreset+1);
assert.equal(timed.e.emu_state(14),1,'actual encoder message opens the C popup');
clock.currentTime=10.01;turn();
assert.equal(timed.e.emu_state(6),initialPreset+4,'worklet timestamps trigger three-step acceleration');
for(let i=0;i<6;i++)process();
const popupFrame=messages.filter(m=>m.t==='frame').at(-1).fb;
assert.notDeepEqual(popupFrame,homeFrame,'worklet posts the actual popup framebuffer');
assert.equal(timed.e.emu_state(4),0,'sequencer remains stopped');
clock.currentTime=10.509;process();
assert.equal(timed.e.emu_state(14),1,'worklet clock keeps popup open at 499ms');
clock.currentTime=10.51;process();
assert.equal(timed.e.emu_state(14),0,'process tick closes the popup at 500ms without another input');
for(let i=0;i<4;i++)process();
assert.notDeepEqual(messages.filter(m=>m.t==='frame').at(-1).fb,popupFrame,'worklet posts the closed popup framebuffer');
console.log('PASS AudioWorklet timestamped encoder acceleration, C popup frames and idle clock expiry');

const fullFlash = new Uint8Array(compiledProcessor.e.memory.buffer, compiledProcessor.e.emu_flash_ptr(), compiledProcessor.e.emu_flash_size());
compiledProcessor.port.onmessage({data:{t:'enc',e:1,steps:63}});
for (let i=0;i<2;i++) {
    compiledProcessor.port.onmessage({data:{t:'input',notes:0,buttons:1<<9}});
    compiledProcessor.port.onmessage({data:{t:'input',notes:0,buttons:0}});
}
const savedFlash = fullFlash.slice();
assert.equal(savedFlash.length, 73728);
const restoredProcessor = new Processor({processorOptions:{wasmModule:compiled,flashImage:savedFlash.buffer}});
assert.equal(restoredProcessor.failed, undefined);
assert.deepEqual(new Uint8Array(restoredProcessor.e.memory.buffer, restoredProcessor.e.emu_flash_ptr(), restoredProcessor.e.emu_flash_size()), savedFlash, 'complete 72 KiB flash image restores without truncation');
for (const length of [8192, 73727, 73729]) {
    const before = messages.length;
    const incompatible = new Processor({processorOptions:{wasmModule:compiled,flashImage:new ArrayBuffer(length)}});
    assert.equal(incompatible.failed, undefined);
    assert(messages.slice(before).some(message=>message.t==='storage-reset'), 'incompatible development save reports fresh-project initialization');
    assert(new Uint8Array(incompatible.e.memory.buffer, incompatible.e.emu_flash_ptr(), incompatible.e.emu_flash_size()).every(byte=>byte===255), 'mismatched images are not partially copied');
}
const beforeSave = messages.length;
for (let i=0;i<256;i++) assert(compiledProcessor.process([],[[new Float32Array(128),new Float32Array(128)]]));
assert.equal(messages.slice(beforeSave).find(message=>message.t==='flash').data.byteLength, 73728, 'AudioWorklet publishes the entire changed flash image');
console.log('PASS AudioWorklet 72 KiB restore/publication and incompatible-size reset notice');

function metroTap(processor, button) {
    processor.port.onmessage({data:{t:'input',notes:0,buttons:1<<button}});
    processor.port.onmessage({data:{t:'input',notes:0,buttons:0}});
}
const metroTurn = (processor, encoder, steps) => processor.port.onmessage({data:{t:'enc',e:encoder,steps}});
function metroBoot(image) {
    const processor = new Processor({processorOptions:{wasmModule:compiled,flashImage:image?.buffer}});
    metroTurn(processor,1,63);metroTap(processor,7);
    for(let part=0;part<4;part++){metroTap(processor,10);metroTurn(processor,0,1);}
    metroTap(processor,8);return processor;
}
function metroAudio(processor) {
    let hash=2166136261,energy=0,peak=0;
    for(let block=0;block<256;block++){
        clock.currentTime+=128/44100;
        const output=[new Float32Array(128),new Float32Array(128)];assert(processor.process([],[output]));
        for(let i=0;i<128;i++)for(let channel=0;channel<2;channel++){
            const sample=output[channel][i];assert(Number.isFinite(sample)&&Math.abs(sample)<1);
            energy+=sample*sample;peak=Math.max(peak,Math.abs(sample));
            const pcm=Math.round(sample*32768)&65535;
            hash=Math.imul(hash^(pcm&255),16777619)>>>0;hash=Math.imul(hash^(pcm>>8),16777619)>>>0;
        }
    }
    return {hash,energy,peak};
}
const metroOff=metroBoot();metroTap(metroOff,13);metroTap(metroOff,12);
assert.equal(metroAudio(metroOff).energy,0,'metronome defaults OFF even with REC and PLAY enabled');
const metroSetting=metroBoot();metroTap(metroSetting,7);metroTap(metroSetting,7);
assert.equal(metroSetting.e.emu_state(2),2);metroTurn(metroSetting,5,1);metroTap(metroSetting,9);metroTap(metroSetting,9);
const metroImage=new Uint8Array(metroSetting.e.memory.buffer,metroSetting.e.emu_flash_ptr(),metroSetting.e.emu_flash_size()).slice();
assert.equal(latestRecord(metroImage)[FORMAT.automationCountOffset-1],1,'GLO GROOVE fourth knob saves METRO ON in v5');
const stoppedMetro=metroBoot(metroImage);metroTap(stoppedMetro,13);
assert.equal(metroAudio(stoppedMetro).energy,0,'REC while stopped has no click');
const playMetro=metroBoot(metroImage);metroTap(playMetro,12);
assert.equal(metroAudio(playMetro).energy,0,'PLAY without REC has no click');
const recordMetro=metroBoot(metroImage);metroTap(recordMetro,13);metroTap(recordMetro,12);
const metroResult=metroAudio(recordMetro);
assert(metroResult.energy>0.01,'metronome is audible on an empty pattern with all four tracks muted');
assert.equal(metroResult.hash,JSON.parse(fs.readFileSync('build/native.json')).metronomeHash,'restored metronome PCM matches native C');
metroTap(recordMetro,13);assert.equal(metroAudio(recordMetro).energy,0,'leaving REC silences the metronome during playback');
metroTap(recordMetro,12);metroTap(recordMetro,7);metroTap(recordMetro,7);metroTurn(recordMetro,5,-1);
metroTap(recordMetro,9);metroTap(recordMetro,9);
const disabledMetroImage=new Uint8Array(recordMetro.e.memory.buffer,recordMetro.e.emu_flash_ptr(),recordMetro.e.emu_flash_size()).slice();
assert.equal(latestRecord(disabledMetroImage)[FORMAT.automationCountOffset-1],0,'METRO OFF saves as zero');
const disabledMetro=metroBoot(disabledMetroImage);metroTap(disabledMetro,13);metroTap(disabledMetro,12);
assert.equal(metroAudio(disabledMetro).energy,0,'saved OFF remains silent after reload');
const interruptedMetro=metroBoot(metroImage);metroTap(interruptedMetro,13);metroTap(interruptedMetro,12);
const firstClick=[new Float32Array(128),new Float32Array(128)];assert(interruptedMetro.process([],[firstClick]));
assert(firstClick[0].some(sample=>sample!==0),'first callback contains the active downbeat click');
metroTap(interruptedMetro,13);
assert.equal(metroAudio(interruptedMetro).energy,0,'REC OFF cuts an in-flight click without a stale tail');
console.log(JSON.stringify({scenario:'AudioWorklet GLO METRO toggle, empty pattern/all-muted click only during PLAY+REC, ON/OFF save/reload and native parity',...metroResult,pass:true}));
