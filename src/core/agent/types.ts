// ============================================
// PROJECT OMNI: AGENT SURFACE — TYPES
// A tab is a live disposable browser page + isolated session.
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

export type PageLink = {
    href: string;
    text: string;
};

export type Actionable = {
    ref: string;
    role: 'button' | 'link' | 'textbox' | 'checkbox' | 'combobox';
    name: string;
    href?: string;
    value?: string;
    actions: Array<'click' | 'type'>;
    selector?: string;
};

export type AgentTab = {
    id: string;
    title: string;
    url: string;
    text: string;
    links: PageLink[];
    actions: Actionable[];
    createdAt: number;
    updatedAt: number;
};

export type InvokeInput = Record<string, unknown>;

export type HandlerResult = {
    status: number;
    body: Record<string, unknown>;
};
