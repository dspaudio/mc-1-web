# MC-1 web emulator 1.2.0

**Rebuilt LA-PCM engine. All 112 LA sounds replaced.**

An FM-1 faceplate emulator running the original MC-1 C DSP, sequencer, UI and A/B project storage in an AudioWorklet. Adapted from [dspaudio/orbit-web-emu](https://github.com/dspaudio/orbit-web-emu).

Only MC-1 is included. No SLOOP, Felucca or ORBIT firmware binaries or selector. Browser flash uses its own `mc1-emu-v1` IndexedDB database.

## New in 1.2.0

- Replaced all 112 LA patch definitions, including the 48 formerly mathematical patches, with real recorded attacks and source-derived synthesized harmonic sustain. The 128 names, symbolic IDs and category positions are retained. Earlier LA audio is historical, not bit-identical to this bank.
- 24 zones cover 17 CC0-1.0 instrument families: six Meta Open Sound piano zones, three Meta nylon-guitar zones and 15 VSCO 2 Community Edition families. Each LA sound combines a real attack with two same-phase spectral sustain frames, not a generic saw/square blend. Plucked sources keep natural decay; organ, strings and winds keep held sustain. PCM mix controls attack contribution; it no longer selects a sample-only sustained loop.
- The 16 original Acid patch definitions and all eight synthesized drum kits are unchanged. Project format v8, A/B storage, four FX banks, Analog, eight melodic voices and six drum voices remain available. Current shared reverb and the bit-identical 32-sample attack cache optimization are mirrored from the validated firmware core. Browser checks do not establish device deadlines.
- Current sample hashes and processing: [hybrid manifest](core/assets/hybrid/manifest.json). Retained licenses: [Meta](core/LICENSES/CC0-Meta.txt) and [VSCO](core/LICENSES/CC0-VSCO.txt); [NOTICE.md](NOTICE.md) distinguishes sample and code licensing.

## New in 1.1.0

- Four shared eight-type FX banks: R/D1, C/F1, R/D2 and C/F2, with four independent sends per part. All four knobs work on SENDS and TYPES; ENV switches pages.
- GLO adds ANALOG after MIDI. Knob 1 sets independent melodic-part Analog variance (0-127, zero off); drums are excluded.
- White 6x9 small text, flowing green underlines beneath populated playback rows, and the current shared panel LED behavior: menu/OCT lights, 2 Hz selected-menu blinking and tempo-driven PLAY pulses. HOME stays lit during playback.
- Refreshed PCM-forward demos, current mono/legato behavior and MIDI control routing from the authoritative C core; eight melodic and six drum voices remain unchanged.
- Project format v8 retains both 36 KiB A/B banks and imports earlier formats, including v7. Existing sends/types survive; new sends and Analog start at zero on older projects. SAVE upgrades to v8; older firmware cannot read v8. The IndexedDB name and storage key are unchanged.
- MC-1 1.1.0 hardware supports dual-core synthesis/FX processing. The browser uses the same synthesis/UI semantics in one AudioWorklet, not a physical second CPU; WL82 CPU1 timing, timeout and failure behavior are not emulated. Host speed does not establish device deadlines.

`CORE.json` pins firmware commit `10a2240d7f3c63e3ed551774a8e17fb24ed002b8`.
All 24 shared-file hashes match that source, including the hybrid audio bank,
current manifest and retained licenses. `build-info.json` embeds the same
provenance. The physical firmware passed its own real-device validation;
browser speed is not hardware timing evidence.

## New in 1.0.1

- Stronger shared ROOM/HALL/PLATE reverb; new projects use ROOM2 with R/D sends 12/72/24/8 and dry C/F sends. Both built-in demos use PART2 R/D send 112.
- GLOBAL MIXER uses ENV to switch LEVEL/PAN; all four knobs control the four parts. OCT+ remains octave transpose.
- Removed the lower duplicate NEXT indicator; the upper current/next pattern display remains.
- Existing stored projects retain their values, v7 migration and eight melodic/six drum voices.

## New in 1.0.0

Two shared eight-type FX banks (R/D and C/F), independent part sends, SENDS/TYPES controls and version 7 project migration match the physical MC-1. The optimized C core retains eight melodic voices and six drum voices; browser speed is not the device timing evidence. See the firmware validation record for measured package hashes and workloads.

This repository and its Pages build run only the emulator. Physical firmware
installation belongs to the [MC-1 product site](https://dspaudio.github.io/mc-1/),
maintained by the firmware repository; it is not bundled or downloaded here.

## Added and changed in 0.3.0

- SONG mode arranges the 64 patterns with per-entry repeat counts and optional looping.
- MIDI ports opens an explicit Connect MIDI permission request. Select an input
  and output independently; Disconnect MIDI releases notes and closes both ports.
- Incoming notes, sustain, CC, program changes and pitch bend reach the same C
  engine as the panel. REC with PLAY records incoming notes. Track channels and
  clock source are configured on the shared GLO MIDI page; browser input is USB.
- Sequencer and panel notes, controller changes and transport/clock can be sent
  to the selected output. Incoming messages are not echoed back.
- Input and output batches are acknowledged and bounded. Input overflow and
  unplugging release held notes; output overflow uses the core's all-notes-off recovery.
- Web MIDI needs a supporting browser, a secure origin and permission. It uses
  MIDI ports already exposed by the OS, including paired BLE MIDI ports when
  available. It does not scan or connect directly to Bluetooth devices.
- Browser audio remains stereo output through the OS audio device selected by
  the browser/system. This web emulator does not emulate a USB Audio device.
- Format v6 saves song and MIDI settings in the existing two 36 KiB banks.

See the [Web MIDI specification](https://www.w3.org/TR/webmidi/) for the browser API.

## Added and changed in 0.2.0

- Every project starts with 64 patterns, each containing 16 steps on four parts.
- ALGORITHM selects or queues patterns 1–64, wrapping at either end.
- Recording, step editing and parameter automation work on every pattern.
- GLO → GROOVE CONTROL → KNOB4 toggles METRO. The metronome clicks only while
  PLAY and REC are both active, including with all tracks muted. It defaults OFF
  and saves with the project.
- Format v5 stores the complete project in two 36 KiB flash banks.
- The master output has six times the former gain range and starts at full scale.
  A shared C stereo limiter contains peaks; the browser adds no separate gain.
- Previous development browser saves are not migrated. A size mismatch starts
  a fresh project and displays a notice; the old save is not overwritten until SAVE.

## Added and changed in 0.1.4

- Added faster encoder turns and a large PRESETS list that applies the selection
  immediately and closes after 500 ms without another turn.
- Added four delay, four reverb, four drive and three modulation types, plus
  independent high-pass and low-pass filters for each track and the master.
- Added six arpeggiator modes with rate, octave, gate and latch controls, and
  recording of the generated notes into the sequencer.
- Added 384 step-quantized parameter automation events per project.
- Edited sounds retain their originating preset name with `*`. Bright green
  indicates playback and active states alongside orange selection highlights.
- Format v4 saves these settings and imports v1, v2 and v3 projects. Earlier
  firmware cannot load a project saved in v4.

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

## Song and MIDI

SEQ toggles SONG mode and stops transport. Press EDIT to unlock changes. The
four knobs set POS (1–128), PATTERN (1–64), REPEAT (1–16), LENGTH (0–128).
LFO toggles LOOP. LENGTH zero is an empty song and cannot play. Each entry runs
its pattern for the chosen number of bars; the final entry stops or loops.

From HOME, GLO five times opens MIDI I/O. Four knobs set track channels 1–16;
LFO cycles INTERNAL / USB / TRS clock. Select USB for external browser clock.
The firmware's BLE backend is unavailable; Web MIDI can use BLE MIDI ports only
when the operating system already exposes them.

## Controls

Press POWER ON, then PLAY. For NEON SPIRAL: stop, GLO three times, KNOB4 clockwise, PLAY. SELECT chooses a part; PRESETS chooses a melodic preset or, with DRUMS selected, a drum kit. ALGORITHM queues patterns on every part. SAVE twice while stopped stores the project locally; reload restores it, including the selected kit and effects.

PRESETS opens a large list of nearby sounds or drum kits. Each turn applies the
highlighted sound immediately; no confirmation is needed. The list closes after
500 ms without another turn, even while playback is stopped. Other encoder,
button or keyboard input closes it immediately.

Repeat a turn in the same direction within 60 ms to move continuous parameters
and the 128-sound and 64-pattern lists three times faster; tempo moves six times faster. Slow
turns, direction changes and switching controls return to one step. Short lists,
including parts and drum kits, always move one choice per step.

Effects use four global shared banks: R/D1, C/F1, R/D2 and C/F2.
HOME then FX opens FX SENDS for the selected part, including DRUMS. Knobs
1-4 adjust the four independent sends in that order, from 0-127 (zero dry).
ENV switches SENDS and TYPES. FX TYPES uses the same four knobs to select
each global bank type, clamped to 0-7. Both R/D banks share the R/D choices
below; both C/F banks share the C/F choices. The master has volume and limiter only.

| # | R/D | C/F |
|---|---|---|
| 0 | ROOM1 | CHORUS1 |
| 1 | ROOM2 | CHORUS2 |
| 2 | ROOM3 | CHORUS3 |
| 3 | HALL1 | CHORUS4 |
| 4 | HALL2 | FB CHORUS |
| 5 | PLATE | FLANGER |
| 6 | DELAY | SHORT DLY |
| 7 | PANNING DLY | FB SHORT DLY |

These are original fixed-point approximations, not Roland algorithm emulation.
Format v8 saves all four sends/types and Analog settings. Older projects are migrated on load:
R/D send takes the larger old delay or reverb amount, C/F send takes the old
modulation amount, and bank types map from the first part using that effect. Versions before v8
start with dry R/D2/C/F2 sends and Analog off; existing v7 sends/types remain.

Outside the mixer, ARP opens the selected melodic part's arpeggiator page;
press ARP again to return HOME. Knobs 1–4 select MODE, RATE, OCT and GATE.
MODE offers OFF, UP, DOWN, UP-DOWN, ORDER, RANDOM and CHORD. RATE offers quarter,
eighth and sixteenth notes; OCT spans 1–3 octaves and GATE spans 1–100%.
LFO toggles LATCH so notes continue after keys are released. Changing MODE or
LATCH releases the current held notes; press keys again to play. With PLAY and
REC enabled, the generated notes are recorded into the pattern, including tied
steps for longer gates. The arpeggiator is available on the three melodic parts.

GLO cycles through GLOBAL MIXER, GROOVE CONTROL, DEMO LIBRARY, KNOB AUTOMATION, MIDI I/O and ANALOG.
On ANALOG, SELECT chooses a melodic part and knob 1 adjusts its variance from
0-127; zero disables it. The other three knobs and the drum part are inactive. In the mixer,
ENV switches LEVEL and PAN; the four knobs adjust PART 1, PART 2, PART 3 and DRUMS independently. PAN runs from 0 (left) through 64 (center) to 127 (right). Entering the mixer starts in LEVEL.
SELECT chooses a part and ARP mutes it; the mixer displays the selected values and mute state.
The mixer reminder reads `SELECT-ARP to mute`.

To record knob automation, enable PLAY and REC, then turn sound, mixer or effect
controls. Values are quantized to the current sixteenth-note step and replayed
with that pattern. The 384-event capacity is shared by all 64 patterns, four
tracks and the master; changing the same parameter at the same step replaces
its event. KNOB AUTOMATION shows the count and recording state. EDIT on this
page clears only the current pattern's automation. At capacity, existing events
can still be changed; a new event shows AUTOMATION FULL and is not recorded.

An edited sound keeps its originating preset name with `*`; restoring the
original parameters removes the marker. The name and marker survive save/load.
Older custom patches with no recoverable preset name display IMPORTED SOUND.
HOME shows pitch marks inside melodic steps so phrase changes remain visible
even when their rhythms match. Above the knobs, PATTERN shows the current pattern
while the upper current/next display shows a queued change until the bar boundary. Status messages take priority.
Orange marks selections. Flowing bright green underlines follow playback below
populated melodic tracks and drum rows; empty or muted rows have no underline.
Bright green also marks enabled ARP/LATCH states. PLAY pulses green
at the sequencer tempo; selected menus blink at 2 Hz. Menu and OCT buttons are
lit, with HOME steady during playback. The sixteen white
key LEDs show sequencer steps in bright green.

OCT− / OCT+ transpose the melodic keyboard by one octave, up to three octaves
in either direction. Both buttons remain lit. Hold OCT− and use the first four
black keys to select a bank, then a white key to select one of its 16 patterns.
During playback, the sixteen white keys show the sixteen sequencer steps.

Build with clang/LLD (wasm32), Python 3 and Node: `python3 tools/check_core.py && python3 tools/build.py`. Serve `build/` over HTTPS or localhost. The workflow performs native/WASM audio parity and AudioWorklet input/storage checks, MIDI port lifecycle tests and actual-worklet song/MIDI parity, then deploys GitHub Pages. `tests/native_midi.c` produces `build/midi-native.json` for `node tests/midi-worklet.mjs`; `node tests/midi.mjs` runs permission, hotplug, disconnect and queue scenarios without a browser. Build provenance lives in CORE.json and generated build-info.json.

On macOS, Apple's system clang may lack wasm32. With an existing Homebrew LLVM,
use `PATH=/opt/homebrew/opt/llvm/bin:$PATH CLANG=/opt/homebrew/opt/llvm/bin/clang python3 tools/build.py`.
For local production use, run `python3 -m http.server 8093 --bind 127.0.0.1 --directory build`
and open `http://127.0.0.1:8093/`.

POWER ON stays available if audio startup fails, displays the failure, and allows
a retry. Startup must receive the AudioWorklet ready response within ten seconds.
CI also checks startup failure/retry handling in Node, octave transposition,
the sixteen white-key step LEDs, preset and kit selection boundaries, distinct
kit audio, kit save/reboot, independent track effects and older project imports.
All 112 source-backed LA presets across 17 families are checked for native/WASM PCM parity
before and after saving and reloading.
Timestamped control tests also check acceleration, popup selection and the
500 ms deadline through both the C UI and real AudioWorklet message handling.
Performance tests cover all four FX banks, Analog, ARP recording, automation
capacity/replay/clearing, preset-name preservation and v8 save/load.
Native/WASM PCM comparison covers all 32 bank/type choices with Analog enabled.
Actual-worklet tests also verify v7 import without writes, explicit A/B upgrade
to v8 and all four banks' wire-format fields.
These checks do not establish browser rendering or physical-device behavior.

Browser behavior is not FM-1 hardware verification. CPU timing, physical I/O, bootloader, calibration, physical USB/TRS/BLE transports and real flash are not emulated. Web MIDI routes OS ports to the C MIDI engine; it does not validate FM-1 hardware MIDI or USB Audio. Hardware installation remains unverified. Browser saved data may be cleared by browser settings.

Software: GPL-3.0-only; see [NOTICE.md](NOTICE.md). Recorded instrument samples:
CC0-1.0, credited below. Not affiliated with Roland or M-VAVE.

[Open the emulator](https://dspaudio.github.io/mc-1-web/)

## Complete factory preset list

128 melodic presets: 112 source-backed LA hybrid PCM patches and 16 original Acid patches. The 17 source families cover 24 recorded zones; eight original synthesized drum kits with 16 lanes each are unchanged. Legacy PCM IDs remain accepted for saved patches. The
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
| 01 | LA hybrid PCM | ROUND BASS | Bass | VSCO 2 CE: Contrabass |
| 02 | LA hybrid PCM | DEEP CELL | Bass | VSCO 2 CE: Cello section |
| 03 | LA hybrid PCM | CLUB PULSE | Bass | VSCO 2 CE: Organ |
| 04 | LA hybrid PCM | CLICK FLOOR | Bass | VSCO 2 CE: Xylophone |
| 05 | LA hybrid PCM | WIRE PICK | Bass | Meta Open Sound: Nylon guitar |
| 06 | LA hybrid PCM | DUB CHAMBER | Bass | VSCO 2 CE: Contrabass |
| 07 | LA hybrid PCM | CONTRABASS ROOT | Bass | VSCO 2 CE: Contrabass |
| 08 | LA hybrid PCM | CONTRABASS ROUND | Bass | VSCO 2 CE: Contrabass |
| 09 | LA hybrid PCM | CONTRABASS SNAP | Bass | VSCO 2 CE: Contrabass |
| 10 | LA hybrid PCM | CELLO LOW BOW | Bass | VSCO 2 CE: Cello section |
| 11 | LA hybrid PCM | CELLO BASS PULSE | Bass | VSCO 2 CE: Cello section |
| 12 | LA hybrid PCM | BASSOON ROOT | Bass | VSCO 2 CE: Bassoon |

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
| 29 | LA hybrid PCM | VECTOR LEAD | Lead | VSCO 2 CE: Trumpet |
| 30 | LA hybrid PCM | WIDE SAW | Lead | VSCO 2 CE: Solo violin |
| 31 | LA hybrid PCM | SOFT PIPE | Lead | VSCO 2 CE: Flute |
| 32 | LA hybrid PCM | POLY CHROME | Poly synth | VSCO 2 CE: Trumpet |
| 33 | LA hybrid PCM | TRUMPET LEAD | Lead | VSCO 2 CE: Trumpet |
| 34 | LA hybrid PCM | HORN SOLO | Lead | VSCO 2 CE: French horn |
| 35 | LA hybrid PCM | FLUTE LEAD | Lead | VSCO 2 CE: Flute |
| 36 | LA hybrid PCM | FLUTE SOFT ARC | Lead | VSCO 2 CE: Flute |
| 37 | LA hybrid PCM | OBOE BRIGHT | Lead | VSCO 2 CE: Oboe |
| 38 | LA hybrid PCM | OBOE SOLO | Lead | VSCO 2 CE: Oboe |
| 39 | LA hybrid PCM | CLARINET ARC | Lead | VSCO 2 CE: Clarinet |
| 40 | LA hybrid PCM | CLARINET BRIGHT | Lead | VSCO 2 CE: Clarinet |

### Sequence (41–50)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 41 | LA hybrid PCM | SEQUENCE KEY | Sequence | Meta Open Sound: Piano |
| 42 | LA hybrid PCM | SPARK SEQ | Sequence | VSCO 2 CE: Glockenspiel |
| 43 | LA hybrid PCM | RATCHET PLUCK | Sequence | Meta Open Sound: Nylon guitar |
| 44 | LA hybrid PCM | PIANO STEPS | Sequence | Meta Open Sound: Piano |
| 45 | LA hybrid PCM | MARIMBA RUN | Sequence | VSCO 2 CE: Marimba |
| 46 | LA hybrid PCM | GLOCK GRID | Sequence | VSCO 2 CE: Glockenspiel |
| 47 | LA hybrid PCM | XYLO WALK | Sequence | VSCO 2 CE: Xylophone |
| 48 | LA hybrid PCM | HARP PATTERN | Sequence | VSCO 2 CE: Harp |
| 49 | LA hybrid PCM | CLARINET GATE | Sequence | VSCO 2 CE: Clarinet |
| 50 | LA hybrid PCM | VIOLIN PULSE | Sequence | VSCO 2 CE: Solo violin |

### Keys (51–60)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 51 | LA hybrid PCM | HAMMER KEY | Keys | Meta Open Sound: Piano |
| 52 | LA hybrid PCM | SOFT TINES | Keys | VSCO 2 CE: Glockenspiel |
| 53 | LA hybrid PCM | CLAVI CLICK | Keys | Meta Open Sound: Nylon guitar |
| 54 | LA hybrid PCM | VELVET CHORD | House keys | Meta Open Sound: Piano |
| 55 | LA hybrid PCM | AMBER PIANO | Keys | Meta Open Sound: Piano |
| 56 | LA hybrid PCM | PRISM KEY | Keys | VSCO 2 CE: Glockenspiel |
| 57 | LA hybrid PCM | PIANO FELT | Keys | Meta Open Sound: Piano |
| 58 | LA hybrid PCM | PIANO BRIGHT | Keys | Meta Open Sound: Piano |
| 59 | LA hybrid PCM | PIANO ROOM | Keys | Meta Open Sound: Piano |
| 60 | LA hybrid PCM | PIANO SHORT | Keys | Meta Open Sound: Piano |

### Organ (61–68)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 61 | LA hybrid PCM | DRAWBAR KEY | Organ | VSCO 2 CE: Organ |
| 62 | LA hybrid PCM | PERC ORGAN | Organ | VSCO 2 CE: Organ |
| 63 | LA hybrid PCM | CELLAR ORGAN | House organ | VSCO 2 CE: Organ |
| 64 | LA hybrid PCM | ORGAN MELLOW | Organ | VSCO 2 CE: Organ |
| 65 | LA hybrid PCM | ORGAN CHAPEL | Organ | VSCO 2 CE: Organ |
| 66 | LA hybrid PCM | ORGAN PERC | Organ | VSCO 2 CE: Organ |
| 67 | LA hybrid PCM | ORGAN FULL | Organ | VSCO 2 CE: Organ |
| 68 | LA hybrid PCM | ORGAN BRIGHT | Organ | VSCO 2 CE: Organ |

### Brass/Reed (69–76)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 69 | LA hybrid PCM | REED STACK | Reed | VSCO 2 CE: Oboe |
| 70 | LA hybrid PCM | BRASS BLOCK | Brass | VSCO 2 CE: Trumpet |
| 71 | LA hybrid PCM | SOFT HORNS | Brass | VSCO 2 CE: French horn |
| 72 | LA hybrid PCM | TRUMPET SECTION | Brass/Reed | VSCO 2 CE: Trumpet |
| 73 | LA hybrid PCM | HORN MELLOW | Brass/Reed | VSCO 2 CE: French horn |
| 74 | LA hybrid PCM | BASSOON REED | Brass/Reed | VSCO 2 CE: Bassoon |
| 75 | LA hybrid PCM | TRUMPET FANFARE | Brass/Reed | VSCO 2 CE: Trumpet |
| 76 | LA hybrid PCM | HORN LOW | Brass/Reed | VSCO 2 CE: French horn |

### Strings (77–82)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 77 | LA hybrid PCM | STRING VEIL | Strings | VSCO 2 CE: Viola section |
| 78 | LA hybrid PCM | VIOLIN BOW | Strings | VSCO 2 CE: Solo violin |
| 79 | LA hybrid PCM | VIOLA CHAMBER | Strings | VSCO 2 CE: Viola section |
| 80 | LA hybrid PCM | CELLO ENSEMBLE | Strings | VSCO 2 CE: Cello section |
| 81 | LA hybrid PCM | VIOLIN SILVER | Strings | VSCO 2 CE: Solo violin |
| 82 | LA hybrid PCM | CONTRABASS BOW | Strings | VSCO 2 CE: Contrabass |

### Pad (83–94)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 83 | LA hybrid PCM | SILK PAD | Pad | VSCO 2 CE: Viola section |
| 84 | LA hybrid PCM | SLOW HALO | Pad | VSCO 2 CE: French horn |
| 85 | LA hybrid PCM | BELL CLOUD | Pad | VSCO 2 CE: Glockenspiel |
| 86 | LA hybrid PCM | DUSK SCREEN | Pad | VSCO 2 CE: Cello section |
| 87 | LA hybrid PCM | AIR CHAMBER | Pad | VSCO 2 CE: Flute |
| 88 | LA hybrid PCM | PIANO CLOUD | Pad | Meta Open Sound: Piano |
| 89 | LA hybrid PCM | ORGAN HORIZON | Pad | VSCO 2 CE: Organ |
| 90 | LA hybrid PCM | VIOLIN HALO | Pad | VSCO 2 CE: Solo violin |
| 91 | LA hybrid PCM | VIOLA VEIL | Pad | VSCO 2 CE: Viola section |
| 92 | LA hybrid PCM | CELLO WARM PAD | Pad | VSCO 2 CE: Cello section |
| 93 | LA hybrid PCM | FLUTE AURORA | Pad | VSCO 2 CE: Flute |
| 94 | LA hybrid PCM | HORN SLOW PAD | Pad | VSCO 2 CE: French horn |

### Pluck (95–104)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 95 | LA hybrid PCM | NYLON PLUCK | Pluck | Meta Open Sound: Nylon guitar |
| 96 | LA hybrid PCM | THUMB PLUCK | Pluck | Meta Open Sound: Nylon guitar |
| 97 | LA hybrid PCM | WIRE ZITHER | Pluck | VSCO 2 CE: Harp |
| 98 | LA hybrid PCM | HARP BRIGHT | Pluck | VSCO 2 CE: Harp |
| 99 | LA hybrid PCM | HARP RAIN | Pluck | VSCO 2 CE: Harp |
| 100 | LA hybrid PCM | HARP MELLOW | Pluck | VSCO 2 CE: Harp |
| 101 | LA hybrid PCM | HARP THREAD | Pluck | VSCO 2 CE: Harp |
| 102 | LA hybrid PCM | PIANO PLUCK | Pluck | Meta Open Sound: Piano |
| 103 | LA hybrid PCM | MARIMBA PLUCK | Pluck | VSCO 2 CE: Marimba |
| 104 | LA hybrid PCM | XYLO PLUCK | Pluck | VSCO 2 CE: Xylophone |

### Mallet/Bell (105–112)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 105 | LA hybrid PCM | GLASS BELL | Bell | VSCO 2 CE: Glockenspiel |
| 106 | LA hybrid PCM | WOOD MALLET | Mallet | VSCO 2 CE: Marimba |
| 107 | LA hybrid PCM | GLASS TINES | Mallet | VSCO 2 CE: Glockenspiel |
| 108 | LA hybrid PCM | GLOCK BELL | Mallet/Bell | VSCO 2 CE: Glockenspiel |
| 109 | LA hybrid PCM | MARIMBA HOLLOW | Mallet/Bell | VSCO 2 CE: Marimba |
| 110 | LA hybrid PCM | GLOCK DROPS | Mallet/Bell | VSCO 2 CE: Glockenspiel |
| 111 | LA hybrid PCM | XYLO BAR | Mallet/Bell | VSCO 2 CE: Xylophone |
| 112 | LA hybrid PCM | MARIMBA ROUND | Mallet/Bell | VSCO 2 CE: Marimba |

### Voice (113–118)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 113 | LA hybrid PCM | VOWEL CHIME | Voice-like | VSCO 2 CE: Oboe |
| 114 | LA hybrid PCM | BREATH STACK | Voice-like | VSCO 2 CE: Flute |
| 115 | LA hybrid PCM | CHOIR FLICK | Voice-like | VSCO 2 CE: Clarinet |
| 116 | LA hybrid PCM | FLUTE CHOIR | Processed woodwind | VSCO 2 CE: Flute |
| 117 | LA hybrid PCM | OBOE VOWEL | Processed woodwind | VSCO 2 CE: Oboe |
| 118 | LA hybrid PCM | CLARINET VOICE | Processed woodwind | VSCO 2 CE: Clarinet |

### Hit/Percussion (119–123)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 119 | LA hybrid PCM | CHORD STAB | Stab | Meta Open Sound: Piano |
| 120 | LA hybrid PCM | BRASS IMPACT | Hit | VSCO 2 CE: Trumpet |
| 121 | LA hybrid PCM | TIMBER HIT | Percussion | VSCO 2 CE: Xylophone |
| 122 | LA hybrid PCM | TUBE STRIKE | Percussion | VSCO 2 CE: Glockenspiel |
| 123 | LA hybrid PCM | TRUMPET HIT | Hit/Percussion | VSCO 2 CE: Trumpet |

### Texture (124–128)

| # | Sound engine | Preset name | Family | Sound source |
|---|---|---|---|---|
| 124 | LA hybrid PCM | ORBITAL MT | Texture | VSCO 2 CE: French horn |
| 125 | LA hybrid PCM | METAL RAIN | Texture | VSCO 2 CE: Glockenspiel |
| 126 | LA hybrid PCM | SPACE SHARD | Texture | VSCO 2 CE: Glockenspiel |
| 127 | LA hybrid PCM | DIGITAL MIST | Texture | VSCO 2 CE: Flute |
| 128 | LA hybrid PCM | VIOLA DRIFT | Texture | VSCO 2 CE: Viola section |

## Recorded instrument sources

All 112 LA presets derive from 17 CC0-1.0 families: Piano and Nylon guitar from Meta Open Sound; Organ, Marimba, Glockenspiel, Xylophone, Harp, Solo violin, Viola section, Cello section, Contrabass, Flute, Oboe, Clarinet, Bassoon, Trumpet and French horn from VSCO 2 Community Edition. PCM IDs are 24–40 in that order. Voice presets are processed woodwinds, not human vocal recordings.

The [current manifest](core/assets/hybrid/manifest.json) records all 24 zones, source hashes, pitch metadata and attack/sustain processing. Meta recordings and metadata are credited to Meta Platforms, Inc., Creative Audio team; VSCO recordings to Sam Gossner & Simon Dalzell, sample cutting by Elan Hickler/Soundemote, Versilian Studios. [NOTICE.md](NOTICE.md) and the retained [Meta](core/LICENSES/CC0-Meta.txt) and [VSCO](core/LICENSES/CC0-VSCO.txt) licenses document the pinned sources. The [earlier VSCO manifest](core/assets/recorded/manifest.json) is retained for provenance; its piano is historical, not active.

These compact sounds use real attacks and synthesized spectral sustain, not full multisampled instruments or sustained recording loops. The original WAVs and generators remain in the firmware repository. The emulator build carries both licenses and both manifests as `samples-Meta-LICENSE.txt`, `samples-LICENSE.txt`, `hybrid-samples.json` and `recorded-samples.json`.

## Drum kits

Select DRUMS with SELECT, then turn PRESETS to choose a kit. ALGORITHM continues
to choose patterns. Kits share the sixteen lane roles below, so a pattern can be
played with any kit. Projects saved by older MC-1 versions load with BASE 808,
dry track effects and their original master effects; saving upgrades the project
to format v8.

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
