import { describe, it, expect } from 'vitest';
import {
    evaluateExpression,
    evaluateBooleanCondition,
    evaluateNumericExpression
} from './safeExpression';

describe('evaluateBooleanCondition — real stability conditions', () => {
    const vars = { stress: 85, energy: 25, runway: 2, isolation_level: 75, focus_time: 60, balance: 20 };

    it('evaluates the actual default-model conditions correctly', () => {
        expect(evaluateBooleanCondition('stress > 80 && energy < 30', vars)).toBe(true);
        expect(evaluateBooleanCondition('runway < 3', vars)).toBe(true);
        expect(evaluateBooleanCondition('isolation_level > 70', vars)).toBe(true);
        expect(evaluateBooleanCondition('focus_time > 50 && balance < 30', vars)).toBe(true);
    });

    it('handles false branches and || / parentheses', () => {
        expect(evaluateBooleanCondition('stress > 90', vars)).toBe(false);
        expect(evaluateBooleanCondition('stress > 90 || energy < 30', vars)).toBe(true);
        expect(evaluateBooleanCondition('(stress > 90 || energy < 30) && runway < 3', vars)).toBe(true);
    });

    it('supports all comparison operators', () => {
        expect(evaluateBooleanCondition('energy >= 25', vars)).toBe(true);
        expect(evaluateBooleanCondition('energy <= 25', vars)).toBe(true);
        expect(evaluateBooleanCondition('energy == 25', vars)).toBe(true);
        expect(evaluateBooleanCondition('energy != 25', vars)).toBe(false);
    });

    it('fails closed (false) on unknown identifiers and garbage', () => {
        expect(evaluateBooleanCondition('nonexistent > 5', vars)).toBe(false);
        expect(evaluateBooleanCondition('!!!', vars)).toBe(false);
        expect(evaluateBooleanCondition('', vars)).toBe(false);
    });
});

describe('evaluateNumericExpression — custom effect math', () => {
    it('evaluates arithmetic over `value`', () => {
        expect(evaluateNumericExpression('value * 2', { value: 10 })).toBe(20);
        expect(evaluateNumericExpression('100 - value', { value: 30 })).toBe(70);
        expect(evaluateNumericExpression('value ^ 2', { value: 4 })).toBe(16);
        expect(evaluateNumericExpression('(value + 10) / 2', { value: 30 })).toBe(20);
    });

    it('respects operator precedence and right-assoc power', () => {
        expect(evaluateNumericExpression('2 + 3 * 4', {})).toBe(14);
        expect(evaluateNumericExpression('2 ^ 3 ^ 2', {})).toBe(512); // 2^(3^2)
        expect(evaluateNumericExpression('-value', { value: 5 })).toBe(-5);
    });

    it('guards divide/mod by zero (returns 0, no Infinity/NaN)', () => {
        expect(evaluateNumericExpression('value / 0', { value: 10 })).toBe(0);
        expect(evaluateNumericExpression('value % 0', { value: 10 })).toBe(0);
    });

    it('fails closed (0) on errors and non-finite results', () => {
        expect(evaluateNumericExpression('value *', { value: 5 })).toBe(0);
        expect(evaluateNumericExpression('unknownVar', {})).toBe(0);
    });
});

describe('security — arbitrary JS is NOT executed', () => {
    // These are the kinds of strings a malicious/LLM-authored model could carry.
    // Under the old `new Function` they would execute; here they must be rejected
    // (boolean → false, numeric → 0), never run.
    const attacks = [
        'process.exit(1)',
        'globalThis.alert(1)',
        'value.constructor.constructor("return 1")()',
        'fetch("https://evil.example")',
        '(() => 1)()',
        'window.location = "x"',
        'this',
        'value; throw new Error("x")',
        'value.toString'
    ];

    it('rejects property access, calls, and globals in boolean context', () => {
        for (const a of attacks) {
            expect(evaluateBooleanCondition(a, { value: 1 })).toBe(false);
        }
    });

    it('rejects them in numeric context too', () => {
        for (const a of attacks) {
            expect(evaluateNumericExpression(a, { value: 1 })).toBe(0);
        }
    });

    it('evaluateExpression throws (not silently runs) on disallowed syntax', () => {
        expect(() => evaluateExpression('value.constructor', { value: 1 })).toThrow();
        expect(() => evaluateExpression('alert(1)', { value: 1 })).toThrow();
        expect(() => evaluateExpression('a = 5', { value: 1 })).toThrow();
    });
});
