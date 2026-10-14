/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 dspaudio
 * Browser HAL using the FM-1 interface of sabliran/sloop-web-emu and
 * dspaudio/orbit-web-emu. The original MC-1 DSP/UI/storage compile unchanged.
 * This models panel behavior and project flash, not the pi32v2 CPU. */
#include "mcfm.h"
#include "ui.h"
#include "store.h"
#include <stdint.h>
#ifdef __wasm__
#define API(n) __attribute__((export_name(n), used))
#else
#define API(n)
#endif
static McEngine engine;
static McUi ui;
static uint16_t fb[240*240];
static int16_t pcm[1024];
static float audio[1024];
static uint8_t flash[8192],leds[11],dims[11],held_part[27],held_note[27];
static uint32_t flash_gen,fb_gen,notes,buttons;
static int master=1023;
static const uint8_t step_keys[MC_STEPS]={0,2,4,6,7,9,11,12,14,16,18,19,21,23,24,26};
static const int8_t matrix[6][11]={
 {-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1},
 {5,11,4,10,3,9,2,8,-1,-1,-1},
 {34,35,36,37,38,40,39,13,7,6,12},
 {23,24,25,26,27,28,29,30,31,32,33},
 {0,1,15,14,17,16,19,18,20,21,22},
 {-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1}};
static int bounds(uint32_t off,unsigned n){return off>=MC_STORE_A && off<=MC_STORE_B+4096 && n<=MC_STORE_B+4096-off;}
static int rd(uint32_t off,void *out,unsigned n){if(!bounds(off,n))return -1;uint8_t *p=out;for(unsigned i=0;i<n;i++)p[i]=flash[off-MC_STORE_A+i];return 0;}
static int erase(uint32_t off){if((off!=MC_STORE_A&&off!=MC_STORE_B))return -1;for(unsigned i=0;i<4096;i++)flash[off-MC_STORE_A+i]=255;flash_gen++;return 0;}
static int prog(uint32_t off,const void *in,unsigned n){if(!bounds(off,n))return -1;const uint8_t *p=in;for(unsigned i=0;i<n;i++)flash[off-MC_STORE_A+i]&=p[i];flash_gen++;return 0;}
static const McStorage storage={rd,erase,prog};
static void service(void){
 if(ui.load_request&&!engine.playing){unsigned d=ui.load_request-1;mc_demo_load(&engine,d);mc_ui_init(&ui);ui.message="DEMO LOADED - PLAY";}
 if(ui.save_request){ui.save_request=0;ui.message=mc_store_save(&storage,&engine.project)==0?"SAVED":"SAVE FAILED";}
}
API("emu_frame") void emu_frame(void){
 engine.master=(uint16_t)((unsigned)master*(unsigned)master/32);
 service();
 for(unsigned y=0;y<240;y+=8)mc_ui_strip(&engine,&ui,y,8,fb+y*240);
 for(unsigned c=0;c<11;c++){leds[c]=dims[c]=0;for(unsigned r=1;r<5;r++){
 int key=matrix[r][c];int on=(key==0&&ui.octave<0)||(key==1&&ui.octave>0)||(key==12&&engine.playing)||(key==13&&engine.recording)||(engine.playing&&key==14+step_keys[engine.step]);
 if(on)leds[c]|=(uint8_t)(1u<<r);
 }}fb_gen++;
}
API("emu_init") void emu_init(void){mc_init(&engine);mc_ui_init(&ui);notes=buttons=0;uint32_t seq;(void)mc_store_load(&storage,&engine.project,&seq);emu_frame();}
API("emu_start") void emu_start(void){emu_frame();}
API("emu_render") void emu_render(unsigned n){if(n>512)n=512;mc_render(&engine,pcm,n);for(unsigned i=0;i<n*2;i++)audio[i]=(float)pcm[i]/32768.0f;}
API("emu_input") void emu_input(uint32_t nn,uint32_t bb){
 static const uint8_t map[14]={12,13,0,1,2,3,4,5,6,7,8,9,10,11};
 for(unsigned i=0;i<14;i++)if((bb&~buttons)&(1u<<i))mc_ui_button(&engine,&ui,map[i]);
 for(unsigned i=0;i<27;i++)if((nn^notes)&(1u<<i)){
 if(nn&(1u<<i)){held_part[i]=engine.selected;int n=53+(int)i+ui.octave*12;held_note[i]=(uint8_t)(n<12?12:n>108?108:n);mc_ui_key(&engine,&ui,i,1);}
 else if(held_part[i]<3)mc_off(&engine,held_part[i],held_note[i]);
 }
 notes=nn;buttons=bb;service();
}
API("emu_enc") void emu_enc(unsigned e,int step){static const uint8_t map[7]={0,1,3,4,5,6,2};if(e<7)mc_ui_encoder(&engine,&ui,map[e],step);service();}
API("emu_adc_set") void emu_adc_set(unsigned ch,int v){if(ch==4)master=v<0?0:v>1023?1023:v;}
API("emu_fb_ptr") uintptr_t emu_fb_ptr(void){return (uintptr_t)fb;}
API("emu_fb_gen") uint32_t emu_fb_gen(void){return fb_gen;}
API("emu_audio_ptr") uintptr_t emu_audio_ptr(void){return (uintptr_t)audio;}
API("emu_led_ptr") uintptr_t emu_led_ptr(void){return (uintptr_t)leds;}
API("emu_led_dim_ptr") uintptr_t emu_led_dim_ptr(void){return (uintptr_t)dims;}
API("emu_flash_ptr") uintptr_t emu_flash_ptr(void){return (uintptr_t)flash;}
API("emu_flash_size") unsigned emu_flash_size(void){return sizeof flash;}
API("emu_flash_gen") uint32_t emu_flash_gen(void){return flash_gen;}
/* Read-only test diagnostics, also useful for browser bug reports. */
API("emu_state") uint32_t emu_state(unsigned k){switch(k){case 0:return engine.project.bpm;case 1:return engine.selected;case 2:return ui.page;case 3:return engine.project.demo;case 4:return engine.playing;case 5:return engine.project.fx[0];case 6:return ui.preset[engine.selected<3?engine.selected:0];case 7:return engine.project.patch[0].cutoff;default:return 0;}}

#ifdef __wasm__
#include <stddef.h>
void *memcpy(void *dst,const void *src,size_t n){unsigned char *d=dst;const unsigned char *s=src;while(n--)*d++=*s++;return dst;}
void *memset(void *dst,int v,size_t n){unsigned char *d=dst;while(n--)*d++=(unsigned char)v;return dst;}
#endif
