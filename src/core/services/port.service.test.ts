import { describe, it, expect } from 'vitest';
import {
    arePortsCompatible,
    isTypeCompatible,
    convertData,
    convertWireData,
    validateWire,
    findPort,
    getInputPorts,
    getOutputPorts,
    getDefaultInputPort,
    getDefaultOutputPort,
    createJsonOutputPort,
    createTextOutputPort,
    createMediaOutputPort,
    createAnyInputPort,
    createJsonInputPort,
    createTextInputPort
} from './port.service';
import type { OmniBlockSchema, PortSchema } from '@/core/schemas/block.schema';

function schema(ports: PortSchema[]): OmniBlockSchema {
    // Only `ports` matters for these functions; cast the rest.
    return { ports } as unknown as OmniBlockSchema;
}

describe('port compatibility', () => {
    it('requires source=output and target=input', () => {
        const out = createJsonOutputPort('out');
        const inp = createAnyInputPort('in');
        expect(arePortsCompatible(out, inp)).toBe(true);
        // Reversed direction is invalid
        expect(arePortsCompatible(inp, out)).toBe(false);
        // Two outputs invalid
        expect(arePortsCompatible(out, createTextOutputPort('o2'))).toBe(false);
    });

    it('any input accepts every source type', () => {
        const anyIn = createAnyInputPort('in');
        expect(isTypeCompatible('json', anyIn)).toBe(true);
        expect(isTypeCompatible('text', anyIn)).toBe(true);
        expect(isTypeCompatible('media', anyIn)).toBe(true);
    });

    it('allows json<->text auto-conversion but rejects media into json/text', () => {
        const jsonIn = createJsonInputPort('in'); // accepts json + text
        const textIn = createTextInputPort('in'); // accepts text + json
        expect(isTypeCompatible('text', jsonIn)).toBe(true);
        expect(isTypeCompatible('json', textIn)).toBe(true);
        expect(isTypeCompatible('media', jsonIn)).toBe(false);
        expect(isTypeCompatible('media', textIn)).toBe(false);
    });

    it('media only flows into media or any', () => {
        const mediaIn: PortSchema = {
            id: 'in', direction: 'input', dataType: 'media', accepts: ['media']
        };
        expect(isTypeCompatible('media', mediaIn)).toBe(true);
        expect(isTypeCompatible('json', mediaIn)).toBe(false);
    });
});

describe('convertData', () => {
    it('passes through identical types and any', () => {
        expect(convertData({ a: 1 }, 'json', 'json')).toEqual({ success: true, data: { a: 1 } });
        expect(convertData('x', 'text', 'any')).toEqual({ success: true, data: 'x' });
    });

    it('stringifies json -> text', () => {
        const r = convertData({ a: 1 }, 'json', 'text');
        expect(r.success).toBe(true);
        expect(r.data).toBe(JSON.stringify({ a: 1 }, null, 2));
    });

    it('parses valid text -> json and fails on invalid', () => {
        expect(convertData('{"a":1}', 'text', 'json')).toEqual({ success: true, data: { a: 1 } });
        const bad = convertData('not json', 'text', 'json');
        expect(bad.success).toBe(false);
        expect(bad.error).toMatch(/Failed to parse JSON/);
    });

    it('rejects json/text -> media (needs explicit block)', () => {
        expect(convertData({}, 'json', 'media').success).toBe(false);
        expect(convertData('x', 'text', 'media').success).toBe(false);
    });

    it('convertWireData delegates to port data types', () => {
        const src = createJsonOutputPort('out');
        const tgt = createTextInputPort('in');
        const r = convertWireData({ a: 1 }, src, tgt);
        expect(r.success).toBe(true);
        expect(r.data).toBe(JSON.stringify({ a: 1 }, null, 2));
    });
});

describe('validateWire', () => {
    const source = schema([createJsonOutputPort('out')]);
    const anyTarget = schema([createAnyInputPort('in')]);
    const textTarget = schema([createTextInputPort('in')]);
    const mediaTarget = schema([
        { id: 'in', direction: 'input', dataType: 'media', accepts: ['media'] }
    ]);

    it('reports missing ports', () => {
        expect(validateWire(source, 'nope', anyTarget, 'in').valid).toBe(false);
        expect(validateWire(source, 'out', anyTarget, 'nope').error).toMatch(/not found/);
    });

    it('is valid with no conversion into an any port', () => {
        const v = validateWire(source, 'out', anyTarget, 'in');
        expect(v.valid).toBe(true);
        expect(v.requiresConversion).toBe(false);
    });

    it('is valid but flags conversion for json -> text', () => {
        const v = validateWire(source, 'out', textTarget, 'in');
        expect(v.valid).toBe(true);
        expect(v.requiresConversion).toBe(true);
        expect(v.conversionPath).toBe('json to text');
    });

    it('is invalid for incompatible json -> media', () => {
        const v = validateWire(source, 'out', mediaTarget, 'in');
        expect(v.valid).toBe(false);
        expect(v.error).toMatch(/Incompatible types/);
    });
});

describe('port utilities', () => {
    const s = schema([
        createJsonOutputPort('out', 'Data'),
        createTextOutputPort('alt'),
        createAnyInputPort('in'),
        createTextInputPort('in2')
    ]);

    it('finds ports and filters by direction', () => {
        expect(findPort(s, 'out')?.dataType).toBe('json');
        expect(getOutputPorts(s)).toHaveLength(2);
        expect(getInputPorts(s)).toHaveLength(2);
    });

    it('resolves default in/out ports by conventional id', () => {
        expect(getDefaultOutputPort(s)?.id).toBe('out');
        expect(getDefaultInputPort(s)?.id).toBe('in');
    });

    it('media output port helper produces a media output', () => {
        const m = createMediaOutputPort('m');
        expect(m.direction).toBe('output');
        expect(m.dataType).toBe('media');
    });
});
