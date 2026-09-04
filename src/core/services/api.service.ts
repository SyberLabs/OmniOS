// ============================================
// PROJECT OMNI: CONNECTION TESTS
// Settings-panel probes only. Blocks fetch through the gateway, never here
// these deliberately call the SAME routes the blocks use, so a green test
// cannot pass while the real path is broken.
// ============================================

/**
 * Test API connection
 */
export async function testPolymarketConnection(): Promise<boolean> {
    try {
        const response = await fetch('/api/polymarket');
        const data = await response.json();
        return data.success;
    } catch {
        return false;
    }
}

/**
 * Test NewsAPI connection. The key is read server-side from process.env;
 * the client sends no key. A 503 indicates the server is missing NEWSAPI_KEY.
 */
export async function testNewsConnection(): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        // Same route the NewsAPI block uses, so a green test means the block
        // will work: a separate /api/news path could pass while the real one failed.
        const response = await fetch('/api/data?provider=newsapi&pageSize=1');
        const data = await response.json();

        if (data?.status === 'ok') return { success: true };
        return {
            success: false,
            error: data?.message || 'NewsAPI request failed'
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Connection failed'
        };
    }
}
