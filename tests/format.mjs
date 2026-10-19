// SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';

export const FORMAT = {
    patterns: 64, stepOffset: 92, trackFxOffset: 32860, presetOffset: 32876,
    automationCountOffset: 32928, eventsOffset: 32930, bodyBytes: 35117, recordBytes: 35137,
    fxSendOffset: 35114, fxTypeOffset: 35122,
    extraSendOffset: 35124, extraTypeOffset: 35132, analogOffset: 35134,
};
export function latestRecord(image) {
    const view = new DataView(image.buffer, image.byteOffset, image.byteLength);
    const slot = image.length / 2;
    const validA = view.getUint32(0, true) === 0x4d46434d;
    const validB = view.getUint32(slot, true) === 0x4d46434d;
    assert(validA || validB, 'at least one A/B record has committed');
    const offset = validB && (!validA || (view.getUint32(slot + 8, true) - view.getUint32(8, true) | 0) > 0) ? slot : 0;
    const record = image.slice(offset, offset + FORMAT.recordBytes);
    assert.equal(record[4], 8);
    assert.equal(record[6] + record[7] * 256, FORMAT.bodyBytes);
    return record;
}
export function events(record) {
    const count = record[FORMAT.automationCountOffset] + record[FORMAT.automationCountOffset + 1] * 256;
    return Array.from({ length: count }, (_, i) => {
        const offset = FORMAT.eventsOffset + i * 5;
        return [record[offset] + record[offset + 1] * 256, ...record.slice(offset + 2, offset + 5)];
    });
}
