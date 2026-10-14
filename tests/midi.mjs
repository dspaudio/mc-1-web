// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({Option:class {constructor(text,value){Object.assign(this,{text,value});}}});
vm.runInContext(fs.readFileSync('site/midi.js','utf8')+';globalThis.Connection=McMidiConnection;',context);
const element = () => ({value:'',options:[],disabled:false,textContent:'',addEventListener(){},replaceChildren(...options){this.options=options;},add(option){this.options.push(option);}});
function port(id) { return {id,name:id,state:'connected',sent:[],async open(){this.opened=true;return this;},async close(){this.closed=true;return this;},send(bytes){this.sent.push(bytes);},clear(){this.cleared=true;}}; }
function fixture(navigator={}) {
    const messages=[],input=element(),output=element(),button=element(),status=element();
    const node={port:{postMessage(m){messages.push(m);}}};
    const midi=new context.Connection({getNode:()=>node,navigator,input,output,button,status});
    return {midi,messages,input,output,button,status,node};
}
let f=fixture();await f.midi.connect();assert.match(f.status.textContent,/unavailable/);
f=fixture({requestMIDIAccess:async()=>{throw new Error('Denied');}});await f.midi.connect();assert.match(f.status.textContent,/Denied/);assert.equal(f.input.disabled,true);
const inPort=port('Keyboard'),outPort=port('Synth');
const access={inputs:new Map([[inPort.id,inPort]]),outputs:new Map([[outPort.id,outPort]])};
f=fixture({requestMIDIAccess:async options=>{assert.equal(options.sysex,false);return access;}});
await f.midi.connect();assert.equal(f.input.disabled,false);assert.equal(f.button.textContent,'Disconnect MIDI');
f.input.value=inPort.id;await f.midi.selectInput();f.output.value=outPort.id;await f.midi.selectOutput();
inPort.onmidimessage({data:new Uint8Array([0x90,60,100])});
assert.equal(f.messages.at(-1).t,'midi-input');assert.deepEqual(Array.from(f.messages.at(-1).messages[0]),[0x90,60,100]);
for(let i=0;i<64;i++)inPort.onmidimessage({data:[0x80,60,0]});
assert.equal(f.midi.pending.length,64);const epoch=f.midi.epoch;
f.midi.message({t:'midi-ack',epoch});assert.equal(f.messages.at(-1).messages.length,64);assert.equal(f.midi.pending.length,0);
f.midi.receive([0xf0,1,0xf7]);f.midi.receive([0x90,128,1]);assert.equal(f.midi.pending.length,0,'SysEx and invalid data rejected');
for(let i=0;i<257;i++)f.midi.receive([0x90,60,100]);
assert.equal(f.midi.pending.length,0);assert.match(f.status.textContent,/overflow/);assert.equal(f.messages.at(-1).t,'midi-reset');
f.midi.message({t:'midi-ack',epoch});assert.equal(f.midi.inFlight,false,'stale acknowledgement ignored');
f.midi.message({t:'midi-output',messages:[(3<<24)|(100<<16)|(60<<8)|0x91,(1<<24)|0xf8]});
assert.deepEqual(Array.from(outPort.sent[0]),[0x91,60,100]);assert.deepEqual(Array.from(outPort.sent[1]),[0xf8]);
assert.equal(f.messages.at(-1).t,'midi-output-ack');
inPort.state='disconnected';access.onstatechange();assert.equal(inPort.onmidimessage,null);assert.equal(f.midi.inPort,null);assert.equal(f.messages.at(-1).t,'midi-reset');
f.midi.disconnect();assert.equal(outPort.closed,true);assert.equal(outPort.cleared,true);assert.equal(outPort.sent.length,34,'disconnect releases sustain and notes on all channels');assert.equal(access.onstatechange,null);assert.equal(f.input.disabled,true);
let grant;f=fixture({requestMIDIAccess:()=>new Promise(resolve=>grant=resolve)});const connecting=f.midi.connect();f.midi.disconnect();grant(access);await connecting;assert.equal(f.midi.access,null,'late permission result cannot reconnect');
inPort.state='connected';f=fixture({requestMIDIAccess:async()=>access});await f.midi.connect();f.input.value=inPort.id;
let open;inPort.open=()=>new Promise(resolve=>open=resolve);const selecting=f.midi.selectInput();f.midi.disconnect();open(inPort);await selecting;assert.equal(f.midi.inPort,null,'late port open cannot reconnect');assert.equal(inPort.onmidimessage,null);
const raceIn=port('Race'),raceOut=port('Race out');
const raceAccess={inputs:new Map([[raceIn.id,raceIn]]),outputs:new Map([[raceOut.id,raceOut]])};
f=fixture({requestMIDIAccess:async()=>raceAccess});await f.midi.connect();f.input.value=raceIn.id;
const opens=[];raceIn.open=()=>new Promise(resolve=>opens.push(resolve));
const first=f.midi.selectInput(),second=f.midi.selectInput();opens[1](raceIn);await second;opens[0](raceIn);await first;
assert.equal(f.midi.inPort,raceIn);assert.notEqual(raceIn.closed,true,'stale open does not close the newly selected same port');
f.output.value=raceOut.id;await f.midi.selectOutput();raceOut.send=()=>{throw new Error('Device lost');};
f.midi.message({t:'midi-output',messages:[(1<<24)|0xf8]});assert.match(f.status.textContent,/Device lost/);assert.equal(f.midi.outPort,null);assert(raceOut.closed);
f.midi.disconnect();
const handlers={},keys=[];
const mainSource=fs.readFileSync('site/emu.js','utf8');
vm.runInNewContext(mainSource.slice(mainSource.indexOf('const KEYNOTES ='),mainSource.indexOf('/* ------------------------------------------------------------- screen')),{
 window:{addEventListener:(name,handler)=>handlers[name]=handler},BTN:{PLAY:12},btnEls:{},enc:()=>keys.push('encoder'),
 noteDown:()=>keys.push('note'),noteUp(){},btnDown:()=>keys.push('play'),btnUp(){},sendInput(){},notesMask:0,buttonsMask:0,
});
handlers.keydown({key:' ',target:{closest:()=>true},preventDefault(){throw new Error('form key intercepted');}});
handlers.keydown({key:'ArrowDown',target:{closest:()=>true},preventDefault(){throw new Error('select arrow intercepted');}});
assert.equal(keys.length,0,'focused MIDI controls keep their keyboard interaction');
handlers.keydown({key:' ',target:{closest:()=>false},preventDefault(){}});assert.deepEqual(keys,['play']);
console.log(JSON.stringify({webMidi:'PASS',scenarios:['unsupported','permission denial','port selection','validated input','64-message acknowledgement','256-message queue bound','stale acknowledgement','output bytes','hot unplug','disconnect note release','late permission','late open','same-port open race','output failure','keyboard focus isolation']}));
