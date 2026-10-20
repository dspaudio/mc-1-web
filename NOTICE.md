# Provenance

MC-1 original C sound engines, presets, sequencer, effects, renderer and storage: Copyright (C) 2026 dspaudio, GPL-3.0-only. Source snapshot status and exact file hashes are in CORE.json; a pending snapshot is not a committed release pin.

The FM-1 faceplate, keyboard/knob/LED mapping, responsive layout, IndexedDB and AudioWorklet infrastructure in site/ are adapted from dspaudio/orbit-web-emu at 533f6ca9a97110249577427752475fb3381fbf40 (GPL-3.0-only), itself derived from sabliran/sloop-web-emu at bbfd8e5b3bfc452520f61afb0d94e2fdfe93fd9d. Upstream source notices are retained. See README-UPSTREAM.md. Modifications replace firmware selection, bind the MC-1 core, isolate storage, and remove unrelated ROMs, and route Web MIDI through the shared MC-1 engine.

No standalone ORBIT, SLOOP or Felucca product firmware, restricted icon assets or proprietary ROM data are distributed. The browser adapter src/mc1_wasm.c is original integration code for the inherited emulator interface. It uses MC-1's actual UI and flash record implementation.

### Version 1.2.0 replacement LA-PCM bank

All 112 LA presets now use real recorded attacks and source-derived synthesized
harmonic sustain. The active bank has 24 zones and 17 instrument families:

| Source | Active zones | Families | Recording license |
|---|---:|---|---|
| Meta Open Sound | 6 | Piano | CC0-1.0 |
| Meta Open Sound | 3 | Nylon guitar | CC0-1.0 |
| VSCO 2 Community Edition | 15 | Organ, Marimba, Glockenspiel, Xylophone, Harp, Solo violin, Viola section, Cello section, Contrabass, Flute, Oboe, Clarinet, Bassoon, Trumpet, French horn | CC0-1.0 |

The recorded attacks and generated harmonic audio arrays derive from these CC0
recordings. Firmware, generator code, original patch parameters and compositions
remain GPL-3.0-only; the CC0 provenance does not relicense that code. Conversely,
the recordings are not represented as original GPL mathematical waveforms.
All source hashes and processing settings are in `core/assets/hybrid/manifest.json`.
The retained VSCO piano is historical source material, not the active piano bank.


Meta Open Sound recordings and metadata: Meta Platforms, Inc., Creative Audio team, CC0-1.0; repository commit `e2ff154845994fe4135becc4d5b857c19f172784`, releases `meta-piano-v1.0.0` and `meta-nylon-guitar-v1.0.0`. See [the retained Meta license](core/LICENSES/CC0-Meta.txt).

VSCO 2 Community Edition: Versilian Studios, recorded by Sam Gossner & Simon Dalzell, sample cutting by Elan Hickler/Soundemote, CC0-1.0; recording commit `440300901dfe9275fd84e0b7763af1f8443ae62e`, active pitch metadata commit `6dd651d55dde97fd4028699be9d4481f26917891`. See [the retained VSCO license](core/LICENSES/CC0-VSCO.txt) and [historical sample manifest](core/assets/recorded/manifest.json). The retained VSCO piano is historical, not the active piano bank.

The [current manifest](core/assets/hybrid/manifest.json) retains exact source hashes and processing settings for all 24 zones. Original recordings and generators remain in the [firmware repository](https://github.com/dspaudio/mc-1); this emulator distributes their generated attacks and harmonic sustain in `core/src/hybrid_pcm.h`. `core/src/recorded_pcm.h` retains source-ID aliases. Code, original patch parameters, mathematical tables and compositions remain GPL-3.0-only; CC0 recordings and derived audio arrays retain their sample provenance. The 16 Acid definitions and all eight synthesized drum kits are unchanged.
