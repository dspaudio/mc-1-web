/* SPDX-License-Identifier: GPL-3.0-only */
/* One acknowledged batch bounds traffic while the audio thread is suspended. */
class McMidiConnection {
    constructor({getNode, navigator, input, output, button, status}) {
        Object.assign(this, {getNode, navigator, input, output, button, status});
        this.access = this.inPort = this.outPort = null;
        this.pending = []; this.inFlight = false; this.epoch = 0;
        this.generation = 0; this.inputGeneration = 0; this.outputGeneration = 0;
        button.addEventListener('click', () => this.access || this.connecting ? this.disconnect() : this.connect());
        input.addEventListener('change', () => this.selectInput());
        output.addEventListener('change', () => this.selectOutput());
        this.refresh();
    }
    say(message) { this.status.textContent = message; }
    resetInput() {
        this.pending.length = 0; this.inFlight = false; this.epoch++;
        this.getNode()?.port.postMessage({t:'midi-reset', epoch:this.epoch});
    }
    flush() {
        const node = this.getNode();
        if (!node || this.inFlight || !this.pending.length) return;
        this.inFlight = true;
        node.port.postMessage({t:'midi-input', epoch:this.epoch, messages:this.pending.splice(0,64)});
    }
    receive(data) {
        if (!this.getNode()) { this.say('MIDI input ready; POWER ON to hear notes'); return; }
        const bytes = Array.from(data);
        const status = bytes[0];
        const length = status >= 0xf8 ? 1 : status >= 0x80 && status < 0xf0 ? ((status & 0xe0) === 0xc0 ? 2 : 3) : 0;
        if (!length || bytes.length !== length || bytes.some((b,i) => !Number.isInteger(b) || b < 0 || b > (i ? 127 : 255))) return;
        if (this.pending.length >= 256) {
            this.resetInput(); this.say('MIDI input overflow; notes released'); return;
        }
        this.pending.push(bytes); this.flush();
    }
    message(m) {
        if (m.t === 'midi-ack' && m.epoch === this.epoch) { this.inFlight = false; this.flush(); }
        if (m.t === 'midi-output') {
            this.getNode()?.port.postMessage({t:'midi-output-ack'});
            if (!this.outPort) return;
            try {
                for (const packed of m.messages) {
                    const n = packed >>> 24;
                    if (n >= 1 && n <= 3) this.outPort.send(Array.from({length:n}, (_,i) => packed >>> (i*8) & 255));
                }
            } catch (error) { this.say('MIDI output failed: ' + error.message); this.releaseOutput(); }
        }
        if (m.t === 'midi-overflow') this.say('MIDI queue overflow; notes released');
    }
    refresh() {
        for (const [element, ports] of [[this.input,this.access?.inputs],[this.output,this.access?.outputs]]) {
            const selected = element.value;
            element.replaceChildren(new Option('None', ''));
            if (ports) for (const port of ports.values()) if (port.state === 'connected') element.add(new Option(port.name || port.id,port.id));
            element.value = [...element.options].some(o => o.value === selected) ? selected : '';
            element.disabled = !this.access;
        }
        this.button.textContent = this.access || this.connecting ? 'Disconnect MIDI' : 'Connect MIDI';
    }
    async connect() {
        if (!this.navigator.requestMIDIAccess) { this.say('Web MIDI is unavailable in this browser'); return; }
        const generation = ++this.generation;
        this.connecting = true; this.refresh(); this.say('Requesting MIDI permission…');
        try {
            const access = await this.navigator.requestMIDIAccess({sysex:false});
            if (generation !== this.generation) return;
            this.access = access;
            access.onstatechange = () => {
                if (this.inPort?.state === 'disconnected') { this.inPort.onmidimessage = null; this.inPort = null; this.resetInput(); this.say('MIDI input disconnected; notes released'); }
                if (this.outPort?.state === 'disconnected') { this.releaseOutput(); this.say('MIDI output disconnected'); }
                this.refresh();
            };
            this.say('Choose MIDI input and output ports');
        } catch (error) { if (generation === this.generation) this.say('Cannot connect MIDI: ' + error.message); }
        finally { if (generation === this.generation) { this.connecting = false; this.refresh(); } }
    }
    async selectInput() {
        const generation = ++this.inputGeneration;
        if (this.inPort) { this.inPort.onmidimessage = null; this.inPort.close().catch(() => {}); this.inPort = null; }
        this.resetInput();
        const port = this.access?.inputs.get(this.input.value);
        if (!port) return;
        try {
            await port.open();
            if (generation !== this.inputGeneration || !this.access || port.state !== 'connected') {
                if (!this.access || this.input.value !== port.id || port.state !== 'connected') await port.close();
                return;
            }
            this.inPort = port;
            port.onmidimessage = event => this.receive(event.data);
            this.say('MIDI input: ' + (port.name || port.id));
        } catch (error) { if (generation === this.inputGeneration) this.say('Cannot open MIDI input: ' + error.message); }
    }
    releaseOutput() {
        if (!this.outPort) return;
        const port = this.outPort; this.outPort = null;
        try { port.clear(); for (let channel=0; channel<16; channel++) { port.send([0xb0|channel,64,0]); port.send([0xb0|channel,123,0]); } } catch (_) {}
        port.close().catch(() => {});
    }
    async selectOutput() {
        const generation = ++this.outputGeneration;
        this.releaseOutput();
        const port = this.access?.outputs.get(this.output.value);
        if (!port) return;
        try {
            await port.open();
            if (generation !== this.outputGeneration || !this.access || port.state !== 'connected') {
                if (!this.access || this.output.value !== port.id || port.state !== 'connected') await port.close();
                return;
            }
            this.outPort = port; this.say('MIDI output: ' + (port.name || port.id));
        } catch (error) { if (generation === this.outputGeneration) this.say('Cannot open MIDI output: ' + error.message); }
    }
    disconnect() {
        this.generation++; this.inputGeneration++; this.outputGeneration++;
        this.connecting = false;
        if (this.access) this.access.onstatechange = null;
        if (this.inPort) { this.inPort.onmidimessage = null; this.inPort.close().catch(() => {}); this.inPort = null; }
        this.releaseOutput(); this.access = null; this.resetInput(); this.refresh(); this.say('MIDI disconnected');
    }
}
