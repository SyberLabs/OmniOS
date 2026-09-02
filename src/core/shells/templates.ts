// ============================================
// PROJECT OMNI: SHELL TEMPLATES
// Code-defined, built-in shell templates for the Shell Store.
// Each template is an opinionated, preconfigured thinking environment that
// instantiates into a fresh shell. Templates reference registry block_ids and
// use *placeholder* instance ids that are remapped to fresh ids on instantiate.
// See CITADEL_SHELL_STORE_PLAN.md.
// ============================================

import type { PersonaType, AestheticTheme } from '@/core/schemas/shell.schema';
import { API_CATALOG, type ApiProvider } from '@/core/schemas/api.schema';

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
// Keyless markets + signals wired into Analyst → Strategist.
// All block_ids below are registered in BlockRegistry.ts.
// ============================================

const INVESTOR_SHELL: ShellTemplate = {
    id: 'tmpl_investor',
    name: 'Investor Shell',
    description:
        'Prediction markets, crypto, global indicators, and tech signals wired into an ' +
        'Analyst and Strategist — a ready-made environment that works without API keys.',
    icon: 'TrendingUp',
    tags: ['finance', 'markets', 'macro'],
    persona: 'analyst',
    aesthetic: 'command',
    blocks: [
        // --- Markets (left column) ---
        { ref: 'polymarket', blockId: 'polymarket_live_odds', position: { x: 40, y: 40 } },
        { ref: 'crypto', blockId: 'coingecko_crypto', position: { x: 40, y: 320 } },
        // --- Context (middle column) ---
        { ref: 'worldbank', blockId: 'worldbank_indicator', position: { x: 420, y: 40 } },
        { ref: 'hn', blockId: 'hackernews_feed', position: { x: 420, y: 320 } },
        // --- Personas (right column) ---
        { ref: 'analyst', blockId: 'persona_analyst', position: { x: 800, y: 120 } },
        { ref: 'strategist', blockId: 'persona_strategist', position: { x: 800, y: 560 } },
    ],
    connections: [
        { sourceRef: 'polymarket', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        { sourceRef: 'crypto', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        { sourceRef: 'worldbank', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        { sourceRef: 'hn', sourcePort: 'out', targetRef: 'analyst', targetPort: 'in' },
        { sourceRef: 'analyst', sourcePort: 'out', targetRef: 'strategist', targetPort: 'in' },
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
 * Providers a template will ask for a key. Derived from catalog blockIds so
 * a shell can say, before spawning, whether it works on a fresh clone.
 */
export function keyedProvidersForTemplate(template: ShellTemplate): ApiProvider[] {
    const blockIds = new Set(template.blocks.map(b => b.blockId));
    return API_CATALOG.filter(
        p => p.requiresAuth && p.blockIds?.some(id => blockIds.has(id))
    );
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
