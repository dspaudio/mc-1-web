// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
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
