import { useEffect } from 'react';
import { useShellStore, useBlockStore } from '@/core/stores';

export function useShellNavigation() {
    const { hotkeySlots } = useShellStore();
    const { setActiveShell } = useBlockStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey)) return;

            if (e.key === '0') {
                e.preventDefault();
                setActiveShell('root');
                return;
            }

            if (/^[1-9]$/.test(e.key)) {
                const customShellId = hotkeySlots[parseInt(e.key, 10)];
                if (!customShellId) return;
                e.preventDefault();
                setActiveShell(customShellId);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [hotkeySlots, setActiveShell]);
}

export default useShellNavigation;
