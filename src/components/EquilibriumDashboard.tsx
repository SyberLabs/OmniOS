import React, { useEffect, useMemo } from 'react';
import { useEquilibriumStore } from '@/core/stores/equilibrium.store';
import { useGraphPoolStore } from '@/core/stores/graphPool.store';
import { SystemType } from '@/core/schemas/core.schema';
import { AlertCircle, Zap, Shield, Activity, TrendingDown, TrendingUp, CheckCircle2 } from 'lucide-react';

export const EquilibriumDashboard: React.FC = () => {
    const { 
        entropy, 
        alerts, 
        initializeEquilibrium, 
        evaluateRules, 
        dismissAlert,
        isProcessing
    } = useEquilibriumStore();
    const { pools } = useGraphPoolStore();

    useEffect(() => {
        initializeEquilibrium();
    }, []);

    // Periodic evaluation
    useEffect(() => {
        const interval = setInterval(() => {
            evaluateRules();
        }, 30000); // Every 30 seconds
        return () => clearInterval(interval);
    }, [evaluateRules]);

    const activeAlerts = useMemo(() => alerts.filter(a => !a.isDismissed), [alerts]);

    const systemBalance = useMemo(() => {
        const trinities: Record<string, number> = {
            health: 50,
            career: 50,
            finance: 50
        };

        ['health', 'career', 'finance'].forEach(sysId => {
            const pool = pools[sysId as SystemType];
            if (pool) {
                const coreGraph = pool.graphs.find(g => g.id.includes('.core') || g.id.includes('.performance') || g.id.includes('.liquidity'));
                const stabilityNode = coreGraph?.nodes.find(n => n.id.includes('stability') || n.id === 'focus' || n.id === 'runway');
                trinities[sysId] = stabilityNode?.value ?? 50;
            }
        });

        return trinities;
    }, [pools]);

    const getEntropyColor = (e: number) => {
        if (e < 20) return 'text-emerald-400';
        if (e < 40) return 'text-blue-400';
        if (e < 60) return 'text-yellow-400';
        if (e < 80) return 'text-orange-500';
        return 'text-red-500';
    };

    return (
        <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800 backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Activity className="text-indigo-400" />
                        System Equilibrium
                    </h2>
                    <p className="text-slate-400 text-sm">Real-time cross-system balance engine</p>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`text-4xl font-mono font-black ${getEntropyColor(entropy)}`}>
                        {entropy}<span className="text-lg opacity-50">%</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Entropy Level</span>
                </div>
            </div>

            {/* Trinity Balance Visualization */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {Object.entries(systemBalance).map(([id, value]) => (
                    <div key={id} className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/50 text-center">
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">{id}</div>
                        <div className={`text-2xl font-mono font-bold ${value > 70 ? 'text-emerald-400' : value > 40 ? 'text-blue-400' : 'text-red-400'}`}>
                            {value}%
                        </div>
                        <div className="w-full bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ${value > 70 ? 'bg-emerald-500' : value > 40 ? 'bg-blue-500' : 'bg-red-500'}`}
                                style={{ width: `${value}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Master Rule Alerts */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={14} />
                    Active Master Logic Alerts
                </h3>
                
                {activeAlerts.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                        <CheckCircle2 size={18} />
                        System is in high-order equilibrium. No cross-rules triggered.
                    </div>
                ) : (
                    activeAlerts.map(alert => (
                        <div 
                            key={alert.id}
                            className={`flex items-start gap-3 p-4 rounded-lg border animate-in fade-in slide-in-from-right-4 duration-300 ${
                                alert.severity === 'critical' || alert.severity === 'emergency' 
                                    ? 'bg-red-500/10 border-red-500/30 text-red-200' 
                                    : 'bg-orange-500/10 border-orange-500/30 text-orange-200'
                            }`}
                        >
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <div className="text-sm font-semibold">{alert.message}</div>
                                <div className="text-[10px] opacity-60 mt-1 flex items-center gap-2">
                                    {new Date(alert.timestamp).toLocaleTimeString()} • {alert.severity.toUpperCase()} PRIORITY
                                    <button 
                                        onClick={() => dismissAlert(alert.id)}
                                        className="ml-auto underline decoration-dotted hover:text-white"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isProcessing && (
                <div className="mt-4 flex justify-center">
                    <div className="flex gap-1">
                        <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            )}
        </div>
    );
};
