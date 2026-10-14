// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {FORMAT,latestRecord} from './format.mjs';
const native=JSON.parse(fs.readFileSync('build/midi-native.json'));
let Processor;const posted=[];
const clock={AudioWorkletProcessor:class{constructor(){this.port={postMessage:m=>posted.push([this,m])};}},WebAssembly,currentTime:0,registerProcessor:(name,p)=>Processor=p};
vm.runInNewContext(fs.readFileSync('site/worklet.js','utf8'),clock);
const module=new WebAssembly.Module(fs.readFileSync('build/mc1.wasm'));
const boot=image=>new Processor({processorOptions:{wasmModule:module,flashImage:image?.buffer}});
const send=(p,m)=>p.port.onmessage({data:m});
const tap=(p,b)=>{send(p,{t:'input',notes:0,buttons:1<<b});send(p,{t:'input',notes:0,buttons:0});};
const turn=(p,e,steps)=>{clock.currentTime+=1;send(p,{t:'enc',e,steps});};
const input=(p,...messages)=>send(p,{t:'midi-input',epoch:1,messages});
const byteHash=(bytes,hash=2166136261)=>bytes.reduce((h,b)=>Math.imul(h^b,16777619)>>>0,hash);
let audioHash=2166136261,outputHash=2166136261,energy=0,outCount=0;const outputPackets=[];
function blocks(p,n=1,ack=true){
 for(let b=0;b<n;b++){
  clock.currentTime+=128/44100;const output=[new Float32Array(128),new Float32Array(128)];assert(p.process([],[output]));
  for(let i=0;i<128;i++)for(let c=0;c<2;c++){const sample=output[c][i];assert(Number.isFinite(sample)&&Math.abs(sample)<1);energy+=sample*sample;const pcm=Math.round(sample*32768)&65535;audioHash=byteHash([pcm&255,pcm>>8],audioHash);}
  for(const [owner,m]of posted.splice(0))if(owner===p&&m.t==='midi-output'){
   assert(m.messages.length<=272);outputPackets.push(...m.messages);outCount+=m.messages.length;
   for(const value of m.messages)outputHash=byteHash([value&255,value>>>8&255,value>>>16&255,value>>>24],outputHash);
   if(ack)send(p,{t:'midi-output-ack'});
  }
 }
}
const p=boot();assert(!p.failed);while(p.e.emu_midi_pop()){}
input(p,[0xc0,60],[0xb0,74,100],[0xe0,0,80],[0x90,60,100]);blocks(p,32);
assert.equal(p.e.emu_state(25),60);assert.equal(p.e.emu_parameter(0,4),100);assert(energy>0.01);
input(p,[0xb0,64,127],[0x80,60,0]);blocks(p,16);
send(p,{t:'midi-reset',epoch:2});blocks(p,256);assert.equal(outCount,0,'incoming program/CC/note/pitch/sustain is not echoed');
send(p,{t:'input',notes:1<<7,buttons:0});blocks(p,8);send(p,{t:'input',notes:0,buttons:0});blocks(p,8);
assert(outCount>=2,'panel notes reach the output');assert.equal(audioHash,native.audioHash,'actual worklet MIDI PCM matches native byte-for-byte');assert.equal(outputHash,native.outputHash,'actual worklet output packets match native');
const audioResult={audioHash,outputHash,energy};
const rec=boot();turn(rec,1,63);tap(rec,13);tap(rec,12);input(rec,[0x90,67,101],[0x99,36,110]);blocks(rec);tap(rec,12);tap(rec,13);
tap(rec,11);assert.equal(rec.e.emu_state(2),8);assert.equal(rec.e.emu_state(32),1);
turn(rec,3,63);assert.equal(rec.e.emu_state(35),0,'locked SONG cannot change pattern or length');
tap(rec,6);turn(rec,3,63);turn(rec,4,1);turn(rec,5,2);turn(rec,2,1);
tap(rec,8);for(let i=0;i<5;i++)tap(rec,7);assert.equal(rec.e.emu_state(2),9);turn(rec,3,4);tap(rec,5);assert.equal(rec.e.emu_state(31),1);
tap(rec,9);tap(rec,9);
const image=new Uint8Array(rec.e.memory.buffer,rec.e.emu_flash_ptr(),rec.e.emu_flash_size()).slice(),record=latestRecord(image);
assert.equal(byteHash(record),native.recordHash,'MIDI record, song arrangement and channel/clock settings serialize identically to native');
const stepOffset=FORMAT.stepOffset+(63*4*16)*8;
assert.equal(record[stepOffset],67);assert.equal(record[stepOffset+3],101);assert(record[stepOffset+3*16*8+6]&1,'channel 10 kick records drum lane 1');
const restored=boot(image);assert.equal(restored.e.emu_state(35),2);assert.equal(restored.e.emu_state(37),5);assert.equal(restored.e.emu_state(31),1);
input(restored,[0xb5,74,42],[0xb1,74,1]);blocks(restored);assert.equal(restored.e.emu_parameter(1,4),42,'restored track channel routes CC and ignores its old channel');
const externalStart=outputPackets.length;input(restored,[0xfa]);blocks(restored);assert(outputPackets.slice(externalStart).some(v=>(v&0xffff)===0x4390),'external Start emits the sequenced note without echoing transport');assert(!outputPackets.slice(externalStart).some(v=>(v&255)===0xfa));assert.equal(restored.e.emu_state(9),63);assert.equal(restored.e.emu_state(33),0);
function ticks(p,n){for(let i=0;i<n;i+=48){input(p,...Array.from({length:Math.min(48,n-i)},()=>[0xf8]));blocks(p);}}
ticks(restored,96);assert.equal(restored.e.emu_state(34),1);assert.equal(restored.e.emu_state(9),63);
ticks(restored,96);assert.equal(restored.e.emu_state(33),1);assert.equal(restored.e.emu_state(9),0);
ticks(restored,96);assert.equal(restored.e.emu_state(4),0,'song stops after final repeat');
tap(restored,11);tap(restored,11);tap(restored,5);input(restored,[0xfa]);blocks(restored);ticks(restored,288);assert.equal(restored.e.emu_state(4),1);assert.equal(restored.e.emu_state(33),0);assert.equal(restored.e.emu_state(9),63,'loop returns to first entry');
input(restored,[0xfc]);blocks(restored);assert.equal(restored.e.emu_state(4),0);input(restored,[0xfb]);blocks(restored);assert.equal(restored.e.emu_state(4),1);
send(restored,{t:'midi-reset',epoch:2});assert.equal(restored.e.emu_state(4),0,'external clock disconnect stops playback');
const bound=boot();input(bound,[0x90,60,100]);input(bound,[0x90,61,100]);assert.equal(bound.midiBatch,null);assert(posted.some(([owner,m])=>owner===bound&&m.t==='midi-overflow'));
input(bound,...Array.from({length:65},()=>[0xf8]));assert.equal(bound.midiBatch,null,'oversized batch rejected');
send(bound,{t:'input',notes:1<<7,buttons:0});blocks(bound,1,false);const outputBefore=outCount;
for(let i=0;i<300;i++){send(bound,{t:'input',notes:0,buttons:0});send(bound,{t:'input',notes:1<<7,buttons:0});}
assert(bound.e.emu_state(30)>0,'stalled consumer triggers bounded core output recovery');
blocks(bound,512,false);assert.equal(outCount,outputBefore,'unacknowledged output never posts unbounded batches');send(bound,{t:'midi-output-ack'});const recoveryStart=outputPackets.length;blocks(bound);
assert.equal(outputPackets.slice(recoveryStart).filter(v=>(v&0xfff0)===0x7bb0).length,16,'overflow recovery sends all-notes-off on all 16 channels');
for(const cleanup of ['steal','program','all-off','all-sound-off','note-off','reset']){
 const local=boot();const start=outputPackets.length;
 send(local,{t:'input',notes:1,buttons:0});blocks(local);
 assert(outputPackets.slice(start).some(v=>(v&0xffff)===0x3590),'local note 53 is sent externally');
 const afterOn=outputPackets.length;
 if(cleanup==='reset')send(local,{t:'midi-reset',epoch:2});
 else input(local,cleanup==='steal'?[0x90,54,100]:cleanup==='program'?[0xc0,60]:cleanup==='note-off'?[0x80,53,0]:[0xb0,cleanup==='all-sound-off'?120:123,0]);
 blocks(local);
 const cleanupMessages=outputPackets.slice(afterOn);
 assert(cleanupMessages.some(v=>(v&0xffff)===0x3580||(v&0xffff)===0x7bb0),cleanup+' releases the previously emitted local note');
 assert(!cleanupMessages.some(v=>(v&0xf0)===0x90),'external note is not echoed during cleanup');
}
for(const demo of [0,1])for(const channel of [0,4,15])for(const stalled of [false,true]){
 const reload=boot(),active=new Set(['12:67']);let cursor=outputPackets.length;
 const receive=()=>{
  for(const packet of outputPackets.slice(cursor)){
   const status=packet&255,note=packet>>>8&127,velocity=packet>>>16&127,key=`${status&15}:${note}`;
   if((status&0xf0)===0x90&&velocity)active.add(key);
   else if((status&0xf0)===0x80||(status&0xf0)===0x90)active.delete(key);
   else if((status&0xf0)===0xb0&&(note===120||note===123))for(const held of active)if(held.startsWith(`${status&15}:`))active.delete(held);
  }
  cursor=outputPackets.length;
 };
 for(let i=0;i<5;i++)tap(reload,7);turn(reload,2,channel);tap(reload,8);blocks(reload);receive();
 assert.equal(reload.e.emu_state(36),channel,'데모 로드 전의 MIDI 채널이 적용된다');
 send(reload,{t:'input',notes:1,buttons:0});blocks(reload,1,!stalled);receive();
 assert(active.has(`${channel}:53`),'누른 키의 NoteOn이 실제 worklet 출력으로 전달된다');
 for(let i=0;i<3;i++){
  send(reload,{t:'input',notes:1,buttons:1<<7});send(reload,{t:'input',notes:1,buttons:0});
 }
 if(!demo)turn(reload,2,-1);
 turn(reload,5,1);assert.equal(reload.e.emu_state(3),demo,'키를 누른 상태에서 선택한 데모를 로드한다');
 send(reload,{t:'input',notes:0,buttons:0});
 send(reload,{t:'input',notes:1<<7,buttons:0});
 if(stalled){blocks(reload,1,false);assert.equal(outputPackets.length,cursor,'미확인 출력은 데모 로드 후에도 추가 배치를 막는다');send(reload,{t:'midi-output-ack'});}
 blocks(reload);receive();
 assert.deepEqual([...active],['12:67','0:60'],'데모 로드는 이전 채널을 정리하고 무관한 채널 및 같은 출력 배치의 새 노트를 보존한다');
 send(reload,{t:'input',notes:0,buttons:0});blocks(reload);receive();
 assert.deepEqual([...active],['12:67'],'새 키의 NoteOff는 무관한 채널을 보존하면서 외부 노트를 종료한다');
}
console.log(JSON.stringify({scenario:'실제 AudioWorklet 데모 2종 재로드, 이전 MIDI 채널 3종 정리와 새 노트 보존, 출력 ACK 지연',cases:12,pass:true}));
const drumTail=boot(),drumControl=boot();
for(const processor of [drumTail,drumControl]){
 tap(processor,2);tap(processor,2);for(let knob=2;knob<=5;knob++)turn(processor,knob,-127);
 tap(processor,8);turn(processor,1,63);tap(processor,12);input(processor,[0x99,36,120]);blocks(processor);
}
tap(drumTail,12);assert.equal(drumTail.e.emu_state(4),0);
let tailEnergy=0;
for(let block=0;block<32;block++){
 const stopped=[new Float32Array(128),new Float32Array(128)],running=[new Float32Array(128),new Float32Array(128)];
 drumTail.process([],[stopped]);drumControl.process([],[running]);
 for(let channel=0;channel<2;channel++){assert.deepEqual(stopped[channel],running[channel],'STOP preserves the exact dry drum tail');for(const sample of stopped[channel])tailEnergy+=sample*sample;}
}
assert(tailEnergy>0.01,'tail comparison uses an audible dry drum, not FX residue');
console.log(JSON.stringify({scenario:'real AudioWorklet MIDI input/output, native PCM/packet/save parity, external note+drum REC, song repeat/advance/stop/loop, MIDI clock/continue/reset queue bounds and previously emitted note cleanup and unchanged STOP drum tails',...audioResult,recordHash:byteHash(record),pass:true}));
