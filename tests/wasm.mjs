// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';import assert from 'node:assert/strict';
const version=fs.readFileSync('VERSION','utf8').trim();
assert.equal(JSON.parse(fs.readFileSync('build/build-info.json')).version,version);
assert.equal(JSON.parse(fs.readFileSync('package.json')).version,version);
assert(fs.readFileSync('core/src/mcfm.h','utf8').includes('#define MC_VERSION "'+version+'"'));
const bytes=fs.readFileSync('build/mc1.wasm');const mod=new WebAssembly.Module(bytes);
assert.equal(WebAssembly.Module.imports(mod).length,0);
const boot=(saved)=>{const e=new WebAssembly.Instance(mod,{}).exports;new Uint8Array(e.memory.buffer,e.emu_flash_ptr(),e.emu_flash_size()).fill(255);if(saved)new Uint8Array(e.memory.buffer,e.emu_flash_ptr(),saved.length).set(saved);e.emu_init();return e;};
const tap=(e,b)=>{e.emu_input(0,1<<b);e.emu_input(0,0);};
const e=boot();assert.equal(e.emu_state(0),118);e.emu_enc(0,3);assert.equal(e.emu_state(1),3);e.emu_enc(0,-3);
const presetCount=64;
for(let part=0;part<3;part++){
 e.emu_enc(6,presetCount-1-e.emu_state(6));assert.equal(e.emu_state(6),presetCount-1,'PRESETS reaches preset 64 on all melodic parts');
 e.emu_enc(6,1);assert.equal(e.emu_state(6),0,'preset 64 wraps forward to preset 1');
 e.emu_enc(6,-1);assert.equal(e.emu_state(6),presetCount-1,'preset 1 wraps backward to preset 64');
 e.emu_enc(1,1);assert.equal(e.emu_state(9),1,'ALGORITHM selects patterns on every melodic part');
 assert.equal(e.emu_state(6),presetCount-1,'ALGORITHM leaves the melodic preset unchanged');
 e.emu_enc(1,-1);assert.equal(e.emu_state(9),0);
 e.emu_enc(0,1);
}
e.emu_enc(0,-3);
tap(e,7);assert.equal(e.emu_state(2),5);tap(e,7);assert.equal(e.emu_state(2),2);tap(e,7);assert.equal(e.emu_state(2),4);e.emu_enc(5,1);assert.equal(e.emu_state(3),1);assert.equal(e.emu_state(5),48);
tap(e,8);tap(e,2);assert.equal(e.emu_state(2),3);assert.equal(e.emu_state(10),0);
e.emu_enc(2,1);assert.equal(e.emu_state(10),1);assert.equal(e.emu_state(5),48,'track FX preserves the demo master FX');
tap(e,2);e.emu_enc(2,1);assert.equal(e.emu_state(5),49,'FX again opens master FX');assert.equal(e.emu_state(10),1);
tap(e,9);tap(e,9);assert(e.emu_flash_gen()>0);
const flash=new Uint8Array(e.memory.buffer,e.emu_flash_ptr(),e.emu_flash_size()).slice();const restored=boot(flash);assert.equal(restored.emu_state(3),1);assert.equal(restored.emu_state(5),49);assert.equal(restored.emu_state(10),1);
// Restore both FX scopes before exact native comparison.
e.emu_enc(2,-1);tap(e,2);e.emu_enc(2,-1);assert.equal(e.emu_state(5),48);assert.equal(e.emu_state(10),0);tap(e,12);assert.equal(e.emu_state(4),1);
let peak=0,energy=0,hash=2166136261;
for(let b=0;b<Math.ceil(60*44100/128);b++){e.emu_render(128);const a=new Float32Array(e.memory.buffer,e.emu_audio_ptr(),256);for(const v of a){assert(Number.isFinite(v)&&Math.abs(v)<1);peak=Math.max(peak,Math.abs(v));energy+=v*v;const x=Math.round(v*32768)&65535;hash=Math.imul(hash^(x&255),16777619)>>>0;hash=Math.imul(hash^(x>>8),16777619)>>>0;}}
assert(peak>.01&&energy>10);assert.equal(e.emu_state(4),0);e.emu_frame();assert(new Uint16Array(e.memory.buffer,e.emu_fb_ptr(),240*240).some(v=>v));
const native=JSON.parse(fs.readFileSync('build/native.json'));assert.equal(hash,native.audioHash);
console.log(JSON.stringify({wasmBytes:bytes.length,presetCount,peak,energy,audioHash:hash,flashBytes:flash.length,tests:'64-preset boundaries on all melodic parts, panel, FX, demo completion, A/B save/reboot, native PCM parity'},null,2));
