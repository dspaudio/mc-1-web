# Provenance

MC-1 original C sound engines, presets, sequencer, effects, renderer and storage: Copyright (C) 2026 dspaudio, GPL-3.0-only. Exact source revision and hashes in CORE.json.

The FM-1 faceplate, keyboard/knob/LED mapping, responsive layout, IndexedDB and AudioWorklet infrastructure in site/ are adapted from dspaudio/orbit-web-emu at 533f6ca9a97110249577427752475fb3381fbf40 (GPL-3.0-only), itself derived from sabliran/sloop-web-emu at bbfd8e5b3bfc452520f61afb0d94e2fdfe93fd9d. Upstream source notices are retained. See README-UPSTREAM.md. Modifications replace firmware selection, bind the MC-1 core, isolate storage, and remove unrelated ROMs and MIDI integration.

No upstream compiled firmware, icon assets or proprietary ROM data are distributed. The browser adapter src/mc1_wasm.c is original integration code for the inherited emulator interface. It uses MC-1's actual UI and flash record implementation.

The 16 recorded instrument sources are from VS Chamber Orchestra Community Edition by Versilian Studios, recorded by Sam Gossner & Simon Dalzell, with sample cutting by Elan Hickler/Soundemote. They are released under CC0-1.0; see [the retained license](core/LICENSES/CC0-VSCO.txt). The [sample manifest](core/assets/recorded/manifest.json) records the pinned source revision, original file hashes, pitch centers and conversion settings. MC-1 converts these recordings to mono PCM with sustain loops and filtered playback levels; they supply 64 presets. The original recordings and conversion tool are retained in the [firmware repository](https://github.com/dspaudio/mc-1). Code remains GPL-3.0-only.
