// Runs before each test file. Provides a minimal localStorage polyfill so
// modules that import the (persisted) Zustand stores work in the node
// environment without pulling in jsdom.
const memStore = new Map<string, string>();

const localStoragePolyfill = {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => void memStore.set(k, v),
    removeItem: (k: string) => void memStore.delete(k),
    clear: () => memStore.clear(),
    key: () => null,
    length: 0
};

if (typeof globalThis.localStorage === 'undefined') {
    Object.defineProperty(globalThis, 'localStorage', {
        value: localStoragePolyfill,
        writable: true
    });
}
