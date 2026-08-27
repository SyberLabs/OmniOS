// ============================================
// PROJECT OMNI: AGENT SURFACE — TYPES
// A tab is a persistent browser/session state record.
// It is not a Citadel canvas and not a hosted-model chat.
// ============================================

export type JsonSchema = {
    type: string;
    description?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    additionalProperties?: boolean;
    enum?: string[];
};

export type Affordance = {
    id: string;
    description: string;
    method: 'GET' | 'POST' | 'DELETE';
    path: string;
    inputSchema: JsonSchema;
    mutates: string[];
    keyRequired: false;
};

export type AgentTab = {
    id: string;
    title: string;
    url: string | null;
    note: string | null;
    state: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
};

export type InvokeInput = Record<string, unknown>;

export type HandlerResult = {
    status: number;
    body: Record<string, unknown>;
};
