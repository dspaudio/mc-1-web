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
static uint8_t flash[MC_STORE_END-MC_STORE_A],leds[11],dims[11],held_part[27],held_note[27];
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
static int bounds(uint32_t off,unsigned n){return off>=MC_STORE_A && off<=MC_STORE_END && n<=MC_STORE_END-off;}
static int rd(uint32_t off,void *out,unsigned n){if(!bounds(off,n))return -1;uint8_t *p=out;for(unsigned i=0;i<n;i++)p[i]=flash[off-MC_STORE_A+i];return 0;}
static int erase(uint32_t off){if(off%MC_SECTOR||!bounds(off,MC_SECTOR))return -1;for(unsigned i=0;i<MC_SECTOR;i++)flash[off-MC_STORE_A+i]=255;flash_gen++;return 0;}
static int prog(uint32_t off,const void *in,unsigned n){if(!bounds(off,n))return -1;const uint8_t *p=in;for(unsigned i=0;i<n;i++)flash[off-MC_STORE_A+i]&=p[i];flash_gen++;return 0;}
static const McStorage storage={rd,erase,prog};
static void service(void){
 if(ui.load_request&&!engine.playing){unsigned d=ui.load_request-1;mc_demo_load(&engine,d);mc_ui_init(&ui);ui.message="DEMO LOADED - PLAY";}
 if(ui.save_request){ui.save_request=0;ui.message=mc_store_save(&storage,&engine.project)==0?"SAVED":"SAVE FAILED";}
}
API("emu_frame") void emu_frame(void){
 engine.master=(uint32_t)((uint64_t)(unsigned)master*(unsigned)master*MC_MASTER_MAX/(1023u*1023u));
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
 else {ui.preset_popup=ui.encoder_active=0;if(held_part[i]<3)mc_key(&engine,held_part[i],held_note[i],100,0);}
 }
 notes=nn;buttons=bb;service();
}
API("emu_enc") void emu_enc(unsigned e,int step){static const uint8_t map[7]={0,1,3,4,5,6,2};if(e<7)mc_ui_encoder(&engine,&ui,map[e],step);service();}
API("emu_enc_at") void emu_enc_at(unsigned e,int step,uint32_t now_ms){static const uint8_t map[7]={0,1,3,4,5,6,2};if(e<7)mc_ui_encoder_at(&engine,&ui,map[e],step,now_ms);service();}
API("emu_ui_tick") void emu_ui_tick(uint32_t now_ms){mc_ui_tick(&ui,now_ms);}
API("emu_adc_set") void emu_adc_set(unsigned ch,int v){if(ch==4)master=v<0?0:v>1023?1023:v;}
API("emu_fb_ptr") uintptr_t emu_fb_ptr(void){return (uintptr_t)fb;}
API("emu_fb_gen") uint32_t emu_fb_gen(void){return fb_gen;}
API("emu_audio_ptr") uintptr_t emu_audio_ptr(void){return (uintptr_t)audio;}
API("emu_led_ptr") uintptr_t emu_led_ptr(void){return (uintptr_t)leds;}
API("emu_led_dim_ptr") uintptr_t emu_led_dim_ptr(void){return (uintptr_t)dims;}
API("emu_flash_ptr") uintptr_t emu_flash_ptr(void){return (uintptr_t)flash;}
API("emu_flash_size") unsigned emu_flash_size(void){return sizeof flash;}
API("emu_flash_gen") uint32_t emu_flash_gen(void){return flash_gen;}
API("emu_midi_byte") void emu_midi_byte(unsigned source,unsigned byte){if(byte<256)mc_midi_byte(&engine,source,(uint8_t)byte);}
API("emu_midi_reset") void emu_midi_reset(unsigned source){mc_midi_reset(&engine,source);}
API("emu_midi_pop") uint32_t emu_midi_pop(void){McMidiMessage m;if(!mc_midi_pop(&engine,&m))return 0;return ((uint32_t)m.length<<24)|m.data[0]|((uint32_t)m.data[1]<<8)|((uint32_t)m.data[2]<<16);}
/* Read-only test diagnostics, also useful for browser bug reports. */
API("emu_state") uint32_t emu_state(unsigned k){
 unsigned p=engine.selected<3?engine.selected:0;
 switch(k){case 0:return engine.project.bpm;case 1:return engine.selected;case 2:return ui.page;case 3:return engine.project.demo;case 4:return engine.playing;case 5:return engine.project.fx[0];case 6:return ui.preset[p];case 7:return engine.project.patch[0].cutoff;case 8:return engine.project.drum_kit;case 9:return engine.pattern;case 10:case 11:case 12:case 13:return engine.project.track_fx[engine.selected][k-10];case 14:return ui.preset_popup;
 case 15:return engine.arp[p].events;case 16:return engine.project.arp[p].enabled;
 case 17:return engine.project.arp[p].mode;case 18:return engine.project.arp[p].rate;
 case 19:return engine.project.arp[p].octaves;case 20:return engine.project.arp[p].gate;
 case 21:return engine.project.arp[p].latch;case 22:return engine.project.automation_count;
 case 23:return engine.automation_full;case 24:return engine.step;case 25:return engine.project.preset[p];case 26:return engine.queued;case 27:return MC_PATTERNS;case 28:return engine.edit_step;case 29:return engine.master;case 30:return engine.midi.dropped;case 31:return engine.project.clock_source;case 32:return engine.project.song_mode;case 33:return engine.song_position;case 34:return engine.song_repeat;case 35:return engine.project.song_length;case 36:case 37:case 38:case 39:return engine.project.midi_channel[k-36];default:return 0;}
}
API("emu_parameter") int emu_parameter(unsigned part,unsigned parameter){return mc_parameter_get(&engine,part,parameter);}

#ifdef __wasm__
#include <stddef.h>
void *memcpy(void *dst,const void *src,size_t n){unsigned char *d=dst;const unsigned char *s=src;while(n--)*d++=*s++;return dst;}
void *memset(void *dst,int v,size_t n){unsigned char *d=dst;while(n--)*d++=(unsigned char)v;return dst;}
#endif
