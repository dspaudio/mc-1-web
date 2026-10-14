# MC-1 web emulator 0.1.0

An FM-1 faceplate emulator running the original MC-1 C DSP, sequencer, UI and A/B project storage in an AudioWorklet. Adapted from [dspaudio/orbit-web-emu](https://github.com/dspaudio/orbit-web-emu).

Only MC-1 is included. No SLOOP, Felucca or ORBIT firmware binaries or selector. Browser flash uses its own `mc1-emu-v1` IndexedDB database.

Press POWER ON, then PLAY. For NEON SPIRAL: stop, GLO twice, KNOB4 clockwise, PLAY. HOME then FX opens four master effects. SELECT chooses a part; ALGORITHM chooses a melodic preset. PRESETS queues patterns. SAVE twice while stopped stores the project locally; reload restores it.

Build with clang/LLD (wasm32), Python 3 and Node: `python3 tools/check_core.py && python3 tools/build.py`. Serve `build/` over HTTPS or localhost. The workflow performs native/WASM audio parity and AudioWorklet input/storage checks, then deploys GitHub Pages. Build provenance lives in CORE.json and generated build-info.json.

Browser behavior is not FM-1 hardware verification. CPU timing, physical I/O, bootloader, calibration, USB/MIDI and real flash are not emulated. Hardware installation remains unverified. Browser saved data may be cleared by browser settings.

GPL-3.0-only; see [NOTICE.md](NOTICE.md). Original sound design, not affiliated with Roland or M-VAVE.
