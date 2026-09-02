import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * True only after client hydration. Server and the first client render both
 * see false, so persisted-store reads cannot mismatch. Replaces the
 * useEffect(() => setHasMounted(true)) pattern the compiler rejects.
 */
export function useClientMounted(): boolean {
    return useSyncExternalStore(subscribe, () => true, () => false);
}
