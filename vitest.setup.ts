// Runs before each test file. Provides a minimal localStorage polyfill so
// modules that import the (persisted) Zustand stores work in the node
// environment without pulling in jsdom.
const memStore = new Map<string, string>();

// Spec-faithful enough to be ENUMERABLE (length/key): the vault export
// iterates localStorage, so the hardcoded `length: 0` variant broke it.
const localStoragePolyfill = {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => void memStore.set(k, String(v)),
    removeItem: (k: string) => void memStore.delete(k),
    clear: () => memStore.clear(),
    key: (i: number) => Array.from(memStore.keys())[i] ?? null,
    get length() { return memStore.size; }
};

if (typeof globalThis.localStorage === 'undefined') {
    Object.defineProperty(globalThis, 'localStorage', {
        value: localStoragePolyfill,
        writable: true
    });
}
