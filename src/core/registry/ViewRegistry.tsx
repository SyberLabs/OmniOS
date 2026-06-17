import React, { useState } from 'react';
import { PolymarketView } from '@/components/blocks/PolymarketView';
import { NewsView } from '@/components/blocks/NewsView';
import { CryptoView } from '@/components/blocks/CryptoView';
import { HNView } from '@/components/blocks/HNView';
import { MetaculusView } from '@/components/blocks/MetaculusView';
import { AlphaVantageView } from '@/components/blocks/AlphaVantageView';
import { OpenAlexView } from '@/components/blocks/OpenAlexView';
import { FredView } from '@/components/blocks/FredView';
import { BlsView } from '@/components/blocks/BlsView';
import { WorldBankView } from '@/components/blocks/WorldBankView';
import { SystemProxyBlock } from '@/components/blocks/SystemProxyBlock';
import { CoreCalculatorBlock } from '@/components/blocks/CoreCalculatorBlock';
import { GardenPortalBlock } from '@/components/blocks/GardenPortalBlock';
import { usePolymarketBlock } from '@/blocks/truth/PolymarketBlock';
import { useNewsBlock } from '@/blocks/truth/NewsApiBlock';
import { useCoinGeckoBlock } from '@/blocks/truth/CoinGeckoBlock';
import { useHackerNewsBlock } from '@/blocks/truth/HackerNewsBlock';
import { useMetaculusBlock } from '@/blocks/truth/MetaculusBlock';
import { useAlphaVantageBlock } from '@/blocks/truth/AlphaVantageBlock';
import { useOpenAlexBlock } from '@/blocks/truth/OpenAlexBlock';
import { useFredBlock } from '@/blocks/truth/FredBlock';
import { useBlsBlock } from '@/blocks/truth/BlsBlock';
import { useWorldBankBlock } from '@/blocks/truth/WorldBankBlock';
import {
    TextBlockView,
    CodeBlockView,
    ChatBlockView,
    MediaBlockView,
    EmbedBlockView
} from '@/blocks/workspace';
import { PersonaBlockView } from '@/blocks/persona';
import { useBlockStore } from '@/core/stores';
import { SystemType } from '@/core/schemas/core.schema';

// ============================================
// BLOCK WRAPPERS
// Connects Hooks (Logic) to Views (UI)
// ============================================

function PolymarketBlockContent({ instanceId }: { instanceId: string }) {
    const { markets, status, lastUpdated, refresh, pause, resume } = usePolymarketBlock(instanceId);
    const [isPaused, setIsPaused] = useState(false);

    const handlePause = () => {
        pause();
        setIsPaused(true);
    };

    const handleResume = () => {
        resume();
        setIsPaused(false);
    };

    return (
        <PolymarketView
            markets={markets}
            status={status}
            lastUpdated={lastUpdated ?? null}
            onRefresh={refresh}
            onPause={handlePause}
            onResume={handleResume}
            isPaused={isPaused}
        />
    );
}

function NewsBlockContent({ instanceId }: { instanceId: string }) {
    const { articles, status, lastUpdated, refresh } = useNewsBlock(instanceId);

    return (
        <NewsView
            articles={articles}
            status={status}
            lastUpdated={lastUpdated ?? null}
            onRefresh={refresh}
        />
    );
}

function CryptoBlockContent({ instanceId }: { instanceId: string }) {
    const { assets, status, lastUpdated, refresh } = useCoinGeckoBlock(instanceId);

    return (
        <CryptoView
            assets={assets}
            status={status}
            lastUpdated={lastUpdated ?? null}
            onRefresh={refresh}
        />
    );
}

function HNBlockContent({ instanceId }: { instanceId: string }) {
    const { stories, status, lastUpdated, refresh } = useHackerNewsBlock(instanceId);

    return (
        <HNView
            stories={stories}
            status={status}
            lastUpdated={lastUpdated ?? null}
            onRefresh={refresh}
        />
    );
}

function MetaculusBlockContent({ instanceId }: { instanceId: string }) {
    const { questions, status, lastUpdated, refresh } = useMetaculusBlock(instanceId);

    return (
        <MetaculusView
            questions={questions}
            status={status}
            lastUpdated={lastUpdated ?? null}
            onRefresh={refresh}
        />
    );
}

function AlphaVantageBlockContent({ instanceId }: { instanceId: string }) {
    const defaultSymbol = 'AAPL';
    const [symbolInput, setSymbolInput] = useState(defaultSymbol);
    const [params, setParams] = useState<{ symbol: string }>({ symbol: defaultSymbol });
    const { items, metrics, status, lastUpdated, refresh } = useAlphaVantageBlock(instanceId, params);

    const handleApplySymbol = () => {
        const nextSymbol = symbolInput.trim().toUpperCase();
        if (!nextSymbol) return;
        setParams(prev => (prev.symbol === nextSymbol ? prev : { ...prev, symbol: nextSymbol }));
    };

    return (
        <AlphaVantageView
            items={items}
            metrics={metrics}
            status={status}
            lastUpdated={lastUpdated ?? null}
            onRefresh={refresh}
            symbolInput={symbolInput}
            onSymbolInputChange={setSymbolInput}
            onApplySymbol={handleApplySymbol}
        />
    );
}

function OpenAlexBlockContent({ instanceId }: { instanceId: string }) {
    const [draft, setDraft] = useState({
        search: '',
        topic: '',
        year: ''
    });
    const [params, setParams] = useState<Record<string, unknown>>({});
    const { items, status, lastUpdated, refresh } = useOpenAlexBlock(instanceId, params);

    const handleApplyFilters = () => {
        const filters: string[] = [];
        let search = draft.search.trim();
        const topic = draft.topic.trim();
        const year = draft.year.trim();

        if (year && /^\d{4}$/.test(year)) {
            filters.push(`publication_year:${year}`);
        }

        if (topic) {
            const match = topic.match(/([CT]\d+)/i);
            if (match) {
                const id = match[1].toUpperCase();
                if (id.startsWith('T')) {
                    filters.push(`primary_topic.id:${id}`);
                } else if (id.startsWith('C')) {
                    filters.push(`concepts.id:${id}`);
                }
            } else {
                search = search ? `${search} ${topic}` : topic;
            }
        }

        const nextParams: Record<string, unknown> = {};
        if (search) nextParams.search = search;
        if (filters.length) nextParams.filter = filters.join(',');

        setParams(nextParams);
    };

    return (
        <OpenAlexView
            items={items}
            status={status}
            lastUpdated={lastUpdated ?? null}
            onRefresh={refresh}
            searchInput={draft.search}
            topicInput={draft.topic}
            yearInput={draft.year}
            onSearchInputChange={(value) => setDraft(prev => ({ ...prev, search: value }))}
            onTopicInputChange={(value) => setDraft(prev => ({ ...prev, topic: value }))}
            onYearInputChange={(value) => setDraft(prev => ({ ...prev, year: value }))}
            onApplyFilters={handleApplyFilters}
        />
    );
}

function FredBlockContent({ instanceId }: { instanceId: string }) {
    const defaultSeries = 'GDP';
    const [seriesInput, setSeriesInput] = useState(defaultSeries);
    const [params, setParams] = useState<{ seriesId: string; limit: number; sort_order: string }>({
        seriesId: defaultSeries,
        limit: 24,
        sort_order: 'desc'
    });
    const { items, metrics, status, lastUpdated, refresh } = useFredBlock(instanceId, params);

    const handleApplySeries = () => {
        const nextSeries = seriesInput.trim().toUpperCase();
        if (!nextSeries) return;
        setParams(prev =>
            prev.seriesId === nextSeries ? prev : { ...prev, seriesId: nextSeries }
        );
    };

    return (
        <FredView
            items={items}
            metrics={metrics}
            status={status}
            lastUpdated={lastUpdated ?? null}
            onRefresh={refresh}
            seriesInput={seriesInput}
            onSeriesInputChange={setSeriesInput}
            onApplySeries={handleApplySeries}
        />
    );
}

function BlsBlockContent({ instanceId }: { instanceId: string }) {
    const currentYear = new Date().getFullYear();
    const defaultStart = String(currentYear - 5);
    const defaultEnd = String(currentYear);
    const [draft, setDraft] = useState({
        seriesId: 'LNS14000000',
        startYear: defaultStart,
        endYear: defaultEnd
    });
    const [params, setParams] = useState({
        seriesId: 'LNS14000000',
        startYear: defaultStart,
        endYear: defaultEnd
    });
    const { items, metrics, status, lastUpdated, refresh } = useBlsBlock(instanceId, params);

    const normalizeYear = (value: string, fallback: string) => {
        const trimmed = value.trim();
        return /^\d{4}$/.test(trimmed) ? trimmed : fallback;
    };

    const handleApplySeries = () => {
        const seriesId = draft.seriesId.trim().toUpperCase();
        if (!seriesId) return;

        const startYear = normalizeYear(draft.startYear, defaultStart);
        const endYear = normalizeYear(draft.endYear, defaultEnd);

        setParams({ seriesId, startYear, endYear });
    };

    return (
        <BlsView
            items={items}
            metrics={metrics}
            status={status}
            lastUpdated={lastUpdated ?? null}
            onRefresh={refresh}
            seriesInput={draft.seriesId}
            startYearInput={draft.startYear}
            endYearInput={draft.endYear}
            onSeriesInputChange={(value) => setDraft(prev => ({ ...prev, seriesId: value }))}
            onStartYearInputChange={(value) => setDraft(prev => ({ ...prev, startYear: value }))}
            onEndYearInputChange={(value) => setDraft(prev => ({ ...prev, endYear: value }))}
            onApplySeries={handleApplySeries}
        />
    );
}

function WorldBankBlockContent({ instanceId }: { instanceId: string }) {
    type WorldBankParams = {
        indicator: string;
        country: string;
        per_page: number;
        startYear?: string;
        endYear?: string;
    };

    const [draft, setDraft] = useState({
        indicator: 'NY.GDP.MKTP.CD',
        country: 'USA',
        startYear: '',
        endYear: ''
    });
    const [params, setParams] = useState<WorldBankParams>({
        indicator: 'NY.GDP.MKTP.CD',
        country: 'USA',
        per_page: 60
    });
    const { items, metrics, status, lastUpdated, refresh } = useWorldBankBlock(instanceId, params);

    const normalizeYear = (value: string) => {
        const trimmed = value.trim();
        return /^\d{4}$/.test(trimmed) ? trimmed : '';
    };

    const handleApplyIndicator = () => {
        const indicator = draft.indicator.trim() || 'NY.GDP.MKTP.CD';
        const countryRaw = draft.country.trim();
        const country = countryRaw.toLowerCase() === 'all'
            ? 'all'
            : countryRaw.toUpperCase() || 'USA';
        const startYear = normalizeYear(draft.startYear);
        const endYear = normalizeYear(draft.endYear);

        const nextParams: WorldBankParams = {
            indicator,
            country,
            per_page: 60
        };
        if (startYear) nextParams.startYear = startYear;
        if (endYear) nextParams.endYear = endYear;

        setParams(nextParams);
    };

    return (
        <WorldBankView
            items={items}
            metrics={metrics}
            status={status}
            lastUpdated={lastUpdated ?? null}
            onRefresh={refresh}
            indicatorInput={draft.indicator}
            countryInput={draft.country}
            startYearInput={draft.startYear}
            endYearInput={draft.endYear}
            onIndicatorInputChange={(value) => setDraft(prev => ({ ...prev, indicator: value }))}
            onCountryInputChange={(value) => setDraft(prev => ({ ...prev, country: value }))}
            onStartYearInputChange={(value) => setDraft(prev => ({ ...prev, startYear: value }))}
            onEndYearInputChange={(value) => setDraft(prev => ({ ...prev, endYear: value }))}
            onApplyIndicator={handleApplyIndicator}
        />
    );
}

// ============================================
// SYSTEM BLOCK WRAPPERS
// ============================================

function SystemProxyBlockWrapper({ instanceId }: { instanceId: string }) {
    const { blocks } = useBlockStore();
    const block = blocks.find(b => b.instance_id === instanceId);
    const systemId = block?.schema.systemId as SystemType;

    if (!systemId) {
        return <div className="p-4 text-[var(--text-muted)]">Invalid system block</div>;
    }

    return <SystemProxyBlock blockId={instanceId} systemId={systemId} />;
}

function CoreCalculatorBlockWrapper({ instanceId }: { instanceId: string }) {
    return <CoreCalculatorBlock blockId={instanceId} />;
}

function GardenPortalBlockWrapper({ instanceId }: { instanceId: string }) {
    return <GardenPortalBlock blockId={instanceId} />;
}

// ============================================
// VIEW REGISTRY
// ============================================

export const BlockViews: Record<string, React.ComponentType<{ instanceId: string }>> = {
    // Truth Blocks
    'polymarket_live_odds': PolymarketBlockContent,
    'newsapi_feed': NewsBlockContent,
    'coingecko_crypto': CryptoBlockContent,
    'hackernews_feed': HNBlockContent,
    'metaculus_forecast': MetaculusBlockContent,
    'alpha_vantage_quote': AlphaVantageBlockContent,
    'openalex_works': OpenAlexBlockContent,
    'fred_series': FredBlockContent,
    'bls_series': BlsBlockContent,
    'worldbank_indicator': WorldBankBlockContent,

    // Workspace Blocks
    'text_note': TextBlockView,
    'code_sandbox': CodeBlockView,
    'mind_chat': ChatBlockView,
    'media_gallery': MediaBlockView,
    'web_embed': EmbedBlockView,

    // Persona Blocks
    'persona_analyst': PersonaBlockView,
    'persona_strategist': PersonaBlockView,
    'persona_researcher': PersonaBlockView,
    'persona_creative': PersonaBlockView,
    'persona_guardian': PersonaBlockView,

    // System Blocks
    'system_proxy_health': SystemProxyBlockWrapper,
    'system_proxy_career': SystemProxyBlockWrapper,
    'system_proxy_finance': SystemProxyBlockWrapper,
    'system_proxy_mind': SystemProxyBlockWrapper,
    'system_proxy_relationships': SystemProxyBlockWrapper,
    'system_proxy_environment': SystemProxyBlockWrapper,
    'system_proxy_time': SystemProxyBlockWrapper,
    'core_calculator': CoreCalculatorBlockWrapper,
    'garden_portal': GardenPortalBlockWrapper
};

export function getBlockView(blockId: string): React.ComponentType<{ instanceId: string }> | null {
    return BlockViews[blockId] || null;
}
