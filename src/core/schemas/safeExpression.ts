// ============================================
// PROJECT OMNI: SAFE EXPRESSION EVALUATOR
// A tiny, allowlist-only parser for stability conditions and custom-effect
// expressions. Replaces the previous `new Function(...)` (== eval) usage, which
// executed arbitrary JS from user- and LLM-authored strings.
//
// Grammar (recursive descent, no eval):
//   expr    := or
//   or      := and ('||' and)*
//   and     := compare ('&&' compare)*
//   compare := add (('>=' | '<=' | '==' | '!=' | '>' | '<') add)?
//   add     := mul (('+' | '-') mul)*
//   mul     := pow (('*' | '/' | '%') pow)*
//   pow     := unary ('^' unary)*          // right-assoc
//   unary   := ('-' | '!') unary | primary
//   primary := number | identifier | '(' expr ')'
//
// Only identifiers supplied in `vars` resolve; unknown identifiers throw.
// No property access, function calls, assignment, or statements are possible.
// ============================================

type TokenType = 'num' | 'ident' | 'op' | 'lparen' | 'rparen';
interface Token {
    type: TokenType;
    value: string;
}

const OPERATORS = ['>=', '<=', '==', '!=', '&&', '||', '>', '<', '+', '-', '*', '/', '%', '^', '!'];

function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < input.length) {
        const ch = input[i];

        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
            i++;
            continue;
        }

        if (ch === '(') { tokens.push({ type: 'lparen', value: '(' }); i++; continue; }
        if (ch === ')') { tokens.push({ type: 'rparen', value: ')' }); i++; continue; }

        // Number (integer or decimal)
        if ((ch >= '0' && ch <= '9') || (ch === '.' && /[0-9]/.test(input[i + 1] ?? ''))) {
            let num = '';
            while (i < input.length && /[0-9.]/.test(input[i])) { num += input[i]; i++; }
            if ((num.match(/\./g) || []).length > 1) throw new Error(`Invalid number: ${num}`);
            tokens.push({ type: 'num', value: num });
            continue;
        }

        // Identifier (attribute name, or the special 'value' for custom effects)
        if (/[a-zA-Z_]/.test(ch)) {
            let ident = '';
            while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) { ident += input[i]; i++; }
            tokens.push({ type: 'ident', value: ident });
            continue;
        }

        // Multi-char then single-char operators
        const two = input.slice(i, i + 2);
        const op = OPERATORS.includes(two) ? two : OPERATORS.includes(ch) ? ch : null;
        if (op) {
            tokens.push({ type: 'op', value: op });
            i += op.length;
            continue;
        }

        throw new Error(`Unexpected character '${ch}' in expression`);
    }
    return tokens;
}

class Parser {
    private pos = 0;
    constructor(private tokens: Token[], private vars: Record<string, number>) {}

    private peek(): Token | undefined { return this.tokens[this.pos]; }
    private next(): Token | undefined { return this.tokens[this.pos++]; }
    private eatOp(value: string): boolean {
        const t = this.peek();
        if (t && t.type === 'op' && t.value === value) { this.pos++; return true; }
        return false;
    }

    parse(): number {
        const result = this.parseOr();
        if (this.pos !== this.tokens.length) {
            throw new Error('Unexpected trailing tokens in expression');
        }
        return result;
    }

    private parseOr(): number {
        let left = this.parseAnd();
        while (this.eatOp('||')) {
            const right = this.parseAnd();
            left = (left !== 0 || right !== 0) ? 1 : 0;
        }
        return left;
    }

    private parseAnd(): number {
        let left = this.parseCompare();
        while (this.eatOp('&&')) {
            const right = this.parseCompare();
            left = (left !== 0 && right !== 0) ? 1 : 0;
        }
        return left;
    }

    private parseCompare(): number {
        const left = this.parseAdd();
        for (const op of ['>=', '<=', '==', '!=', '>', '<']) {
            if (this.eatOp(op)) {
                const right = this.parseAdd();
                switch (op) {
                    case '>=': return left >= right ? 1 : 0;
                    case '<=': return left <= right ? 1 : 0;
                    case '==': return left === right ? 1 : 0;
                    case '!=': return left !== right ? 1 : 0;
                    case '>': return left > right ? 1 : 0;
                    case '<': return left < right ? 1 : 0;
                }
            }
        }
        return left;
    }

    private parseAdd(): number {
        let left = this.parseMul();
        for (;;) {
            if (this.eatOp('+')) left += this.parseMul();
            else if (this.eatOp('-')) left -= this.parseMul();
            else break;
        }
        return left;
    }

    private parseMul(): number {
        let left = this.parsePow();
        for (;;) {
            if (this.eatOp('*')) left *= this.parsePow();
            else if (this.eatOp('/')) { const r = this.parsePow(); left = r === 0 ? 0 : left / r; }
            else if (this.eatOp('%')) { const r = this.parsePow(); left = r === 0 ? 0 : left % r; }
            else break;
        }
        return left;
    }

    private parsePow(): number {
        const base = this.parseUnary();
        if (this.eatOp('^')) {
            return Math.pow(base, this.parsePow()); // right-associative
        }
        return base;
    }

    private parseUnary(): number {
        if (this.eatOp('-')) return -this.parseUnary();
        if (this.eatOp('!')) return this.parseUnary() === 0 ? 1 : 0;
        return this.parsePrimary();
    }

    private parsePrimary(): number {
        const t = this.next();
        if (!t) throw new Error('Unexpected end of expression');

        if (t.type === 'num') return parseFloat(t.value);

        if (t.type === 'ident') {
            if (Object.prototype.hasOwnProperty.call(this.vars, t.value)) {
                return this.vars[t.value];
            }
            throw new Error(`Unknown identifier '${t.value}'`);
        }

        if (t.type === 'lparen') {
            const inner = this.parseOr();
            const close = this.next();
            if (!close || close.type !== 'rparen') throw new Error('Missing closing parenthesis');
            return inner;
        }

        throw new Error(`Unexpected token '${t.value}'`);
    }
}

/**
 * Evaluate a numeric expression against a variable map. Throws on any token,
 * identifier, or syntax not permitted by the grammar above.
 */
export function evaluateExpression(expression: string, vars: Record<string, number>): number {
    const tokens = tokenize(expression);
    if (tokens.length === 0) throw new Error('Empty expression');
    return new Parser(tokens, vars).parse();
}

/**
 * Evaluate a boolean condition (e.g. "stress > 80 && energy < 30").
 * Returns false on any parse/evaluation error (fail-closed).
 */
export function evaluateBooleanCondition(
    condition: string,
    vars: Record<string, number>
): boolean {
    try {
        return evaluateExpression(condition, vars) !== 0;
    } catch {
        return false;
    }
}

/**
 * Evaluate a custom numeric effect expression over a single `value` variable
 * (and any extra vars). Returns 0 on any error (fail-closed).
 */
export function evaluateNumericExpression(
    expression: string,
    vars: Record<string, number>
): number {
    try {
        const result = evaluateExpression(expression, vars);
        return Number.isFinite(result) ? result : 0;
    } catch {
        return 0;
    }
}
