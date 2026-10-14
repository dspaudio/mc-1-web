// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';import assert from 'node:assert/strict';
const bytes=fs.readFileSync('build/mc1.wasm');const mod=new WebAssembly.Module(bytes);
assert.equal(WebAssembly.Module.imports(mod).length,0);
const boot=(saved)=>{const e=new WebAssembly.Instance(mod,{}).exports;new Uint8Array(e.memory.buffer,e.emu_flash_ptr(),e.emu_flash_size()).fill(255);if(saved)new Uint8Array(e.memory.buffer,e.emu_flash_ptr(),saved.length).set(saved);e.emu_init();return e;};
const tap=(e,b)=>{e.emu_input(0,1<<b);e.emu_input(0,0);};
const e=boot();assert.equal(e.emu_state(0),118);e.emu_enc(0,3);assert.equal(e.emu_state(1),3);e.emu_enc(0,-3);
tap(e,7);tap(e,7);assert.equal(e.emu_state(2),4);e.emu_enc(5,1);assert.equal(e.emu_state(3),1);assert.equal(e.emu_state(5),48);
tap(e,8);tap(e,2);assert.equal(e.emu_state(2),3);e.emu_enc(2,1);assert.equal(e.emu_state(5),49);
tap(e,9);tap(e,9);assert(e.emu_flash_gen()>0);
const flash=new Uint8Array(e.memory.buffer,e.emu_flash_ptr(),e.emu_flash_size()).slice();const restored=boot(flash);assert.equal(restored.emu_state(3),1);assert.equal(restored.emu_state(5),49);
// Restore factory FX before exact native comparison.
e.emu_enc(2,-1);tap(e,12);assert.equal(e.emu_state(4),1);
let peak=0,energy=0,hash=2166136261;
for(let b=0;b<Math.ceil(60*44100/128);b++){e.emu_render(128);const a=new Float32Array(e.memory.buffer,e.emu_audio_ptr(),256);for(const v of a){assert(Number.isFinite(v)&&Math.abs(v)<1);peak=Math.max(peak,Math.abs(v));energy+=v*v;const x=Math.round(v*32768)&65535;hash=Math.imul(hash^(x&255),16777619)>>>0;hash=Math.imul(hash^(x>>8),16777619)>>>0;}}
assert(peak>.01&&energy>10);assert.equal(e.emu_state(4),0);e.emu_frame();assert(new Uint16Array(e.memory.buffer,e.emu_fb_ptr(),240*240).some(v=>v));
const native=JSON.parse(fs.readFileSync('build/native.json'));assert.equal(hash,native.audioHash);
console.log(JSON.stringify({wasmBytes:bytes.length,peak,energy,audioHash:hash,flashBytes:flash.length,tests:'panel, FX, demo completion, A/B save/reboot, native PCM parity'},null,2));
