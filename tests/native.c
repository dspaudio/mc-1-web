/* SPDX-License-Identifier: GPL-3.0-only */
#include <stdio.h>
#include <assert.h>
#include "../src/mc1_wasm.c"
static void tap(unsigned b){emu_input(0,1u<<b);emu_input(0,0);}
int main(void){emu_init();tap(7);tap(7);tap(7);assert(emu_state(2)==4);emu_enc(5,1);assert(emu_state(3)==1);tap(12);uint32_t hash=2166136261u;
for(unsigned b=0;b<(60u*44100+127)/128;b++){emu_render(128);for(unsigned i=0;i<256;i++){uint16_t x=(uint16_t)pcm[i];hash=(hash^(x&255))*16777619u;hash=(hash^(x>>8))*16777619u;}}
printf("{\"audioHash\":%u}\n",hash);return 0;}
