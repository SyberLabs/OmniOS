'use client';

// ============================================
// PROJECT OMNI: SETTINGS PANEL
// ============================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings,
    X,
    Key,
    Database,
    TestTube,
    Check,
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';
import { useSettingsStore } from '@/core/stores';
import { testNewsConnection, testPolymarketConnection } from '@/core/services/api.service';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const { useMockData, apiKeys, updateApiKey, toggleMockData } = useSettingsStore();

    const [newsApiKey, setNewsApiKey] = useState(apiKeys.newsapi || '');
    const [polymarketApiKey, setPolymarketApiKey] = useState(apiKeys.polymarket || '');

    const [showNewsKey, setShowNewsKey] = useState(false);
    const [showPolymarketKey, setShowPolymarketKey] = useState(false);

    const [testingNews, setTestingNews] = useState(false);
    const [testingPolymarket, setTestingPolymarket] = useState(false);

    const [newsTestResult, setNewsTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [polymarketTestResult, setPolymarketTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSaveNewsKey = () => {
        updateApiKey('newsapi', newsApiKey);
        setNewsTestResult({ success: true, message: 'API key saved' });
        setTimeout(() => setNewsTestResult(null), 3000);
    };

    const handleSavePolymarketKey = () => {
        updateApiKey('polymarket', polymarketApiKey);
        setPolymarketTestResult({ success: true, message: 'API key saved' });
        setTimeout(() => setPolymarketTestResult(null), 3000);
    };

    const handleTestNews = async () => {
        if (!newsApiKey || newsApiKey === 'NEWSAPI_KEY_PLACEHOLDER') {
            setNewsTestResult({ success: false, message: 'Please enter an API key first' });
            return;
        }

        setTestingNews(true);
        const result = await testNewsConnection(newsApiKey);
        setTestingNews(false);

        setNewsTestResult({
            success: result.success,
            message: result.success ? 'Connection successful!' : result.error || 'Connection failed'
        });

        setTimeout(() => setNewsTestResult(null), 5000);
    };

    const handleTestPolymarket = async () => {
        setTestingPolymarket(true);
        const result = await testPolymarketConnection();
        setTestingPolymarket(false);

        setPolymarketTestResult({
            success: result,
            message: result ? 'Connection successful!' : 'Connection failed'
        });

        setTimeout(() => setPolymarketTestResult(null), 5000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative bg-[var(--citadel-bg)]/95 backdrop-blur-xl border border-[var(--citadel-border)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                        style={{
                            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.6), 0 0 2px rgba(255, 255, 255, 0.1) inset'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[var(--citadel-border)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--citadel-primary)]/10 flex items-center justify-center">
                                    <Settings className="w-5 h-5 text-[var(--citadel-primary)]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                                        System Settings
                                    </h2>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Configure API keys and data sources
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-[var(--citadel-surface)]/50 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-[var(--text-muted)]" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                            {/* Mock Data Toggle */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Database className="w-4 h-4 text-[var(--citadel-primary)]" />
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                                        Data Source Mode
                                    </h3>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-[var(--citadel-surface)] rounded-lg border border-[var(--citadel-border)]">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                            Use Mock Data
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            {useMockData
                                                ? 'Currently using demo data (no API calls)'
                                                : 'Live API mode enabled'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={toggleMockData}
                                        className={cn(
                                            "relative w-12 h-6 rounded-full transition-colors",
                                            useMockData ? "bg-[var(--citadel-primary)]" : "bg-[var(--citadel-border)]"
                                        )}
                                    >
                                        <motion.div
                                            className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                                            animate={{ left: useMockData ? '1.5rem' : '0.125rem' }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* NewsAPI Configuration */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Key className="w-4 h-4 text-[var(--truth-amber)]" />
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                                        NewsAPI Configuration
                                    </h3>
                                </div>

                                <div className="space-y-3 p-4 bg-[var(--citadel-surface)] rounded-lg border border-[var(--citadel-border)]">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-[var(--text-secondary)]">
                                            API Key
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showNewsKey ? 'text' : 'password'}
                                                value={newsApiKey}
                                                onChange={(e) => setNewsApiKey(e.target.value)}
                                                placeholder="Enter your NewsAPI key"
                                                className="w-full px-3 py-2 pr-10 bg-[var(--citadel-bg)] border border-[var(--citadel-border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--citadel-primary)]/50"
                                            />
                                            <button
                                                onClick={() => setShowNewsKey(!showNewsKey)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--citadel-elevated)] rounded"
                                            >
                                                {showNewsKey ? (
                                                    <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />
                                                ) : (
                                                    <Eye className="w-4 h-4 text-[var(--text-muted)]" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            Get your API key from{' '}
                                            <a
                                                href="https://newsapi.org/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[var(--citadel-primary)] hover:underline"
                                            >
                                                newsapi.org
                                            </a>
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveNewsKey}
                                            disabled={!newsApiKey || newsApiKey === apiKeys.newsapi}
                                            className="flex-1 px-3 py-2 bg-[var(--citadel-primary)] hover:bg-[var(--citadel-primary-glow)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Save Key
                                        </button>
                                        <button
                                            onClick={handleTestNews}
                                            disabled={testingNews || !newsApiKey || newsApiKey === 'NEWSAPI_KEY_PLACEHOLDER'}
                                            className="flex-1 px-3 py-2 bg-[var(--truth-amber)] hover:bg-[var(--truth-amber)]/80 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <TestTube className="w-4 h-4" />
                                            {testingNews ? 'Testing...' : 'Test Connection'}
                                        </button>
                                    </div>

                                    {newsTestResult && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "flex items-center gap-2 p-3 rounded-lg text-sm",
                                                newsTestResult.success
                                                    ? "bg-[var(--truth-green)]/10 text-[var(--truth-green)]"
                                                    : "bg-[var(--truth-red)]/10 text-[var(--truth-red)]"
                                            )}
                                        >
                                            {newsTestResult.success ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4" />
                                            )}
                                            <span>{newsTestResult.message}</span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Polymarket Configuration */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Key className="w-4 h-4 text-[var(--truth-green)]" />
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                                        Polymarket Configuration
                                    </h3>
                                </div>

                                <div className="space-y-3 p-4 bg-[var(--citadel-surface)] rounded-lg border border-[var(--citadel-border)]">
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Polymarket uses a public API that doesn't require authentication for basic access.
                                    </p>

                                    <button
                                        onClick={handleTestPolymarket}
                                        disabled={testingPolymarket}
                                        className="w-full px-3 py-2 bg-[var(--truth-green)] hover:bg-[var(--truth-green)]/80 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <TestTube className="w-4 h-4" />
                                        {testingPolymarket ? 'Testing...' : 'Test Connection'}
                                    </button>

                                    {polymarketTestResult && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "flex items-center gap-2 p-3 rounded-lg text-sm",
                                                polymarketTestResult.success
                                                    ? "bg-[var(--truth-green)]/10 text-[var(--truth-green)]"
                                                    : "bg-[var(--truth-red)]/10 text-[var(--truth-red)]"
                                            )}
                                        >
                                            {polymarketTestResult.success ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4" />
                                            )}
                                            <span>{polymarketTestResult.message}</span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="p-4 bg-[var(--citadel-primary)]/5 border border-[var(--citadel-primary)]/20 rounded-lg">
                                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                    <strong className="text-[var(--citadel-primary)]">💡 Tip:</strong> API keys are stored locally in your browser.
                                    Toggle "Use Mock Data" to test the interface with demo data before configuring real APIs.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default SettingsPanel;
