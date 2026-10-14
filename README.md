# MC-1 web emulator 0.1.3

An FM-1 faceplate emulator running the original MC-1 C DSP, sequencer, UI and A/B project storage in an AudioWorklet. Adapted from [dspaudio/orbit-web-emu](https://github.com/dspaudio/orbit-web-emu).

Only MC-1 is included. No SLOOP, Felucca or ORBIT firmware binaries or selector. Browser flash uses its own `mc1-emu-v1` IndexedDB database.

## Added and changed in 0.1.3

- Expanded the melodic bank from 64 to 128 presets, grouped into
  fourteen sound categories with contiguous ranges.
- Added 64 presets based on 16 real instrument recordings from VSCO 2 Community
  Edition, released under CC0-1.0. These presets start with recorded PCM only;
  lowering the PCM knob blends in the LA engine's oscillator.
- Preserved the names and sound parameters of the previous 64 presets. Their
  displayed numbers now follow the category order shown below.
- Preserved existing demo sounds and saved project sounds, including v2 and
  0.1.2 v3 projects. The 24 PCM attack sources and eight drum kits are unchanged.

## Added and changed in 0.1.2

- Expanded the melodic bank from 48 to 64 presets, adding house
  organ and chord sounds, keys, voice-like tones, hits, percussion, sequences and acid sounds.
- Expanded the original synthesized PCM attack bank from 12 to 24 sources.
- Expanded drums from one kit to eight selectable kits with sixteen shared lane roles.
- Added independent delay, reverb, drive and chorus for each part, while retaining
  master effects. Format v3 saves kits and track effects and imports older projects.
- PRESETS now chooses melodic sounds or drum kits; ALGORITHM chooses patterns
  on every part.

## Controls

Press POWER ON, then PLAY. For NEON SPIRAL: stop, GLO three times, KNOB4 clockwise, PLAY. SELECT chooses a part; PRESETS chooses a melodic preset or, with DRUMS selected, a drum kit. ALGORITHM queues patterns on every part. SAVE twice while stopped stores the project locally; reload restores it, including the selected kit and effects.

HOME then FX opens the selected part's delay, reverb, drive and chorus controls.
The four knobs edit that part only, including DRUMS. Press FX again to switch
between track and master effects; HOME then FX always returns to track effects.
All four parts' settings and the master effects are saved with the project.

GLO cycles through GLOBAL MIXER, GROOVE CONTROL and DEMO LIBRARY. In the mixer,
the four knobs adjust PART 1, PART 2, PART 3 and DRUM levels independently.
SELECT chooses a part and ARP mutes it; the mixer displays level and mute state.
The mixer reminder reads `SELECT-ARP to mute`.
HOME shows pitch marks inside melodic steps so phrase changes remain visible
even when their rhythms match. Above the knobs, PATTERN shows the current pattern
and NEXT shows a queued change until the bar boundary. Status messages take priority.

OCT− / OCT+ transpose the melodic keyboard by one octave, up to three octaves
in either direction. The corresponding button lights below or above the default
octave. During playback, the sixteen white keys show the sixteen sequencer steps.

Build with clang/LLD (wasm32), Python 3 and Node: `python3 tools/check_core.py && python3 tools/build.py`. Serve `build/` over HTTPS or localhost. The workflow performs native/WASM audio parity and AudioWorklet input/storage checks, then deploys GitHub Pages. Build provenance lives in CORE.json and generated build-info.json.

POWER ON stays available if audio startup fails, displays the failure, and allows
a retry. Startup must receive the AudioWorklet ready response within ten seconds.
CI also checks startup failure/retry handling in Node, octave transposition,
the sixteen white-key step LEDs, preset and kit selection boundaries, distinct
kit audio, kit save/reboot, independent track effects and older project imports.
All 64 recorded instrument presets are checked for native/WASM PCM parity
before and after saving and reloading.
These checks do not establish browser rendering or physical-device behavior.

Browser behavior is not FM-1 hardware verification. CPU timing, physical I/O, bootloader, calibration, USB/MIDI and real flash are not emulated. Hardware installation remains unverified. Browser saved data may be cleared by browser settings.

Software: GPL-3.0-only; see [NOTICE.md](NOTICE.md). Recorded instrument samples:
CC0-1.0, credited below. Not affiliated with Roland or M-VAVE.

[Open the emulator](https://dspaudio.github.io/mc-1-web/)

## Complete factory preset list

128 melodic presets: the previous 64 synthesis presets and 64 presets derived
from real instrument recordings. The 24 synthesized PCM attack sources and
eight drum kits with 16 lanes each remain available. The
[MC-505 factory patch list](https://cdn.roland.com/assets/media/pdf/MC505PTC.pdf)
is a reference for a varied groovebox sound palette. No Roland samples or patch
data are included.

| Category | Presets | Count |
|---|---|---|
| Bass | 1–12 | 12 |
| Acid | 13–28 | 16 |
| Lead | 29–40 | 12 |
| Sequence | 41–50 | 10 |
| Keys | 51–60 | 10 |
| Organ | 61–68 | 8 |
| Brass/Reed | 69–76 | 8 |
| Strings | 77–82 | 6 |
| Pad | 83–94 | 12 |
| Pluck | 95–104 | 10 |
| Mallet/Bell | 105–112 | 8 |
| Voice | 113–118 | 6 |
| Hit/Percussion | 119–123 | 5 |
| Texture | 124–128 | 5 |

### Bass (1–12)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 01 | LA-inspired | ROUND BASS | Bass | Original synthesis |
| 02 | LA-inspired | DEEP CELL | Bass | Original synthesis |
| 03 | LA-inspired | CLUB PULSE | Bass | Original synthesis |
| 04 | LA-inspired | CLICK FLOOR | Bass | Original synthesis |
| 05 | LA-inspired | WIRE PICK | Bass | Original synthesis |
| 06 | LA-inspired | DUB CHAMBER | Bass | Original synthesis |
| 07 | Recorded PCM (LA) | CONTRABASS ROOT | Bass | VSCO 2 CE: Contrabass |
| 08 | Recorded PCM (LA) | CONTRABASS ROUND | Bass | VSCO 2 CE: Contrabass |
| 09 | Recorded PCM (LA) | CONTRABASS SNAP | Bass | VSCO 2 CE: Contrabass |
| 10 | Recorded PCM (LA) | CELLO LOW BOW | Bass | VSCO 2 CE: Cello section |
| 11 | Recorded PCM (LA) | CELLO BASS PULSE | Bass | VSCO 2 CE: Cello section |
| 12 | Recorded PCM (LA) | BASSOON ROOT | Bass | VSCO 2 CE: Bassoon |

### Acid (13–28)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 13 | 303-inspired | ACID SAW | Bass / lead | Original synthesis |
| 14 | 303-inspired | SQUARE RUBBER | Bass / lead | Original synthesis |
| 15 | 303-inspired | HIGH VOLTAGE | Lead | Original synthesis |
| 16 | 303-inspired | SOFT STEP | Lead | Original synthesis |
| 17 | 303-inspired | RESONA BASS | Bass | Original synthesis |
| 18 | 303-inspired | LIQUID STEP | Bass | Original synthesis |
| 19 | 303-inspired | BRIGHT COIL | Lead | Original synthesis |
| 20 | 303-inspired | HOLLOW REED | Lead | Original synthesis |
| 21 | 303-inspired | NEEDLE LINE | Lead | Original synthesis |
| 22 | 303-inspired | BUBBLE RUN | Sequence | Original synthesis |
| 23 | 303-inspired | VELVET MONO | Lead | Original synthesis |
| 24 | 303-inspired | RAZOR MONO | Lead | Original synthesis |
| 25 | 303-inspired | ACID RIBBON | Bass / lead | Original synthesis |
| 26 | 303-inspired | COIL WALK | Acid sequence | Original synthesis |
| 27 | 303-inspired | SQUELCH GRID | Acid sequence | Original synthesis |
| 28 | 303-inspired | RUBBER CHASE | Acid sequence | Original synthesis |

### Lead (29–40)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 29 | LA-inspired | VECTOR LEAD | Lead | Original synthesis |
| 30 | LA-inspired | WIDE SAW | Lead | Original synthesis |
| 31 | LA-inspired | SOFT PIPE | Lead | Original synthesis |
| 32 | LA-inspired | POLY CHROME | Poly synth | Original synthesis |
| 33 | Recorded PCM (LA) | TRUMPET LEAD | Lead | VSCO 2 CE: Trumpet |
| 34 | Recorded PCM (LA) | HORN SOLO | Lead | VSCO 2 CE: French horn |
| 35 | Recorded PCM (LA) | FLUTE LEAD | Lead | VSCO 2 CE: Flute |
| 36 | Recorded PCM (LA) | FLUTE SOFT ARC | Lead | VSCO 2 CE: Flute |
| 37 | Recorded PCM (LA) | OBOE BRIGHT | Lead | VSCO 2 CE: Oboe |
| 38 | Recorded PCM (LA) | OBOE SOLO | Lead | VSCO 2 CE: Oboe |
| 39 | Recorded PCM (LA) | CLARINET ARC | Lead | VSCO 2 CE: Clarinet |
| 40 | Recorded PCM (LA) | CLARINET BRIGHT | Lead | VSCO 2 CE: Clarinet |

### Sequence (41–50)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 41 | LA-inspired | SEQUENCE KEY | Sequence | Original synthesis |
| 42 | LA-inspired | SPARK SEQ | Sequence | Original synthesis |
| 43 | LA-inspired | RATCHET PLUCK | Sequence | Original synthesis |
| 44 | Recorded PCM (LA) | PIANO STEPS | Sequence | VSCO 2 CE: Piano |
| 45 | Recorded PCM (LA) | MARIMBA RUN | Sequence | VSCO 2 CE: Marimba |
| 46 | Recorded PCM (LA) | GLOCK GRID | Sequence | VSCO 2 CE: Glockenspiel |
| 47 | Recorded PCM (LA) | XYLO WALK | Sequence | VSCO 2 CE: Xylophone |
| 48 | Recorded PCM (LA) | HARP PATTERN | Sequence | VSCO 2 CE: Harp |
| 49 | Recorded PCM (LA) | CLARINET GATE | Sequence | VSCO 2 CE: Clarinet |
| 50 | Recorded PCM (LA) | VIOLIN PULSE | Sequence | VSCO 2 CE: Solo violin |

### Keys (51–60)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 51 | LA-inspired | HAMMER KEY | Keys | Original synthesis |
| 52 | LA-inspired | SOFT TINES | Keys | Original synthesis |
| 53 | LA-inspired | CLAVI CLICK | Keys | Original synthesis |
| 54 | LA-inspired | VELVET CHORD | House keys | Original synthesis |
| 55 | LA-inspired | AMBER PIANO | Keys | Original synthesis |
| 56 | LA-inspired | PRISM KEY | Keys | Original synthesis |
| 57 | Recorded PCM (LA) | PIANO FELT | Keys | VSCO 2 CE: Piano |
| 58 | Recorded PCM (LA) | PIANO BRIGHT | Keys | VSCO 2 CE: Piano |
| 59 | Recorded PCM (LA) | PIANO ROOM | Keys | VSCO 2 CE: Piano |
| 60 | Recorded PCM (LA) | PIANO SHORT | Keys | VSCO 2 CE: Piano |

### Organ (61–68)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 61 | LA-inspired | DRAWBAR KEY | Organ | Original synthesis |
| 62 | LA-inspired | PERC ORGAN | Organ | Original synthesis |
| 63 | LA-inspired | CELLAR ORGAN | House organ | Original synthesis |
| 64 | Recorded PCM (LA) | ORGAN MELLOW | Organ | VSCO 2 CE: Organ |
| 65 | Recorded PCM (LA) | ORGAN CHAPEL | Organ | VSCO 2 CE: Organ |
| 66 | Recorded PCM (LA) | ORGAN PERC | Organ | VSCO 2 CE: Organ |
| 67 | Recorded PCM (LA) | ORGAN FULL | Organ | VSCO 2 CE: Organ |
| 68 | Recorded PCM (LA) | ORGAN BRIGHT | Organ | VSCO 2 CE: Organ |

### Brass/Reed (69–76)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 69 | LA-inspired | REED STACK | Reed | Original synthesis |
| 70 | LA-inspired | BRASS BLOCK | Brass | Original synthesis |
| 71 | LA-inspired | SOFT HORNS | Brass | Original synthesis |
| 72 | Recorded PCM (LA) | TRUMPET SECTION | Brass/Reed | VSCO 2 CE: Trumpet |
| 73 | Recorded PCM (LA) | HORN MELLOW | Brass/Reed | VSCO 2 CE: French horn |
| 74 | Recorded PCM (LA) | BASSOON REED | Brass/Reed | VSCO 2 CE: Bassoon |
| 75 | Recorded PCM (LA) | TRUMPET FANFARE | Brass/Reed | VSCO 2 CE: Trumpet |
| 76 | Recorded PCM (LA) | HORN LOW | Brass/Reed | VSCO 2 CE: French horn |

### Strings (77–82)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 77 | LA-inspired | STRING VEIL | Strings | Original synthesis |
| 78 | Recorded PCM (LA) | VIOLIN BOW | Strings | VSCO 2 CE: Solo violin |
| 79 | Recorded PCM (LA) | VIOLA CHAMBER | Strings | VSCO 2 CE: Viola section |
| 80 | Recorded PCM (LA) | CELLO ENSEMBLE | Strings | VSCO 2 CE: Cello section |
| 81 | Recorded PCM (LA) | VIOLIN SILVER | Strings | VSCO 2 CE: Solo violin |
| 82 | Recorded PCM (LA) | CONTRABASS BOW | Strings | VSCO 2 CE: Contrabass |

### Pad (83–94)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 83 | LA-inspired | SILK PAD | Pad | Original synthesis |
| 84 | LA-inspired | SLOW HALO | Pad | Original synthesis |
| 85 | LA-inspired | BELL CLOUD | Pad | Original synthesis |
| 86 | LA-inspired | DUSK SCREEN | Pad | Original synthesis |
| 87 | LA-inspired | AIR CHAMBER | Pad | Original synthesis |
| 88 | Recorded PCM (LA) | PIANO CLOUD | Pad | VSCO 2 CE: Piano |
| 89 | Recorded PCM (LA) | ORGAN HORIZON | Pad | VSCO 2 CE: Organ |
| 90 | Recorded PCM (LA) | VIOLIN HALO | Pad | VSCO 2 CE: Solo violin |
| 91 | Recorded PCM (LA) | VIOLA VEIL | Pad | VSCO 2 CE: Viola section |
| 92 | Recorded PCM (LA) | CELLO WARM PAD | Pad | VSCO 2 CE: Cello section |
| 93 | Recorded PCM (LA) | FLUTE AURORA | Pad | VSCO 2 CE: Flute |
| 94 | Recorded PCM (LA) | HORN SLOW PAD | Pad | VSCO 2 CE: French horn |

### Pluck (95–104)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 95 | LA-inspired | NYLON PLUCK | Pluck | Original synthesis |
| 96 | LA-inspired | THUMB PLUCK | Pluck | Original synthesis |
| 97 | LA-inspired | WIRE ZITHER | Pluck | Original synthesis |
| 98 | Recorded PCM (LA) | HARP BRIGHT | Pluck | VSCO 2 CE: Harp |
| 99 | Recorded PCM (LA) | HARP RAIN | Pluck | VSCO 2 CE: Harp |
| 100 | Recorded PCM (LA) | HARP MELLOW | Pluck | VSCO 2 CE: Harp |
| 101 | Recorded PCM (LA) | HARP THREAD | Pluck | VSCO 2 CE: Harp |
| 102 | Recorded PCM (LA) | PIANO PLUCK | Pluck | VSCO 2 CE: Piano |
| 103 | Recorded PCM (LA) | MARIMBA PLUCK | Pluck | VSCO 2 CE: Marimba |
| 104 | Recorded PCM (LA) | XYLO PLUCK | Pluck | VSCO 2 CE: Xylophone |

### Mallet/Bell (105–112)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 105 | LA-inspired | GLASS BELL | Bell | Original synthesis |
| 106 | LA-inspired | WOOD MALLET | Mallet | Original synthesis |
| 107 | LA-inspired | GLASS TINES | Mallet | Original synthesis |
| 108 | Recorded PCM (LA) | GLOCK BELL | Mallet/Bell | VSCO 2 CE: Glockenspiel |
| 109 | Recorded PCM (LA) | MARIMBA HOLLOW | Mallet/Bell | VSCO 2 CE: Marimba |
| 110 | Recorded PCM (LA) | GLOCK DROPS | Mallet/Bell | VSCO 2 CE: Glockenspiel |
| 111 | Recorded PCM (LA) | XYLO BAR | Mallet/Bell | VSCO 2 CE: Xylophone |
| 112 | Recorded PCM (LA) | MARIMBA ROUND | Mallet/Bell | VSCO 2 CE: Marimba |

### Voice (113–118)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 113 | LA-inspired | VOWEL CHIME | Voice-like | Original synthesis |
| 114 | LA-inspired | BREATH STACK | Voice-like | Original synthesis |
| 115 | LA-inspired | CHOIR FLICK | Voice-like | Original synthesis |
| 116 | Recorded PCM (LA) | FLUTE CHOIR | Processed woodwind | VSCO 2 CE: Flute |
| 117 | Recorded PCM (LA) | OBOE VOWEL | Processed woodwind | VSCO 2 CE: Oboe |
| 118 | Recorded PCM (LA) | CLARINET VOICE | Processed woodwind | VSCO 2 CE: Clarinet |

### Hit/Percussion (119–123)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 119 | LA-inspired | CHORD STAB | Stab | Original synthesis |
| 120 | LA-inspired | BRASS IMPACT | Hit | Original synthesis |
| 121 | LA-inspired | TIMBER HIT | Percussion | Original synthesis |
| 122 | LA-inspired | TUBE STRIKE | Percussion | Original synthesis |
| 123 | Recorded PCM (LA) | TRUMPET HIT | Hit/Percussion | VSCO 2 CE: Trumpet |

### Texture (124–128)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 124 | LA-inspired | ORBITAL MT | Texture | Original synthesis |
| 125 | LA-inspired | METAL RAIN | Texture | Original synthesis |
| 126 | LA-inspired | SPACE SHARD | Texture | Original synthesis |
| 127 | LA-inspired | DIGITAL MIST | Texture | Original synthesis |
| 128 | Recorded PCM (LA) | VIOLA DRIFT | Texture | VSCO 2 CE: Viola section |

## Recorded instrument sources

The 64 recorded PCM presets use 16 recordings from
[VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE/tree/440300901dfe9275fd84e0b7763af1f8443ae62e),
released under [CC0 1.0 Universal](https://dspaudio.github.io/mc-1-web/samples-LICENSE.txt).
Recorded by Sam Gossner & Simon Dalzell; sample cutting by Elan Hickler/Soundemote.
VS Chamber Orchestra Community Edition, Versilian Studios.

These compact samples are resampled and trimmed from the source recordings;
sustained instruments use loops. Multiple presets derive from each recording
with different envelopes and filters. The three recorded PCM presets in Voice
use processed woodwinds; they are not recordings of human voices.
The [sample manifest](https://dspaudio.github.io/mc-1-web/recorded-samples.json)
provides the pinned source revision, original file paths, hashes, pitch centers
and processing settings.

| Instrument | Original recording |
|---|---|
| Piano | [Player_dyn3_rr1_020.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Keys/Upright%20Piano/Player_dyn3_rr1_020.wav) |
| Organ | [Rode_Man3Open_25.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Keys/Organ/Loud/Rode_Man3Open_25.wav) |
| Marimba | [Marimba_hit_Outrigger_B2_loud_01.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Percussion/Marimba/Marimba_hit_Outrigger_B2_loud_01.wav) |
| Glockenspiel | [glock_medium_G4.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Percussion/Glock/glock_medium_G4.wav) |
| Xylophone | [Xylo_Medium_C4_ff_01_far.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Percussion/Xylo/Xylo_Medium_C4_ff_01_far.wav) |
| Harp | [KSHarp_B3_mf.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Strings/Harp/KSHarp_B3_mf.wav) |
| Solo violin | [LLVln_ArcoVib_C4_f.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Strings/Solo%20Violin/Arco%20Vib/LLVln_ArcoVib_C4_f.wav) |
| Viola section | [ViolaEns_susvib_B2_v1_1.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Strings/Viola%20Section/susvib/ViolaEns_susvib_B2_v1_1.wav) |
| Cello section | [susvib_B1_v1_1.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Strings/Cello%20Section/susvib/susvib_B1_v1_1.wav) |
| Contrabass | [BKCtbss_SusNV_C#2_v1_rr1.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Strings/Solo%20Contrabass/SusNV/BKCtbss_SusNV_C%232_v1_rr1.wav) |
| Flute | [LDFlute_susNV_C3_v1_1.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Woodwinds/Flute/susNV/LDFlute_susNV_C3_v1_1.wav) |
| Oboe | [Oboe_Sus_A#2_v1_Main.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Woodwinds/Oboe/Sus/Oboe_Sus_A%232_v1_Main.wav) |
| Clarinet | [DCClar_susLong_A#2_v1_rr1_sum.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Woodwinds/Clarinet/susLong/DCClar_susLong_A%232_v1_rr1_sum.wav) |
| Bassoon | [PSBassoon_C2_v1_1.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Woodwinds/Bassoon/sus/PSBassoon_C2_v1_1.wav) |
| Trumpet | [Sum_SHTrumpet_sus_C3_v1_rr1.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Brass/Trumpet/sus/Sum_SHTrumpet_sus_C3_v1_rr1.wav) |
| French horn | [MOHorn_sus_C3_v1_1.wav](https://raw.githubusercontent.com/sgossner/VSCO-2-CE/440300901dfe9275fd84e0b7763af1f8443ae62e/Brass/F%20Horn/sus/MOHorn_sus_C3_v1_1.wav) |

## Drum kits

Select DRUMS with SELECT, then turn PRESETS to choose a kit. ALGORITHM continues
to choose patterns. Kits share the sixteen lane roles below, so a pattern can be
played with any kit. Projects saved by older MC-1 versions load with BASE 808,
dry track effects and their original master effects; saving upgrades the project
to format v3.

| # | Kit name | Synthesis character |
|---|---|---|
| 01 | BASE 808 | Original rounded kicks, noise snares and metallic hats |
| 02 | CLUB 909 | Stronger kick pitch sweep, sharper attack and brighter hats |
| 03 | TIGHT 606 | Higher tuning and shorter drum tails |
| 04 | VINTAGE | Lower tuning, softer clicks and less snare noise |
| 05 | HOUSE | Longer kicks, claps and open-hat tails |
| 06 | BREAK JUNGLE | Noisier snares, sharp clicks and bright percussion |
| 07 | IRON WORKS | Low tuning, long tails and strong pitch sweeps |
| 08 | ELECTRO LATIN | Higher toms, cowbells and claves with compact tails |

The original BASE 808 lane names are:

| Drum lane | Sound engine | Preset name |
|---|---|---|
| 01 | 808-inspired synthesis | KICK |
| 02 | 808-inspired synthesis | SNARE |
| 03 | 808-inspired synthesis | CLOSED HAT |
| 04 | 808-inspired synthesis | OPEN HAT |
| 05 | 808-inspired synthesis | CLAP |
| 06 | 808-inspired synthesis | LOW TOM |
| 07 | 808-inspired synthesis | KICK 2 |
| 08 | 808-inspired synthesis | RIMSHOT |
| 09 | 808-inspired synthesis | SNARE 2 |
| 10 | 808-inspired synthesis | HIGH TOM |
| 11 | 808-inspired synthesis | CRASH |
| 12 | 808-inspired synthesis | RIDE |
| 13 | 808-inspired synthesis | SHAKER |
| 14 | 808-inspired synthesis | COWBELL |
| 15 | 808-inspired synthesis | CLAVES |
| 16 | 808-inspired synthesis | MID TOM |
