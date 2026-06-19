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
    AlertCircle
} from 'lucide-react';
import { useSettingsStore } from '@/core/stores';
import { testNewsConnection, testPolymarketConnection } from '@/core/services/api.service';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const { useMockData, toggleMockData } = useSettingsStore();

    const [testingNews, setTestingNews] = useState(false);
    const [testingPolymarket, setTestingPolymarket] = useState(false);

    const [newsTestResult, setNewsTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [polymarketTestResult, setPolymarketTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleTestNews = async () => {
        setTestingNews(true);
        const result = await testNewsConnection();
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

                            {/* NewsAPI Configuration — server-side via .env */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Key className="w-4 h-4 text-[var(--truth-amber)]" />
                                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                                        NewsAPI Configuration
                                    </h3>
                                </div>

                                <div className="space-y-3 p-4 bg-[var(--citadel-surface)] rounded-lg border border-[var(--citadel-border)]">
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                        NewsAPI is configured on the server. Set{' '}
                                        <code className="px-1 py-0.5 rounded bg-[var(--citadel-bg)] text-[var(--text-primary)]">NEWSAPI_KEY</code>{' '}
                                        in your <code className="px-1 py-0.5 rounded bg-[var(--citadel-bg)] text-[var(--text-primary)]">.env</code> file
                                        (get a key from{' '}
                                        <a
                                            href="https://newsapi.org/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[var(--citadel-primary)] hover:underline"
                                        >
                                            newsapi.org
                                        </a>
                                        ). Keys are never stored in the browser.
                                    </p>

                                    <button
                                        onClick={handleTestNews}
                                        disabled={testingNews}
                                        className="w-full px-3 py-2 bg-[var(--truth-amber)] hover:bg-[var(--truth-amber)]/80 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <TestTube className="w-4 h-4" />
                                        {testingNews ? 'Testing...' : 'Test Connection'}
                                    </button>

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
                                        Polymarket uses a public API that doesn&apos;t require authentication for basic access.
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
                                    <strong className="text-[var(--citadel-primary)]">💡 Tip:</strong> API keys are configured
                                    server-side via <code className="px-1 py-0.5 rounded bg-[var(--citadel-bg)] text-[var(--text-primary)]">.env</code> and
                                    are never stored in the browser. Toggle &quot;Use Mock Data&quot; to explore the interface with demo
                                    data before configuring real APIs.
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
