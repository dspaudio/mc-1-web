/* SPDX-License-Identifier: GPL-3.0-only */
#include <stdio.h>
#include <assert.h>
#include "../src/mc1_wasm.c"
static void tap(unsigned b){emu_input(0,1u<<b);emu_input(0,0);}
static void storage_bounds(void){
    uint8_t byte=0xa5;
    assert(rd(MC_STORE_A-1,&byte,1)==-1);
    assert(prog(MC_STORE_END,&byte,1)==-1);
    assert(erase(MC_STORE_A- MC_SECTOR)==-1);
    assert(erase(MC_STORE_END)==-1);
    assert(erase(MC_STORE_A+1)==-1);
    assert(erase(MC_STORE_END-MC_SECTOR)==0);
    assert(prog(MC_STORE_END-1,&byte,1)==0);
    byte=0;assert(rd(MC_STORE_END-1,&byte,1)==0&&byte==0xa5);
    for(unsigned i=0;i<sizeof flash;i++)flash[i]=255;
}
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
static uint32_t patterns_hash(uint32_t *record_hash){
    for(unsigned i=0;i<sizeof flash;i++)flash[i]=255;
    emu_init();tap(6);
    for(unsigned pattern=0;pattern<MC_PATTERNS;pattern++){
        emu_enc(1,(int)pattern-(int)emu_state(9));emu_enc(2,15-(int)emu_state(28));
        emu_input(1u<<(pattern%27),0);emu_input(0,0);
        assert(engine.project.step[pattern][0][15].note[0]==53+pattern%27);
    }
    emu_enc(0,3);emu_enc(3,15-(int)emu_state(28));emu_input(1u<<15,0);emu_input(0,0);
    tap(8);emu_enc(0,-3);tap(13);tap(12);emu_render(1);
    emu_input(1u<<7,0);emu_input(0,0);emu_enc(2,17);
    tap(2);tap(2);emu_enc(2,41);tap(12);tap(13);
    assert(engine.project.automation_count==2);
    assert(engine.project.automation[0].address==315&&engine.project.automation[1].address==319);
    tap(9);tap(9);tap(9);tap(9);
    *record_hash=2166136261u;
    for(unsigned i=0;i<MC_RECORD_BYTES;i++)*record_hash=(*record_hash^flash[MC_STORE_BYTES+i])*16777619u;
    emu_init();emu_enc(1,63);tap(12);
    uint32_t hash=2166136261u;
    for(unsigned block=0;block<256;block++){
        emu_render(512);
        for(unsigned i=0;i<1024;i++){
            uint16_t x=(uint16_t)pcm[i];hash=(hash^(x&255))*16777619u;hash=(hash^(x>>8))*16777619u;
        }
    }
    return hash;
}
static uint32_t metronome_hash(void){
    for(unsigned i=0;i<sizeof flash;i++)flash[i]=255;
    emu_init();tap(7);tap(7);emu_enc(5,1);tap(9);tap(9);
    assert(engine.project.metronome==1);
    emu_init();assert(engine.project.metronome==1);
    emu_enc(1,63);tap(7);
    for(unsigned part=0;part<4;part++){tap(10);emu_enc(0,1);}
    assert(engine.mute==15);tap(8);tap(13);tap(12);
    uint32_t hash=2166136261u;uint64_t energy=0;
    for(unsigned block=0;block<256;block++){
        emu_render(128);
        for(unsigned i=0;i<256;i++){
            int32_t sample=pcm[i];energy+=(uint64_t)(sample*sample);
            uint16_t x=(uint16_t)sample;hash=(hash^(x&255))*16777619u;hash=(hash^(x>>8))*16777619u;
        }
    }
    assert(energy>0);return hash;
}
int main(void){storage_bounds();emu_init();tap(7);tap(7);tap(7);assert(emu_state(2)==4);emu_enc(5,1);assert(emu_state(3)==1);tap(12);uint32_t hash=2166136261u;
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
uint32_t record_hash=0,pattern_hash=patterns_hash(&record_hash);
printf("],\"pattern64Hash\":%u,\"patternRecordHash\":%u,\"metronomeHash\":%u}\n",pattern_hash,record_hash,metronome_hash());return 0;}
