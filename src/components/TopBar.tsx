'use client';

// ============================================
// PROJECT OMNI: TOP BAR (Refined)
// Clean separation: Logo | Tools | Command | Status | Settings
// ============================================

import {
    Command,
    Palette,
    Settings,
    Shield,
    Wifi,
    Database,
    Key,
    MousePointer2,
    Highlighter,
    ChevronRight,
    Layers
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useShellStore, useSettingsStore, useUIStore, useToolStore } from '@/core/stores';
import { useApiStore } from '@/core/stores/apiStore';
import { LlmStatusPill } from './LlmStatusPill';
import { cn } from '@/lib/utils';
import { useClientMounted } from '@/core/hooks';

export function TopBar({
    onOpenSkin,
    onOpenApi,
    onOpenSettings,
    onOpenShells,
    children,
    customRight
}: {
    onOpenSkin?: () => void;
    onOpenApi?: () => void;
    onOpenSettings?: () => void;
    onOpenShells?: () => void;
    children?: React.ReactNode;
    customRight?: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { getActiveShell } = useShellStore();
    const { useMockData, toggleMockData } = useSettingsStore();
    const { openCommandPalette } = useUIStore();
    const { activeTool, setTool } = useToolStore();
    const { installedApis } = useApiStore();

    const hasMounted = useClientMounted();

    const activeShell = hasMounted ? getActiveShell() : undefined;
    const isHome = pathname === '/';

    // Helper to generate breadcrumbs
    const renderBreadcrumbs = () => {
        if (isHome) {
            return (
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--citadel-primary)] to-[var(--citadel-accent)] flex items-center justify-center">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-[var(--text-primary)]">
                                The Citadel
                            </h1>
                            <p className="text-[10px] text-[var(--text-muted)] -mt-0.5">
                                Project Omni
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        const parts = pathname.split('/').filter(Boolean);

        return (
            <div className="flex items-center gap-1">
                <button
                    onClick={() => router.push('/')}
                    className="p-1.5 rounded-md hover:bg-[var(--citadel-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="Back to Citadel"
                >
                    <Shield className="w-4 h-4" />
                </button>

                {parts.map((part, index) => {
                    const isLast = index === parts.length - 1;
                    const path = `/${parts.slice(0, index + 1).join('/')}`;
                    const label = part.charAt(0).toUpperCase() + part.slice(1);

                    // Paths that are just structural containers and don't have pages
                    const isNonClickable = path === '/garden/system';

                    return (
                        <div key={path} className="flex items-center gap-1">
                            <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                            {isLast || isNonClickable ? (
                                <span className={cn(
                                    "text-sm",
                                    isLast ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                                )}>
                                    {label}
                                </span>
                            ) : (
                                <button
                                    onClick={() => router.push(path)}
                                    className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline transition-all"
                                >
                                    {label}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <header className="topbar flex items-center justify-between px-4 py-2 bg-[var(--citadel-surface)] border-b border-[var(--citadel-border)] h-[56px]">
            {/* Left: Breadcrumbs / Logo */}
            <div className="flex items-center gap-4">
                {renderBreadcrumbs()}

                {/* Vertical Divider if not Home */}
                {!isHome && <div className="w-px h-6 bg-[var(--citadel-border)]" />}

                {/* Current Shell (Only on Home/Citadel) */}
                {isHome && activeShell && (
                    <>
                        <div className="w-px h-6 bg-[var(--citadel-border)]" />
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--citadel-elevated)] rounded-lg border border-[var(--citadel-border)]">
                            <span className="text-xs text-[var(--text-muted)]">Shell:</span>
                            <span className="text-xs font-medium text-[var(--text-primary)]">
                                {activeShell.name}
                            </span>
                        </div>
                    </>
                )}

                {/* Shell Manager + Tool Strip (Only on Home/Citadel) */}
                {isHome && (
                    <>
                        {/* Shell Manager Button */}
                        <button
                            onClick={onOpenShells}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--citadel-elevated)] rounded-lg border border-[var(--citadel-border)] hover:border-[var(--citadel-primary)] transition-all"
                            title="Shell Manager"
                        >
                            <Layers className="w-3.5 h-3.5 text-[var(--citadel-primary)]" />
                            <span className="text-xs font-medium text-[var(--text-primary)]">Shells</span>
                        </button>

                        <div className="w-px h-6 bg-[var(--citadel-border)]" />

                        {/* Tool Strip */}
                        <div className="flex items-center gap-1 px-2 py-1 bg-[var(--citadel-elevated)] rounded-lg border border-[var(--citadel-border)]">
                            <button
                                onClick={() => setTool('navigate')}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-all",
                                    activeTool === 'navigate'
                                        ? "bg-[var(--citadel-primary)]/20 text-[var(--citadel-primary)]"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--citadel-surface)]"
                                )}
                                title="Navigate (V)"
                            >
                                <MousePointer2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Navigate</span>
                            </button>
                            <button
                                onClick={() => setTool('highlighter')}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-all",
                                    activeTool === 'highlighter'
                                        ? "bg-[var(--cyan-glow)]/20 text-[var(--cyan-glow)]"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--citadel-surface)]"
                                )}
                                title="Context Highlighter (H)"
                            >
                                <Highlighter className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Highlight</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Center: Children usually, or Command Palette */}
            <div className="flex-1 flex justify-center px-4">
                {children || (
                    <button
                        onClick={openCommandPalette}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] rounded-lg hover:border-[var(--citadel-primary)] transition-colors group max-w-sm w-full"
                    >
                        <Command className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--citadel-primary)]" />
                        <span className="text-sm text-[var(--text-muted)] truncate">
                            Search commands...
                        </span>
                        <kbd className="ml-auto px-1.5 py-0.5 text-[10px] font-mono bg-[var(--citadel-surface)] rounded text-[var(--text-muted)]">
                            ⌘K
                        </kbd>
                    </button>
                )}
            </div>

            {/* Right: Custom Content + Status Bar */}
            <div className="flex items-center gap-2">
                {customRight}

                {/* Status Bar Group (Only on Home or when relevant) */}
                <div className="flex items-center gap-1 px-2 py-1 bg-[var(--citadel-elevated)] rounded-lg border border-[var(--citadel-border)]">

                    <div className="w-px h-4 bg-[var(--citadel-border)]" />

                    {/* LLM availability (startup ping; click to re-check) */}
                    <LlmStatusPill />

                    <div className="w-px h-4 bg-[var(--citadel-border)]" />

                    {/* Data Mode (Live/Mock) */}
                    <button
                        onClick={toggleMockData}
                        className={cn(
                            "flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors",
                            useMockData
                                ? "text-[var(--truth-amber)] hover:bg-[var(--truth-amber)]/10"
                                : "text-[var(--truth-green)] hover:bg-[var(--truth-green)]/10"
                        )}
                        title={useMockData ? "Using mock data - click to try live API" : "Using live API"}
                    >
                        {useMockData ? (
                            <Database className="w-3.5 h-3.5" />
                        ) : (
                            <Wifi className="w-3.5 h-3.5" />
                        )}
                    </button>

                    <div className="w-px h-4 bg-[var(--citadel-border)]" />

                    {/* API Dashboard */}
                    <button
                        onClick={onOpenApi}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-[var(--citadel-primary)] hover:bg-[var(--citadel-primary)]/10 transition-colors"
                        title="API Dashboard"
                    >
                        <Key className="w-3.5 h-3.5" />
                        {hasMounted && installedApis.length > 0 && (
                            <span className="px-1 py-0.5 text-[10px] font-medium bg-[var(--citadel-primary)]/20 rounded ml-1">
                                {installedApis.length}
                            </span>
                        )}
                    </button>

                    <div className="w-px h-4 bg-[var(--citadel-border)]" />

                    {/* SKIN Button */}
                    <button
                        onClick={onOpenSkin}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--citadel-surface)] transition-colors"
                        title="Appearance Settings"
                    >
                        <Palette className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Settings */}
                <button
                    onClick={onOpenSettings}
                    className="p-2 rounded-lg hover:bg-[var(--citadel-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="System Settings"
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}


export default TopBar;
