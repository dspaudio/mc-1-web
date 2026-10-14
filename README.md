# MC-1 web emulator 0.1.2

An FM-1 faceplate emulator running the original MC-1 C DSP, sequencer, UI and A/B project storage in an AudioWorklet. Adapted from [dspaudio/orbit-web-emu](https://github.com/dspaudio/orbit-web-emu).

Only MC-1 is included. No SLOOP, Felucca or ORBIT firmware binaries or selector. Browser flash uses its own `mc1-emu-v1` IndexedDB database.

## Added and changed in 0.1.2

- Expanded the melodic bank from 48 to 64 presets. New entries 49–64 add house
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
These checks do not establish browser rendering or physical-device behavior.

Browser behavior is not FM-1 hardware verification. CPU timing, physical I/O, bootloader, calibration, USB/MIDI and real flash are not emulated. Hardware installation remains unverified. Browser saved data may be cleared by browser settings.

GPL-3.0-only; see [NOTICE.md](NOTICE.md). Original sound design, not affiliated with Roland or M-VAVE.

[Open the emulator](https://dspaudio.github.io/mc-1-web/)

## Complete factory preset list

64 original melodic presets, 24 synthesized PCM attack sources and eight drum
kits with 16 lanes each. The [MC-505 factory patch list](https://cdn.roland.com/assets/media/pdf/MC505PTC.pdf)
is a reference for a varied groovebox sound palette; these are original MC-1
sounds, with no Roland samples or patch data.

| # | Sound engine | Preset name | Family |
|---|---|---|---|
| 01 | LA-inspired | VECTOR LEAD | Lead |
| 02 | LA-inspired | ROUND BASS | Bass |
| 03 | LA-inspired | SILK PAD | Pad |
| 04 | LA-inspired | GLASS BELL | Bell |
| 05 | LA-inspired | NYLON PLUCK | Pluck |
| 06 | LA-inspired | ORBITAL MT | Texture |
| 07 | 303-inspired | ACID SAW | Bass / lead |
| 08 | 303-inspired | SQUARE RUBBER | Bass / lead |
| 09 | 303-inspired | HIGH VOLTAGE | Lead |
| 10 | 303-inspired | SOFT STEP | Lead |
| 11 | LA-inspired | REED STACK | Reed |
| 12 | LA-inspired | METAL RAIN | Texture |
| 13 | LA-inspired | DEEP CELL | Bass |
| 14 | LA-inspired | CLUB PULSE | Bass |
| 15 | LA-inspired | CLICK FLOOR | Bass |
| 16 | LA-inspired | WIRE PICK | Bass |
| 17 | LA-inspired | DUB CHAMBER | Bass |
| 18 | 303-inspired | RESONA BASS | Bass |
| 19 | 303-inspired | LIQUID STEP | Bass |
| 20 | 303-inspired | BRIGHT COIL | Lead |
| 21 | 303-inspired | HOLLOW REED | Lead |
| 22 | 303-inspired | NEEDLE LINE | Lead |
| 23 | 303-inspired | BUBBLE RUN | Sequence |
| 24 | 303-inspired | VELVET MONO | Lead |
| 25 | 303-inspired | RAZOR MONO | Lead |
| 26 | LA-inspired | WIDE SAW | Lead |
| 27 | LA-inspired | SOFT PIPE | Lead |
| 28 | LA-inspired | SEQUENCE KEY | Sequence |
| 29 | LA-inspired | POLY CHROME | Poly synth |
| 30 | LA-inspired | BRASS BLOCK | Brass |
| 31 | LA-inspired | SOFT HORNS | Brass |
| 32 | LA-inspired | STRING VEIL | Strings |
| 33 | LA-inspired | SLOW HALO | Pad |
| 34 | LA-inspired | BELL CLOUD | Pad |
| 35 | LA-inspired | DUSK SCREEN | Pad |
| 36 | LA-inspired | AIR CHAMBER | Pad |
| 37 | LA-inspired | HAMMER KEY | Keys |
| 38 | LA-inspired | SOFT TINES | Keys |
| 39 | LA-inspired | CLAVI CLICK | Keys |
| 40 | LA-inspired | DRAWBAR KEY | Organ |
| 41 | LA-inspired | PERC ORGAN | Organ |
| 42 | LA-inspired | WOOD MALLET | Mallet |
| 43 | LA-inspired | GLASS TINES | Mallet |
| 44 | LA-inspired | THUMB PLUCK | Pluck |
| 45 | LA-inspired | WIRE ZITHER | Pluck |
| 46 | LA-inspired | CHORD STAB | Stab |
| 47 | LA-inspired | SPACE SHARD | Texture |
| 48 | LA-inspired | DIGITAL MIST | Texture |
| 49 | LA-inspired | CELLAR ORGAN | House organ |
| 50 | LA-inspired | VELVET CHORD | House keys |
| 51 | LA-inspired | AMBER PIANO | Keys |
| 52 | LA-inspired | PRISM KEY | Keys |
| 53 | LA-inspired | VOWEL CHIME | Voice-like |
| 54 | LA-inspired | BREATH STACK | Voice-like |
| 55 | LA-inspired | CHOIR FLICK | Voice-like |
| 56 | LA-inspired | BRASS IMPACT | Hit |
| 57 | LA-inspired | TIMBER HIT | Percussion |
| 58 | LA-inspired | TUBE STRIKE | Percussion |
| 59 | LA-inspired | SPARK SEQ | Sequence |
| 60 | LA-inspired | RATCHET PLUCK | Sequence |
| 61 | 303-inspired | ACID RIBBON | Bass / lead |
| 62 | 303-inspired | COIL WALK | Acid sequence |
| 63 | 303-inspired | SQUELCH GRID | Acid sequence |
| 64 | 303-inspired | RUBBER CHASE | Acid sequence |

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
