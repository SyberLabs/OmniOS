// ============================================
// PROJECT OMNI: SHELL TEMPLATES
// Code-defined, built-in shell templates for the Shell Store.
// Each template is an opinionated, preconfigured thinking environment that
// instantiates into a fresh shell. Templates reference registry block_ids and
// use *placeholder* instance ids that are remapped to fresh ids on instantiate.
// See CITADEL_SHELL_STORE_PLAN.md.
// ============================================

import type { PersonaType, AestheticTheme } from '@/core/schemas/shell.schema';

/** A block placement inside a template (placeholder instanceId, remapped on use). */
export interface TemplateBlock {
    /** Local placeholder id, unique within the template; remapped on instantiate. */
    ref: string;
    /** Registry block_id this placement instantiates. */
    blockId: string;
    position: { x: number; y: number };
    dimensions?: { width: number; height: number };
}

/** A wire between two template blocks, by their local `ref`s. */
export interface TemplateConnection {
    sourceRef: string;
    sourcePort: string;
    targetRef: string;
    targetPort: string;
}

/** A built-in shell template. */
export interface ShellTemplate {
    id: string;
    name: string;
    description: string;
    icon?: string;
    tags: string[];
    persona: PersonaType;
    aesthetic: AestheticTheme;
    blocks: TemplateBlock[];
    connections: TemplateConnection[];
}

// ============================================
// INVESTOR SHELL
// Macro + markets + signals wired into Analyst → Strategist.
// All block_ids below are registered in BlockRegistry.ts.
// ============================================

const INVESTOR_SHELL: ShellTemplate = {
    id: 'tmpl_investor',
    name: 'Investor Shell',
    description:
        'Macroeconomic data, equities, crypto, and prediction markets wired into an ' +
        'Analyst and Strategist — a ready-made environment for reasoning about positioning.',
    icon: 'TrendingUp',
    tags: ['finance', 'markets', 'macro'],
    persona: 'analyst',
    aesthetic: 'command',
    blocks: [
        // --- Macro cluster (left column) ---
        { ref: 'fred', blockId: 'fred_series', position: { x: 40, y: 40 } },
        { ref: 'bls', blockId: 'bls_series', position: { x: 40, y: 320 } },
        { ref: 'worldbank', blockId: 'worldbank_indicator', position: { x: 40, y: 600 } },
        // --- Markets cluster (middle column) ---
        { ref: 'stocks', blockId: 'alpha_vantage_quote', position: { x: 420, y: 40 } },
        { ref: 'crypto', blockId: 'coingecko_crypto', position: { x: 420, y: 320 } },
        // --- Signals cluster (middle-right) ---
        { ref: 'polymarket', blockId: 'polymarket_live_odds', position: { x: 420, y: 600 } },
        { ref: 'metaculus', blockId: 'metaculus_forecast', position: { x: 800, y: 600 } },
        { ref: 'news', blockId: 'newsapi_feed', position: { x: 800, y: 320 } },
        // --- Personas (right column) ---
        { ref: 'analyst', blockId: 'persona_analyst', position: { x: 1180, y: 120 } },
        { ref: 'strategist', blockId: 'persona_strategist', position: { x: 1180, y: 560 } },
    ],
    connections: [
        // All data streams feed the Analyst (data blocks output 'out' → persona input 'in').
        { sourceRef: 'fred', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        { sourceRef: 'bls', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        { sourceRef: 'worldbank', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        { sourceRef: 'stocks', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        { sourceRef: 'crypto', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        { sourceRef: 'polymarket', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        { sourceRef: 'metaculus', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        { sourceRef: 'news', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        // The Analyst's read feeds the Strategist (persona output 'out' → persona input 'in').
        { sourceRef: 'analyst', sourcePort: 'out', targetRef: 'strategist', targetPort: 'in' },
        // Plus the highest-signal raw streams directly to the Strategist.
        { sourceRef: 'polymarket', sourcePort: 'out', targetRef: 'strategist', targetPort: 'in' },
        { sourceRef: 'news', sourcePort: 'out', targetRef: 'strategist', targetPort: 'in' },
    ],
};

// ============================================
// REGISTRY
// ============================================

/** All built-in shell templates, in display order. */
export const SHELL_TEMPLATES: ShellTemplate[] = [
    INVESTOR_SHELL,
];

/** Look up a template by id. */
export function getShellTemplate(id: string): ShellTemplate | undefined {
    return SHELL_TEMPLATES.find(t => t.id === id);
}

/**
 * Validate a template's internal integrity against a registry-membership check.
 * Returns the list of problems (empty = valid). Decoupled from the registry import
 * so it's trivially testable.
 *
 * Checks:
 *  - every block's `blockId` is a registered block (`isRegistered`)
 *  - block `ref`s are unique within the template
 *  - every connection's source/target ref exists in the template's blocks
 */
export function validateTemplate(
    template: ShellTemplate,
    isRegistered: (blockId: string) => boolean
): string[] {
    const problems: string[] = [];
    const refs = new Set<string>();

    for (const block of template.blocks) {
        if (refs.has(block.ref)) {
            problems.push(`[${template.id}] duplicate block ref '${block.ref}'`);
        }
        refs.add(block.ref);
        if (!isRegistered(block.blockId)) {
            problems.push(`[${template.id}] unknown block_id '${block.blockId}' (ref '${block.ref}')`);
        }
    }

    for (const conn of template.connections) {
        if (!refs.has(conn.sourceRef)) {
            problems.push(`[${template.id}] connection sourceRef '${conn.sourceRef}' not in blocks`);
        }
        if (!refs.has(conn.targetRef)) {
            problems.push(`[${template.id}] connection targetRef '${conn.targetRef}' not in blocks`);
        }
    }

    return problems;
}

/** Validate every built-in template. Returns all problems across templates. */
export function validateAllTemplates(isRegistered: (blockId: string) => boolean): string[] {
    return SHELL_TEMPLATES.flatMap(t => validateTemplate(t, isRegistered));
}
