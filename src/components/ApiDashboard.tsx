'use client';

// ============================================
// PROJECT OMNI: API DASHBOARD & MARKETPLACE
// Unified API management interface
// ============================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    Key,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
    Circle,
    CircleDashed,
    Loader2,
    Copy,
    Check,
    Trash2,
    ExternalLink,
    Download,
    TrendingUp,
    Newspaper,
    Code,
    DollarSign,
    RefreshCw
} from 'lucide-react';
import { useApiStore, getStatusColor } from '@/core/stores/apiStore';
import {
    API_CATALOG,
    ApiProvider,
    ApiCategory,
    getApisByCategory,
    searchApis,
    getApiSupportLevel,
    isApiSupported
} from '@/core/schemas/api.schema';
import { cn } from '@/lib/utils';

// ============================================
// CATEGORY ICONS & LABELS
// ============================================

const CATEGORY_CONFIG: Record<ApiCategory, { icon: React.ReactNode; label: string; color: string }> = {
    truth: { icon: <TrendingUp className="w-4 h-4" />, label: 'Truth', color: 'var(--truth-green)' },
    pulse: { icon: <Newspaper className="w-4 h-4" />, label: 'Pulse', color: 'var(--truth-amber)' },
    developer: { icon: <Code className="w-4 h-4" />, label: 'Developer', color: '#f97316' },
    economy: { icon: <DollarSign className="w-4 h-4" />, label: 'Economy', color: '#eab308' }
};

// ============================================
// MAIN COMPONENT
// ============================================

interface ApiDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ApiDashboardModal({ isOpen, onClose }: ApiDashboardModalProps) {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'marketplace'>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ApiCategory | 'all'>('all');

    const { installedApis, getInstalledConfigs } = useApiStore();
    const installedConfigs = getInstalledConfigs();
    const supportedCount = API_CATALOG.filter(api => isApiSupported(api.id)).length;

    // Count by status
    const statusCounts = {
        connected: installedConfigs.filter(c => c.status === 'connected').length,
        idle: installedConfigs.filter(c => c.status === 'idle').length,
        error: installedConfigs.filter(c => c.status === 'error').length,
        notConfigured: installedConfigs.filter(c => c.status === 'not_configured').length
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl max-h-[85vh] flex flex-col"
                    >
                        <div className="bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--citadel-border)] bg-gradient-to-r from-[var(--citadel-primary)]/10 to-[var(--mind-aqua-surface)]/10">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--citadel-primary)] to-[var(--mind-aqua-surface)] flex items-center justify-center">
                                        <Key className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                                            API Command Center
                                        </h2>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {installedApis.length} installed | {supportedCount} supported | {API_CATALOG.length} listed
                                        </p>
                                    </div>
                                </div>

                                {/* Tab Switcher */}
                                <div className="flex items-center gap-2 bg-[var(--citadel-surface)] rounded-lg p-1">
                                    <button
                                        onClick={() => setActiveTab('dashboard')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                            activeTab === 'dashboard'
                                                ? "bg-[var(--citadel-primary)] text-white"
                                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                        )}
                                    >
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('marketplace')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                            activeTab === 'marketplace'
                                                ? "bg-[var(--citadel-primary)] text-white"
                                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                        )}
                                    >
                                        Marketplace
                                    </button>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-[var(--citadel-border)]/50 transition-colors"
                                >
                                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden">
                                {activeTab === 'dashboard' ? (
                                    <DashboardView
                                        configs={installedConfigs}
                                        statusCounts={statusCounts}
                                    />
                                ) : (
                                    <MarketplaceView
                                        searchQuery={searchQuery}
                                        setSearchQuery={setSearchQuery}
                                        selectedCategory={selectedCategory}
                                        setSelectedCategory={setSelectedCategory}
                                    />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// DASHBOARD VIEW
// ============================================

interface DashboardViewProps {
    configs: ReturnType<typeof useApiStore.getState>['getInstalledConfigs'] extends () => infer R ? R : never;
    statusCounts: { connected: number; idle: number; error: number; notConfigured: number };
}

function DashboardView({ configs, statusCounts }: DashboardViewProps) {
    const [expandedApi, setExpandedApi] = useState<string | null>(null);

    if (configs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <Key className="w-12 h-12 text-[var(--text-muted)] mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">No APIs Installed</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                    Visit the Marketplace to discover and install APIs
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Status Summary */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-[var(--citadel-border)]">
                <StatusBadge icon={<CheckCircle />} count={statusCounts.connected} label="Connected" color="var(--truth-green)" />
                <StatusBadge icon={<Circle />} count={statusCounts.idle} label="Idle" color="var(--truth-amber)" />
                <StatusBadge icon={<XCircle />} count={statusCounts.error} label="Error" color="var(--truth-red)" />
                <StatusBadge icon={<CircleDashed />} count={statusCounts.notConfigured} label="Not Configured" color="var(--text-muted)" />
            </div>

            {/* API List */}
            <div className="flex-1 overflow-auto p-4 space-y-2">
                {configs.map(config => (
                    <ApiConfigCard
                        key={config.providerId}
                        config={config}
                        isExpanded={expandedApi === config.providerId}
                        onToggle={() => setExpandedApi(expandedApi === config.providerId ? null : config.providerId)}
                    />
                ))}
            </div>
        </div>
    );
}

function StatusBadge({ icon, count, label, color }: { icon: React.ReactNode; count: number; label: string; color: string }) {
    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--citadel-surface)] rounded-lg">
            <span style={{ color }}>{icon}</span>
            <span className="text-lg font-semibold text-[var(--text-primary)]">{count}</span>
            <span className="text-xs text-[var(--text-muted)]">{label}</span>
        </div>
    );
}

// ============================================
// API CONFIG CARD
// ============================================

interface ApiConfigCardProps {
    config: ReturnType<typeof useApiStore.getState>['getInstalledConfigs'] extends () => (infer R)[] ? R : never;
    isExpanded: boolean;
    onToggle: () => void;
}

function ApiConfigCard({ config, isExpanded, onToggle }: ApiConfigCardProps) {
    const { setApiKey, getApiKey, testConnection, uninstallApi, updateStatus } = useApiStore();
    const [showKey, setShowKey] = useState(false);
    const [keyInput, setKeyInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const currentKey = getApiKey(config.providerId);
    const categoryConfig = CATEGORY_CONFIG[config.provider.category];

    const handleSaveKey = () => {
        setApiKey(config.providerId, keyInput);
        setKeyInput('');
        updateStatus(config.providerId, 'idle');
    };

    const handleTest = async () => {
        setIsTesting(true);
        await testConnection(config.providerId);
        setIsTesting(false);
    };

    const handleCopy = async () => {
        if (currentKey) {
            await navigator.clipboard.writeText(currentKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const StatusIcon = config.status === 'connected' ? CheckCircle
        : config.status === 'error' ? XCircle
            : config.status === 'idle' ? Circle
                : config.status === 'testing' ? Loader2
                    : CircleDashed;

    return (
        <div className="border border-[var(--citadel-border)] rounded-xl overflow-hidden bg-[var(--citadel-surface)]/50">
            {/* Header Row */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--citadel-surface)] transition-colors"
            >
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${categoryConfig.color}20`, color: categoryConfig.color }}
                >
                    {categoryConfig.icon}
                </div>
                <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{config.provider.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{config.provider.description}</p>
                </div>
                <div className="flex items-center gap-3">
                    <StatusIcon
                        className={cn("w-5 h-5", config.status === 'testing' && "animate-spin")}
                        style={{ color: getStatusColor(config.status) }}
                    />
                    <span className="text-xs text-[var(--text-muted)]">
                        {config.requestCount} requests
                    </span>
                </div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[var(--citadel-border)]"
                    >
                        <div className="p-4 space-y-4">
                            {/* API Key Input */}
                            {config.provider.requiresAuth && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">API Key</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type={showKey ? 'text' : 'password'}
                                                value={keyInput || (showKey ? currentKey : currentKey ? 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢' : '')}
                                                onChange={(e) => setKeyInput(e.target.value)}
                                                placeholder={currentKey ? 'Enter new key to update...' : 'Enter API key...'}
                                                className="w-full px-3 py-2 pr-10 bg-[var(--citadel-bg)] border border-[var(--citadel-border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--citadel-primary)]"
                                            />
                                            <button
                                                onClick={() => setShowKey(!showKey)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                            >
                                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {keyInput && (
                                            <button
                                                onClick={handleSaveKey}
                                                className="px-3 py-2 bg-[var(--citadel-primary)] text-white rounded-lg text-sm font-medium"
                                            >
                                                Save
                                            </button>
                                        )}
                                        {currentKey && !keyInput && (
                                            <button
                                                onClick={handleCopy}
                                                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--citadel-bg)] border border-[var(--citadel-border)] rounded-lg"
                                            >
                                                {copied ? <Check className="w-4 h-4 text-[var(--truth-green)]" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {config.status === 'error' && config.errorMessage && (
                                <div className="px-3 py-2 bg-[var(--truth-red)]/10 border border-[var(--truth-red)]/20 rounded-lg">
                                    <p className="text-xs text-[var(--truth-red)]">{config.errorMessage}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleTest}
                                    disabled={isTesting}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--citadel-primary)] hover:bg-[var(--citadel-primary)]/10 rounded-lg transition-colors"
                                >
                                    <RefreshCw className={cn("w-3.5 h-3.5", isTesting && "animate-spin")} />
                                    Test Connection
                                </button>
                                {config.provider.docsUrl && (
                                    <a
                                        href={config.provider.docsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Docs
                                    </a>
                                )}
                                <div className="flex-1" />
                                <button
                                    onClick={() => uninstallApi(config.providerId)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--truth-red)] hover:bg-[var(--truth-red)]/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Uninstall
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// MARKETPLACE VIEW
// ============================================

interface MarketplaceViewProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedCategory: ApiCategory | 'all';
    setSelectedCategory: (category: ApiCategory | 'all') => void;
}

function MarketplaceView({ searchQuery, setSearchQuery, selectedCategory, setSelectedCategory }: MarketplaceViewProps) {
    const { isInstalled, installApi } = useApiStore();

    const filteredApis = searchQuery
        ? searchApis(searchQuery)
        : selectedCategory === 'all'
            ? API_CATALOG
            : getApisByCategory(selectedCategory);

    const categories = Object.keys(CATEGORY_CONFIG) as ApiCategory[];

    return (
        <div className="flex flex-col h-full">
            {/* Search & Filter Bar */}
            <div className="px-6 py-4 border-b border-[var(--citadel-border)] space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search APIs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--citadel-surface)] border border-[var(--citadel-border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--citadel-primary)]"
                    />
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                            selectedCategory === 'all'
                                ? "bg-[var(--citadel-primary)] text-white"
                                : "bg-[var(--citadel-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                    >
                        All ({API_CATALOG.length})
                    </button>
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                                selectedCategory === category
                                    ? "text-white"
                                    : "bg-[var(--citadel-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            )}
                            style={selectedCategory === category ? { backgroundColor: CATEGORY_CONFIG[category].color } : undefined}
                        >
                            {CATEGORY_CONFIG[category].icon}
                            {CATEGORY_CONFIG[category].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* API Grid */}
            <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredApis.map(api => (
                        <ApiMarketplaceCard
                            key={api.id}
                            api={api}
                            isInstalled={isInstalled(api.id)}
                            onInstall={() => installApi(api.id)}
                        />
                    ))}
                </div>
                {filteredApis.length === 0 && (
                    <div className="text-center py-12">
                        <Search className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50 mb-2" />
                        <p className="text-sm text-[var(--text-muted)]">No APIs found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// MARKETPLACE CARD
// ============================================

interface ApiMarketplaceCardProps {
    api: ApiProvider;
    isInstalled: boolean;
    onInstall: () => void;
}

function ApiMarketplaceCard({ api, isInstalled, onInstall }: ApiMarketplaceCardProps) {
    const categoryConfig = CATEGORY_CONFIG[api.category];
    const supportLevel = getApiSupportLevel(api.id);
    const canInstall = isApiSupported(api.id);
    const supportLabel =
        supportLevel === 'supported' ? 'Supported' : supportLevel === 'experimental' ? 'Experimental' : 'Planned';

    return (
        <div className="border border-[var(--citadel-border)] rounded-xl p-4 bg-[var(--citadel-surface)]/50 hover:bg-[var(--citadel-surface)] transition-colors">
            <div className="flex items-start gap-3">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${categoryConfig.color}20`, color: categoryConfig.color }}
                >
                    {categoryConfig.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{api.name}</p>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-0.5">{api.description}</p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        api.pricing === 'free' && "bg-[var(--truth-green)]/20 text-[var(--truth-green)]",
                        api.pricing === 'freemium' && "bg-[var(--truth-amber)]/20 text-[var(--truth-amber)]",
                        api.pricing === 'paid' && "bg-[var(--citadel-primary)]/20 text-[var(--citadel-primary)]",
                        api.pricing === 'open_source' && "bg-[var(--mind-aqua-surface)]/20 text-[var(--mind-aqua-surface)]"
                    )}>
                        {api.pricing === 'free' ? 'âœ“ Free' : api.pricing === 'freemium' ? 'â— Freemium' : api.pricing === 'paid' ? '$ Paid' : 'âš¡ Open Source'}
                    </span>
                    <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        supportLevel === 'supported' && "bg-[var(--truth-green)]/15 text-[var(--truth-green)]",
                        supportLevel === 'experimental' && "bg-[var(--truth-amber)]/15 text-[var(--truth-amber)]",
                        supportLevel === 'planned' && "bg-[var(--citadel-border)]/60 text-[var(--text-muted)]"
                    )}>
                        {supportLabel}
                    </span>
                </div>

                <button
                    onClick={onInstall}
                    disabled={isInstalled || !canInstall}
                    className={cn(
                        "flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                        isInstalled
                            ? "bg-[var(--truth-green)]/20 text-[var(--truth-green)]"
                            : canInstall
                                ? "bg-[var(--citadel-primary)] text-white hover:opacity-90"
                                : "bg-[var(--citadel-border)] text-[var(--text-muted)] cursor-not-allowed"
                    )}
                >
                    {isInstalled ? (
                        <>
                            <Check className="w-3 h-3" />
                            Installed
                        </>
                    ) : !canInstall ? (
                        <>
                            <CircleDashed className="w-3 h-3" />
                            Planned
                        </>
                    ) : (
                        <>
                            <Download className="w-3 h-3" />
                            Install
                        </>
                    )}
                </button>
            </div>

            {api.freeTierLimits && (
                <p className="text-xs text-[var(--text-muted)] mt-2">{api.freeTierLimits}</p>
            )}
        </div>
    );
}

export default ApiDashboardModal;

