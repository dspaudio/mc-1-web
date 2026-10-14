# MC-1 web emulator 0.1.0

An FM-1 faceplate emulator running the original MC-1 C DSP, sequencer, UI and A/B project storage in an AudioWorklet. Adapted from [dspaudio/orbit-web-emu](https://github.com/dspaudio/orbit-web-emu).

Only MC-1 is included. No SLOOP, Felucca or ORBIT firmware binaries or selector. Browser flash uses its own `mc1-emu-v1` IndexedDB database.

Press POWER ON, then PLAY. For NEON SPIRAL: stop, GLO twice, KNOB4 clockwise, PLAY. HOME then FX opens four master effects. SELECT chooses a part; ALGORITHM chooses a melodic preset. PRESETS queues patterns. SAVE twice while stopped stores the project locally; reload restores it.

Build with clang/LLD (wasm32), Python 3 and Node: `python3 tools/check_core.py && python3 tools/build.py`. Serve `build/` over HTTPS or localhost. The workflow performs native/WASM audio parity and AudioWorklet input/storage checks, then deploys GitHub Pages. Build provenance lives in CORE.json and generated build-info.json.

Browser behavior is not FM-1 hardware verification. CPU timing, physical I/O, bootloader, calibration, USB/MIDI and real flash are not emulated. Hardware installation remains unverified. Browser saved data may be cleared by browser settings.

GPL-3.0-only; see [NOTICE.md](NOTICE.md). Original sound design, not affiliated with Roland or M-VAVE.

[Open the emulator](https://dspaudio.github.io/mc-1-web/)

## Complete factory preset list

48 original melodic presets: 36 LA-inspired and 12 303-inspired, plus 16 synthesized drum sounds. These are MC-1 presets, not Roland patch data.

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
