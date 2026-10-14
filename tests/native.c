/* SPDX-License-Identifier: GPL-3.0-only */
#include <stdio.h>
#include <assert.h>
#include "../src/mc1_wasm.c"
static void tap(unsigned b){emu_input(0,1u<<b);emu_input(0,0);}
static uint32_t melody_hash(void){
    static const unsigned keys[]={0,7,14,26};
    uint32_t hash=2166136261u;
    uint64_t energy=0;
    for(unsigned k=0;k<4;k++)for(unsigned down=0;down<2;down++){
        emu_input(down?0:1u<<keys[k],0);
        for(unsigned block=0;block<32;block++){
            emu_render(128);
            for(unsigned i=0;i<256;i++){
                int32_t sample=pcm[i];
                uint16_t x=(uint16_t)sample;
                energy+=(uint64_t)(sample*sample);
                hash=(hash^(x&255))*16777619u;
                hash=(hash^(x>>8))*16777619u;
            }
        }
    }
    assert(energy>107374182u);
    return hash;
}
int main(void){emu_init();tap(7);tap(7);tap(7);assert(emu_state(2)==4);emu_enc(5,1);assert(emu_state(3)==1);tap(12);uint32_t hash=2166136261u;
for(unsigned b=0;b<(60u*44100+127)/128;b++){emu_render(128);for(unsigned i=0;i<256;i++){uint16_t x=(uint16_t)pcm[i];hash=(hash^(x&255))*16777619u;hash=(hash^(x>>8))*16777619u;}}
printf("{\"audioHash\":%u,\"recordedPresets\":[",hash);
unsigned count=0;
for(unsigned preset=0;preset<MC_PRESETS;preset++){
    if(mc_presets[preset].pcm<24)continue;
    for(unsigned i=0;i<sizeof flash;i++)flash[i]=255;
    emu_init();
    unsigned part=preset%3;
    emu_enc(0,(int)part);
    emu_enc(6,(int)preset-(int)emu_state(6));
    assert(emu_state(6)==preset);
    assert(engine.project.patch[part].pcm>=24&&engine.project.patch[part].pcm<40);
    assert(engine.project.patch[part].pcm_mix==127);
    tap(9);tap(9);
    uint32_t sound_hash=melody_hash();
    emu_init();emu_enc(0,(int)part);
    assert(melody_hash()==sound_hash);
    printf("%s{\"id\":%u,\"part\":%u,\"pcm\":%u,\"patch\":[",count?",":"",preset,part,mc_presets[preset].pcm);
    assert(sizeof(McPatch)==12);
    const uint8_t *patch=(const uint8_t *)&mc_presets[preset];
    for(unsigned i=0;i<sizeof(McPatch);i++)printf("%s%u",i?",":"",patch[i]);
    printf("],\"audioHash\":%u}",sound_hash);
    count++;
}
assert(count==64);
printf("]}\n");return 0;}
