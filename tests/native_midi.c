/* SPDX-License-Identifier: GPL-3.0-only */
#include <assert.h>
#include <stdio.h>
#include "../src/mc1_wasm.c"
static uint32_t hash=2166136261u,out_hash=2166136261u;
static unsigned out_count;
static void drain(void){uint32_t message;while((message=emu_midi_pop())){out_count++;for(unsigned i=0;i<4;i++)out_hash=(out_hash^((message>>(i*8))&255))*16777619u;}}
static void blocks(unsigned n){for(unsigned b=0;b<n;b++){emu_render(128);for(unsigned i=0;i<256;i++){uint16_t v=(uint16_t)pcm[i];hash=(hash^(v&255))*16777619u;hash=(hash^(v>>8))*16777619u;}drain();}}
static void send(unsigned a,unsigned b,unsigned c,unsigned n){emu_midi_byte(1,a);if(n>1)emu_midi_byte(1,b);if(n>2)emu_midi_byte(1,c);}
static void tap(unsigned b){emu_input(0,1u<<b);emu_input(0,0);}
int main(void){
    for(unsigned i=0;i<sizeof flash;i++)flash[i]=255;
    emu_init();drain();out_count=0;out_hash=2166136261u;
    send(0xc0,60,0,2);send(0xb0,74,100,3);send(0xe0,0,80,3);send(0x90,60,100,3);blocks(32);
    send(0xb0,64,127,3);send(0x80,60,0,3);blocks(16);emu_midi_reset(1);blocks(256);
    assert(!out_count);
    emu_input(1u<<7,0);blocks(8);emu_input(0,0);blocks(8);assert(out_count>=2);
    uint32_t audio_hash=hash,output_hash=out_hash;
    emu_init();emu_enc(1,63);tap(13);tap(12);send(0x90,67,101,3);send(0x99,36,110,3);blocks(1);tap(12);tap(13);
    assert(engine.project.step[63][0][0].note[0]==67);assert(engine.project.step[63][3][0].drums&1);
    tap(11);tap(6);emu_enc(3,63);emu_enc(4,1);emu_enc(5,2);emu_enc(2,1);
    tap(8);for(unsigned i=0;i<5;i++)tap(7);assert(emu_state(2)==9);emu_enc(3,4);tap(5);assert(emu_state(31)==1);
    tap(9);tap(9);uint32_t record_hash=2166136261u;for(unsigned i=0;i<MC_RECORD_BYTES;i++)record_hash=(record_hash^flash[i])*16777619u;
    printf("{\"audioHash\":%u,\"outputHash\":%u,\"recordHash\":%u}\n",audio_hash,output_hash,record_hash);
}
