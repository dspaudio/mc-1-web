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
const presetCount=128;
const categoryStarts=[0,12,28,40,50,60,68,76,82,94,104,112,118,123];
for(let part=0;part<3;part++){
 for(const boundary of categoryStarts.slice(1)){
  e.emu_enc(6,boundary-1-e.emu_state(6));assert.equal(e.emu_state(6),boundary-1);
  e.emu_enc(6,1);assert.equal(e.emu_state(6),boundary,'PRESETS crosses each category boundary forward');
  e.emu_enc(6,-1);assert.equal(e.emu_state(6),boundary-1,'PRESETS crosses each category boundary backward');
 }
 e.emu_enc(6,presetCount-1-e.emu_state(6));assert.equal(e.emu_state(6),presetCount-1,'PRESETS reaches preset 128 on all melodic parts');
 e.emu_enc(6,1);assert.equal(e.emu_state(6),0,'preset 128 wraps forward to preset 1');
 e.emu_enc(6,-1);assert.equal(e.emu_state(6),presetCount-1,'preset 1 wraps backward to preset 128');
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
assert.equal(hash,4237439731,'NEON SPIRAL retains its original 0.1.2 sounds and exact PCM');
function melodyHash(instance){
 let hash=2166136261,energy=0;
 for(const key of [0,7,14,26])for(const down of [true,false]){
  instance.emu_input(down?1<<key:0,0);
  for(let block=0;block<32;block++){
   instance.emu_render(128);
   for(const sample of new Float32Array(instance.memory.buffer,instance.emu_audio_ptr(),256)){
    assert(Number.isFinite(sample)&&Math.abs(sample)<1,'recorded instrument output is finite and bounded');
    energy+=sample*sample;
    const x=Math.round(sample*32768)&65535;
    hash=Math.imul(hash^(x&255),16777619)>>>0;hash=Math.imul(hash^(x>>8),16777619)>>>0;
   }
  }
 }
 assert(energy>.1,'recorded instrument preset is audible');
 return hash;
}
assert.equal(native.recordedPresets.length,64,'64 presets use recorded instruments');
assert.equal(new Set(native.recordedPresets.map(p=>p.id)).size,64);
assert.deepEqual([...new Set(native.recordedPresets.map(p=>p.pcm))].sort((a,b)=>a-b),Array.from({length:16},(_,i)=>i+24),'all 16 recorded sources are used');
for(const preset of native.recordedPresets){
 assert(preset.id>=0&&preset.id<presetCount);
 assert.equal(preset.patch[0],0,'recorded instruments use the LA engine');
 assert.equal(preset.patch[2],preset.pcm);
 assert.equal(preset.patch[3],127,'recorded instruments start with sample-only mix');
 const selected=boot();selected.emu_enc(0,preset.part);selected.emu_enc(6,preset.id-selected.emu_state(6));
 assert.equal(selected.emu_state(6),preset.id);
 tap(selected,9);tap(selected,9);assert(selected.emu_flash_gen()>0);
 const saved=new Uint8Array(selected.memory.buffer,selected.emu_flash_ptr(),selected.emu_flash_size()).slice();
 assert.deepEqual(Array.from(saved.slice(24+preset.part*12,36+preset.part*12)),preset.patch,'selected recorded patch survives serialization');
 assert.equal(melodyHash(selected),preset.audioHash,`recorded preset ${preset.id+1} matches native PCM`);
 const reloaded=boot(saved);reloaded.emu_enc(0,preset.part);
 assert.equal(melodyHash(reloaded),preset.audioHash,`recorded preset ${preset.id+1} matches native PCM after save/reload`);
}
console.log(JSON.stringify({wasmBytes:bytes.length,presetCount,categoryStarts,peak,energy,audioHash:hash,recordedPresetCount:native.recordedPresets.length,recordedSourceCount:16,flashBytes:flash.length,tests:'128-preset and category boundaries on all melodic parts, 64 recorded instruments select/play/save/reload with native PCM parity, panel, FX, demo completion, A/B save/reboot and original demo hash'},null,2));
