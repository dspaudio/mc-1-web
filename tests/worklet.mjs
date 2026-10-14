// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
let Processor;const messages=[];class Base{constructor(){this.port={postMessage:m=>messages.push(m)};}}
vm.runInNewContext(fs.readFileSync('site/worklet.js','utf8'),{AudioWorkletProcessor:Base,WebAssembly,Uint8Array,Uint16Array,Float32Array,Math,registerProcessor:(n,p)=>Processor=p});
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
for(let i=0;i<1000;i++){const out=[new Float32Array(128),new Float32Array(128)];assert(p.process([],[out]));for(const v of out[0])energy+=v*v;}
assert(energy>1);assert(messages.some(m=>m.t==='frame'));console.log('PASS AudioWorklet rapid panel input, demo and non-silent PCM');
