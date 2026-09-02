// ============================================
// PROJECT OMNI: METACULUS BLOCK
// Logic for handling Metaculus forecast data
// ============================================

import { useMemo, useEffect } from 'react';
import { useBlockStore, useSettingsStore } from '@/core/stores';
import { useOmniData } from '@/core/hooks';
import { OmniItem } from '@/core/gateway';

export function useMetaculusBlock(instanceId: string) {
    const { updateData, updateStatus, getBlock } = useBlockStore();
    const { useMockData } = useSettingsStore();
    const block = getBlock(instanceId);

    // Use the API Gateway hook
    const {
        items,
        isLoading,
        error,
        refresh
    } = useOmniData('metaculus', instanceId, {
        immediate: true,
        refreshInterval: useMockData ? 5000 : 60000
    });

    // Sync data to block store
    useEffect(() => {
        if (items.length > 0) {
            updateData(instanceId, items);
            updateStatus(instanceId, 'connected');
        }
    }, [items, instanceId, updateData, updateStatus]);

    // Handle loading/error states
    useEffect(() => {
        if (isLoading) updateStatus(instanceId, 'connecting');
    }, [isLoading, instanceId, updateStatus]);

    useEffect(() => {
        if (error) updateStatus(instanceId, 'error', error);
    }, [error, instanceId, updateStatus]);

    // Cast data for consumption
    const questions = useMemo(() => {
        return Array.isArray(block?.data) ? (block.data as OmniItem[]) : items;
    }, [block?.data, items]);

    return {
        questions,
        status: block?.status || (isLoading ? 'connecting' : 'connected'),
        lastUpdated: block?.last_updated || Date.now(),
        refresh,
        error
    };
}
