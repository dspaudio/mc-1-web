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
assert.equal(latestRecord(metroImage)[FORMAT.automationCountOffset-1],1,'GLO GROOVE fourth knob saves METRO ON in v6');
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

const mixer = new Processor({processorOptions:{wasmModule:compiled}});
const mixerValues = parameter => Array.from({length:4}, (_,part)=>mixer.e.emu_parameter(part,parameter));
metroTap(mixer,7); metroTurn(mixer,0,3);
assert.equal(mixer.e.emu_state(2),5);
const originalPan = mixerValues(13);
for (const [knob,delta] of [-127,127,-77,1].entries()) metroTurn(mixer,knob+2,delta);
const levels = [0,127,23,101];
assert.deepEqual(mixerValues(12),levels,'mixer starts in LEVEL and all four knobs work with drums selected');
assert.deepEqual(mixerValues(13),originalPan,'LEVEL leaves stored pans untouched');
mixer.e.emu_frame();
const levelFrame = new Uint16Array(mixer.e.memory.buffer,mixer.e.emu_fb_ptr(),240*240).slice();
metroTap(mixer,4);
assert.equal(mixer.e.emu_state(2),5,'ENV toggles the mixer without opening the envelope page');
mixer.e.emu_frame();
assert.notDeepEqual(new Uint16Array(mixer.e.memory.buffer,mixer.e.emu_fb_ptr(),240*240),levelFrame,'PAN changes the actual C framebuffer');
metroTap(mixer,1);
for (const [knob,delta] of [-127,22,127,-47].entries()) metroTurn(mixer,knob+2,delta);
const pans = [0,64,127,17];
assert.deepEqual(mixerValues(13),pans,'PAN controls all four parts, clamps at both ends and is not toggled by OCT+');
assert.deepEqual(mixerValues(12),levels,'PAN leaves levels untouched');
metroTap(mixer,4); metroTurn(mixer,2,1); levels[0]=1;
assert.deepEqual(mixerValues(12),levels,'ENV returns to LEVEL');
assert.deepEqual(mixerValues(13),pans,'returning to LEVEL preserves pans');
metroTap(mixer,4);
for (let page=0;page<6;page++) metroTap(mixer,7);
metroTurn(mixer,2,1); levels[0]=2;
assert.deepEqual(mixerValues(12),levels,'reentering the mixer resets to LEVEL');
assert.deepEqual(mixerValues(13),pans);
metroTap(mixer,9); metroTap(mixer,9);
const mixerImage = new Uint8Array(mixer.e.memory.buffer,mixer.e.emu_flash_ptr(),mixer.e.emu_flash_size()).slice();
assert.deepEqual(Array.from(latestRecord(mixerImage).slice(60,68)),[...levels,...pans],'v7 stores the edited levels and pans');
const mixerReload = new Processor({processorOptions:{wasmModule:compiled,flashImage:mixerImage.buffer}});
for (let part=0;part<4;part++) {
    assert.equal(mixerReload.e.emu_parameter(part,12),levels[part],'saved level survives actual worklet reboot');
    assert.equal(mixerReload.e.emu_parameter(part,13),pans[part],'saved pan survives actual worklet reboot');
}
console.log('PASS AudioWorklet ENV LEVEL/PAN toggle, all-part controls, OCT+ isolation, page reset and v7 persistence');

const four = new Processor({processorOptions:{wasmModule:compiled}});
const sends = [40,41,44,45], types = [42,43,46,47];
for (let part=0;part<4;part++) {
    metroTurn(four,0,part-four.e.emu_state(1)); metroTap(four,8); metroTap(four,2);
    for (let knob=0;knob<4;knob++) metroTurn(four,knob+2,20+part+knob-four.e.emu_parameter(part,sends[knob]));
}
metroTap(four,4);
for (let knob=0;knob<4;knob++) metroTurn(four,knob+2,4+knob-four.e.emu_parameter(4,types[knob]));
metroTurn(four,0,-3); metroTap(four,8);
for (let page=0;page<6;page++) metroTap(four,7);
assert.equal(four.e.emu_state(2),10);
metroTurn(four,2,51); metroTap(four,9); metroTap(four,9);
const fourImage=new Uint8Array(four.e.memory.buffer,four.e.emu_flash_ptr(),four.e.emu_flash_size()).slice();
const fourRecord=latestRecord(fourImage);
assert.deepEqual(Array.from(fourRecord.slice(FORMAT.extraSendOffset,FORMAT.extraSendOffset+8)),[22,23,23,24,24,25,25,26]);
assert.deepEqual(Array.from(fourRecord.slice(FORMAT.extraTypeOffset,FORMAT.extraTypeOffset+2)),[6,7]);
assert.deepEqual(Array.from(fourRecord.slice(FORMAT.analogOffset,FORMAT.analogOffset+3)),[51,0,0]);
const fourReload=new Processor({processorOptions:{wasmModule:compiled,flashImage:fourImage.buffer}});
assert.equal(fourReload.e.emu_flash_gen(),0,'loading v8 does not write flash');
for (let part=0;part<4;part++) for (let knob=0;knob<4;knob++) {
    assert.equal(fourReload.e.emu_parameter(part,sends[knob]),20+part+knob);
    assert.equal(fourReload.e.emu_parameter(part,types[knob]),4+knob);
}
assert.equal(fourReload.e.emu_parameter(0,48),51);

// A valid v7 writer has the identical prefix and CRCs, without the 13 v8 bytes.
function crc(bytes) {
    let c=0xffffffff;
    for (const byte of bytes) {
        c^=byte;
        for (let bit=0;bit<8;bit++) c=(c>>>1)^(0xedb88320* (c&1));
    }
    return (~c)>>>0;
}
const v7Image=new Uint8Array(73728).fill(255), v7=fourRecord.slice(0,35124);
const v7View=new DataView(v7.buffer);
v7[4]=7; v7View.setUint16(6,35104,true);
v7View.setUint32(12,crc(v7.subarray(20)),true);
v7View.setUint32(16,crc(v7.subarray(0,16)),true); v7Image.set(v7);
const migrated=new Processor({processorOptions:{wasmModule:compiled,flashImage:v7Image.buffer}});
assert.equal(migrated.e.emu_flash_gen(),0,'v7 import does not rewrite or clear stored banks');
assert.deepEqual(new Uint8Array(migrated.e.memory.buffer,migrated.e.emu_flash_ptr(),73728),v7Image);
for (let part=0;part<4;part++) {
    assert.equal(migrated.e.emu_parameter(part,40),20+part);
    assert.equal(migrated.e.emu_parameter(part,41),21+part);
    assert.equal(migrated.e.emu_parameter(part,44),0);
    assert.equal(migrated.e.emu_parameter(part,45),0);
    if (part<3) assert.equal(migrated.e.emu_parameter(part,48),0);
}
assert.equal(migrated.e.emu_parameter(4,42),4); assert.equal(migrated.e.emu_parameter(4,43),5);
metroTap(migrated,9); metroTap(migrated,9);
const migratedImage=new Uint8Array(migrated.e.memory.buffer,migrated.e.emu_flash_ptr(),73728).slice();
assert.deepEqual(latestRecord(migratedImage).slice(20,35124),v7.slice(20),'explicit SAVE upgrades v7 without changing the old payload');
assert.deepEqual(migratedImage.slice(0,35124),v7,'upgrade commits the other A/B bank');
console.log('PASS AudioWorklet four-bank/Analog v8 wire format, reboot and non-destructive v7 import/explicit upgrade');
