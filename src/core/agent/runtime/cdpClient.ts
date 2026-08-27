// ============================================
// Thin CDP WebSocket client. No Playwright.
// ============================================

type Pending = {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
};

export class CdpClient {
    private seq = 0;
    private readonly pending = new Map<number, Pending>();
    private readonly waiters = new Map<string, Array<(params: unknown) => void>>();

    private constructor(private readonly ws: WebSocket) {
        this.ws.addEventListener('message', (event) => {
            this.onMessage(String((event as MessageEvent).data));
        });
        this.ws.addEventListener('close', () => {
            for (const item of this.pending.values()) {
                clearTimeout(item.timer);
                item.reject(new Error('CDP socket closed'));
            }
            this.pending.clear();
        });
    }

    static async connect(url: string, timeoutMs = 15_000): Promise<CdpClient> {
        if (typeof WebSocket === 'undefined') {
            throw new Error('WebSocket is required for the Chrome/CDP runtime');
        }
        const ws = new WebSocket(url);
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('CDP connect timeout')), timeoutMs);
            ws.addEventListener('open', () => {
                clearTimeout(timer);
                resolve();
            });
            ws.addEventListener('error', () => {
                clearTimeout(timer);
                reject(new Error(`CDP connect failed: ${url}`));
            });
        });
        return new CdpClient(ws);
    }

    async send<T>(method: string, params?: Record<string, unknown>, timeoutMs = 20_000): Promise<T> {
        const id = ++this.seq;
        this.ws.send(JSON.stringify({ id, method, params }));
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`CDP timeout: ${method}`));
            }, timeoutMs);
            this.pending.set(id, {
                resolve: (value) => resolve(value as T),
                reject,
                timer
            });
        });
    }

    once(method: string, timeoutMs = 20_000): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`CDP event timeout: ${method}`)), timeoutMs);
            const list = this.waiters.get(method) ?? [];
            list.push((params) => {
                clearTimeout(timer);
                resolve(params);
            });
            this.waiters.set(method, list);
        });
    }

    close(): void {
        try {
            this.ws.close();
        } catch {
            // already closed
        }
    }

    private onMessage(raw: string): void {
        let msg: { id?: number; method?: string; params?: unknown; result?: unknown; error?: { message?: string } };
        try {
            msg = JSON.parse(raw) as typeof msg;
        } catch {
            return;
        }
        if (msg.id && this.pending.has(msg.id)) {
            const pending = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            clearTimeout(pending.timer);
            if (msg.error) {
                pending.reject(new Error(msg.error.message || 'CDP error'));
            } else {
                pending.resolve(msg.result);
            }
            return;
        }
        if (msg.method) {
            const list = this.waiters.get(msg.method);
            if (!list?.length) return;
            this.waiters.set(msg.method, []);
            for (const waiter of list) waiter(msg.params);
        }
    }
}
