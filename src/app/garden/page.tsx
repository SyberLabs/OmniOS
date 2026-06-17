'use client';

// ============================================
// PROJECT OMNI: THE GARDEN
// Cognitive Core visualization - Real Dynamics
// ============================================

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Orbit, FolderKanban, ArrowLeft, Brain, Network, Plus, Settings, MessageCircle } from 'lucide-react';
import { useCognitiveStore } from '@/core/stores/coreStore';
import { useStabilityStore } from '@/core/stores/stabilityStore';
import { SystemType, LifeSystem, Project } from '@/core/schemas/core.schema';
import { SystemEditor } from '@/components/SystemEditor';
import { CoreMindChat } from '@/components/CoreMindChat';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';

// ============================================
// MAIN GARDEN VIEW
// ============================================

export default function GardenPage() {
    const router = useRouter();
    const { systems, projects, initializeSystems, activateSystemShell, activeContextType, activeContextId } = useCognitiveStore();
    const { initializeModels } = useStabilityStore();
    const [view, setView] = useState<'systems' | 'projects'>('systems');
    const [selectedSystem, setSelectedSystem] = useState<SystemType | null>(null);
    const [editingSystem, setEditingSystem] = useState<SystemType | null>(null);

    // Initialize stability models
    useEffect(() => {
        initializeModels();
    }, [initializeModels]);

    // Initialize systems on first load
    useEffect(() => {
        if (systems.length === 0) {
            initializeSystems();
        }
    }, [systems.length, initializeSystems]);

    return (
        <div className="min-h-screen bg-[var(--citadel-void)] text-[var(--text-primary)]">
            {/* Header */}
            {/* Top Bar with View Toggles */}
            <TopBar>
                <div className="flex items-center gap-2 p-1 bg-[var(--citadel-elevated)] rounded-lg">
                    <button
                        onClick={() => setView('systems')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            view === 'systems'
                                ? "bg-[var(--citadel-primary)] text-white"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                    >
                        <Orbit className="w-3.5 h-3.5" />
                        Systems
                    </button>
                    <button
                        onClick={() => setView('projects')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            view === 'projects'
                                ? "bg-[var(--citadel-primary)] text-white"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                    >
                        <Network className="w-3.5 h-3.5" />
                        Projects
                    </button>
                </div>
            </TopBar>

            {/* Main Content */}
            <main className="relative h-[calc(100vh-65px)] overflow-hidden">
                <AnimatePresence mode="wait">
                    {view === 'systems' ? (
                        <SystemsConstellationView
                            key="systems"
                            systems={systems}
                            selectedSystem={selectedSystem}
                            onSelectSystem={setSelectedSystem}
                            onActivateSystem={(id) => {
                                activateSystemShell(id);
                                router.push(`/garden/system/${id}`);
                            }}
                            onEditSystem={(system) => setEditingSystem(system.id)}
                        />
                    ) : (
                        <ProjectsGridView
                            key="projects"
                            projects={projects}
                        />
                    )}
                </AnimatePresence>

                {/* System Editor Panel */}
                <AnimatePresence>
                    {editingSystem && (
                        <SystemEditor
                            systemId={editingSystem}
                            isOpen={true}
                            onClose={() => setEditingSystem(null)}
                        />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

// ============================================
// SYSTEMS CONSTELLATION VIEW
// ============================================

interface SystemsConstellationViewProps {
    systems: LifeSystem[];
    selectedSystem: SystemType | null;
    onSelectSystem: (id: SystemType | null) => void;
    onActivateSystem: (id: SystemType) => void;
    onEditSystem: (system: LifeSystem) => void;
}

function SystemsConstellationView({
    systems,
    selectedSystem,
    onSelectSystem,
    onActivateSystem,
    onEditSystem
}: SystemsConstellationViewProps) {
    // Pre-computed star positions to avoid hydration mismatch
    const [stars, setStars] = useState<Array<{ left: number; top: number; duration: number; delay: number }>>([]);

    useEffect(() => {
        // Generate stars only on client
        setStars(
            Array.from({ length: 50 }).map(() => ({
                left: Math.random() * 100,
                top: Math.random() * 100,
                duration: 2 + Math.random() * 3,
                delay: Math.random() * 2
            }))
        );
    }, []);

    // Calculate positions in a circular layout
    const getPosition = (index: number, total: number) => {
        const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
        const radius = 280;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        };
    };

    const getStabilityColor = (score: number) => {
        if (score >= 80) return 'var(--truth-green)';
        if (score >= 60) return 'var(--truth-amber)';
        if (score >= 40) return 'var(--citadel-primary)';
        return 'var(--truth-red)';
    };

    const getGradientId = (score: number) => {
        if (score >= 80) return 'grad-green';
        if (score >= 60) return 'grad-amber';
        if (score >= 40) return 'grad-primary';
        return 'grad-red';
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
            {/* Constellation Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)]" />
                {/* Star field effect - client-side only */}
                {stars.map((star, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/20 rounded-full"
                        style={{
                            left: `${star.left}%`,
                            top: `${star.top}%`,
                            animation: `pulse ${star.duration}s ease-in-out infinite`,
                            animationDelay: `${star.delay}s`
                        }}
                    />
                ))}
            </div>

            {/* Shared SVG Layer for Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--truth-green)" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="var(--truth-green)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--truth-amber)" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="var(--truth-amber)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grad-primary" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--citadel-primary)" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="var(--citadel-primary)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--truth-red)" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="var(--truth-red)" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Wrapper for SVG centered at screen center */}
            <div className="absolute flex items-center justify-center pointer-events-none">
                <svg className="overflow-visible w-0 h-0">
                    {systems.map((system, index) => {
                        const pos = getPosition(index, systems.length);
                        const isSelected = selectedSystem === system.id;
                        const gradientId = getGradientId(system.stabilityScore);

                        // Calculate angle for gradient rotation if needed? 
                        // SVG linearGradient defined as 0->100% x is horizontal.
                        // We need the gradient to flow FROM core (0,0) TO node (pos.x, pos.y).
                        // If we use gradientUnits="userSpaceOnUse", we can set x1,y1,x2,y2 dynamically per line!
                        // That's better.

                        return (
                            <React.Fragment key={system.id}>
                                <defs>
                                    <linearGradient id={`line-grad-${system.id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={pos.x} y2={pos.y}>
                                        <stop offset="0%" stopColor={getStabilityColor(system.stabilityScore)} stopOpacity="0.8" />
                                        <stop offset="100%" stopColor={getStabilityColor(system.stabilityScore)} stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <motion.line
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
                                    x1={0}
                                    y1={0}
                                    x2={pos.x}
                                    y2={pos.y}
                                    stroke={`url(#line-grad-${system.id})`}
                                    strokeWidth={isSelected ? 3 : 1.5}
                                    strokeDasharray="none"
                                />
                            </React.Fragment>
                        );
                    })}
                </svg>
            </div>

            {/* Center Core */}
            <motion.div
                className="absolute z-10 flex flex-col items-center justify-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1 }}
            >
                {/* Core Visual */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* Ring System */}
                    <div className="absolute inset-0 rounded-full border border-[var(--citadel-primary)]/30 animate-[spin_10s_linear_infinite]" />
                    <div className="absolute inset-2 rounded-full border border-[var(--citadel-primary)]/20 animate-[spin_15s_linear_infinite_reverse]" />
                    <div className="absolute inset-4 rounded-full border border-[var(--citadel-primary)]/10 animate-[spin_20s_linear_infinite]" />

                    {/* Inner Core Orb (Premium visual) */}
                    <div className="w-16 h-16 rounded-full relative flex items-center justify-center z-10 shadow-[0_0_50px_var(--citadel-primary)]">
                        {/* Main Body */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--citadel-primary)] via-[#6366f1] to-[var(--citadel-void)] opacity-90" />

                        {/* Bevel/Glass Shine */}
                        <div className="absolute inset-[1px] rounded-full bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-60" />

                        {/* Inner Pulsing Light */}
                        <div className="absolute inset-0 rounded-full animate-[pulse_3s_ease-in-out_infinite] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.9)_0%,transparent_60%)] mix-blend-overlay" />
                    </div>
                </div>

                <p className="mt-4 text-xs font-medium text-[var(--text-muted)] tracking-[0.2em] text-center opacity-70">
                    COGNITIVE CORE
                </p>
            </motion.div>

            {/* System Nodes */}
            {systems.map((system, index) => {
                const pos = getPosition(index, systems.length);
                const isSelected = selectedSystem === system.id;
                const stabilityColor = getStabilityColor(system.stabilityScore);

                // Ring calculation
                const radius = 28; // 56px / 2
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (system.stabilityScore / 100) * circumference;

                return (
                    <motion.div
                        key={system.id}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            x: pos.x,
                            y: pos.y
                        }}
                        transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
                        className="absolute z-20 flex items-center justify-center"
                    >
                        <motion.button
                            onClick={() => onSelectSystem(isSelected ? null : system.id)}
                            onDoubleClick={() => onActivateSystem(system.id)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                                "group relative flex flex-col items-center gap-3 transition-all cursor-pointer outline-none",
                                isSelected ? "z-30" : "z-20"
                            )}
                        >
                            {/* Node Orb with Stability Ring */}
                            <div className="w-16 h-16 relative flex items-center justify-center">
                                {/* Glass Background */}
                                <div className={cn(
                                    "absolute inset-1 rounded-full backdrop-blur-md transition-all duration-300",
                                    isSelected
                                        ? "bg-[var(--citadel-elevated)]/90 shadow-[0_0_30px_rgba(99,102,241,0.4)]"
                                        : "bg-[var(--citadel-surface)]/60 hover:bg-[var(--citadel-elevated)]/80"
                                )} />

                                {/* Stability Ring SVG */}
                                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none overflow-visible">
                                    {/* Track */}
                                    <circle
                                        cx="50%" cy="50%" r={radius}
                                        stroke="var(--citadel-border)"
                                        strokeWidth="3"
                                        fill="none"
                                        className="opacity-50"
                                    />
                                    {/* Progress */}
                                    <circle
                                        cx="50%" cy="50%" r={radius}
                                        stroke={stabilityColor}
                                        strokeWidth="3"
                                        fill="none"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={offset}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out drop-shadow-[0_0_2px_currentColor]"
                                    />
                                </svg>

                                {/* Icon */}
                                <span className={cn(
                                    "relative z-10 text-xl transition-transform duration-300",
                                    isSelected ? "scale-110" : "group-hover:scale-110"
                                )}>
                                    {system.icon}
                                </span>
                            </div>

                            {/* Label */}
                            <div className={cn(
                                "absolute top-full mt-1 flex flex-col items-center whitespace-nowrap transition-all duration-300",
                                isSelected ? "opacity-100 translate-y-0" : "opacity-60 group-hover:opacity-100 group-hover:translate-y-0"
                            )}>
                                <span className="text-xs font-semibold text-[var(--text-primary)]">
                                    {system.name}
                                </span>
                                <span className="text-[10px] font-mono" style={{ color: stabilityColor }}>
                                    {system.stabilityScore}%
                                </span>
                            </div>
                        </motion.button>
                    </motion.div>
                );
            })}

            {/* System Detail Panel */}
            <AnimatePresence>
                {selectedSystem && (
                    <SystemDetailPanel
                        system={systems.find(s => s.id === selectedSystem)!}
                        onClose={() => onSelectSystem(null)}
                        onActivate={() => onActivateSystem(selectedSystem)}
                        onEdit={() => {
                            const sys = systems.find(s => s.id === selectedSystem);
                            if (sys) onEditSystem(sys);
                        }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ============================================
// SYSTEM DETAIL PANEL
// ============================================

interface SystemDetailPanelProps {
    system: LifeSystem;
    onClose: () => void;
    onActivate: () => void;
    onEdit: () => void;
}

function SystemDetailPanel({ system, onClose, onActivate, onEdit }: SystemDetailPanelProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-[var(--citadel-surface)] border-l border-[var(--citadel-border)] p-6 overflow-y-auto"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{system.icon}</span>
                    <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">{system.name}</h3>
                        <p className="text-xs text-[var(--text-muted)]">{system.description}</p>
                    </div>
                </div>
            </div>

            {/* Stability Score */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">Stability</span>
                    <span className="text-sm font-mono text-[var(--text-primary)]">{system.stabilityScore}%</span>
                </div>
                <div className="h-2 bg-[var(--citadel-border)] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${system.stabilityScore}%` }}
                        style={{
                            background: system.stabilityScore >= 70
                                ? 'var(--truth-green)'
                                : system.stabilityScore >= 40
                                    ? 'var(--truth-amber)'
                                    : 'var(--truth-red)'
                        }}
                    />
                </div>
            </div>

            {/* Attributes */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Attributes</h4>
                <div className="space-y-3">
                    {system.attributes.map(attr => (
                        <div key={attr.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-[var(--text-primary)]">{attr.name}</span>
                                {attr.trend === 'up' && <span className="text-xs text-[var(--truth-green)]">↑</span>}
                                {attr.trend === 'down' && <span className="text-xs text-[var(--truth-red)]">↓</span>}
                            </div>
                            <span className="text-sm font-mono text-[var(--text-muted)]">
                                {attr.value}{attr.unit ? ` ${attr.unit}` : '%'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
                <button
                    onClick={onEdit}
                    className="w-full px-4 py-2 bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] text-[var(--text-primary)] rounded-lg hover:border-[var(--citadel-primary)] transition-colors flex items-center justify-center gap-2"
                >
                    <Settings className="w-4 h-4" />
                    Edit System
                </button>
                <button
                    onClick={onActivate}
                    className="w-full px-4 py-2 bg-[var(--citadel-primary)] text-white rounded-lg hover:bg-[var(--citadel-primary-glow)] transition-colors"
                >
                    Activate {system.name} Mind
                </button>
                <button
                    onClick={onClose}
                    className="w-full px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    Close
                </button>
            </div>
        </motion.div>
    );
}

// ============================================
// PROJECTS GRID VIEW
// ============================================

interface ProjectsGridViewProps {
    projects: Project[];
}

function ProjectsGridView({ projects }: ProjectsGridViewProps) {
    const { createProject } = useCognitiveStore();
    const [chatProject, setChatProject] = useState<Project | null>(null);

    const handleCreateProject = () => {
        const name = prompt('Project name:');
        if (name) {
            createProject(name, '🚀');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-8"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Create New Project Card */}
                <motion.button
                    onClick={handleCreateProject}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-[var(--citadel-border)] hover:border-[var(--citadel-primary)] hover:bg-[var(--citadel-elevated)]/50 transition-all min-h-48"
                >
                    <div className="w-12 h-12 rounded-full bg-[var(--citadel-elevated)] flex items-center justify-center">
                        <Plus className="w-6 h-6 text-[var(--text-muted)]" />
                    </div>
                    <span className="text-sm text-[var(--text-muted)]">New Project</span>
                </motion.button>

                {/* Project Cards */}
                {projects.map((project, index) => (
                    <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex flex-col p-6 rounded-2xl bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] hover:border-[var(--citadel-primary)] transition-all cursor-pointer min-h-48"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <span className="text-3xl">{project.icon}</span>
                            <span className={cn(
                                "px-2 py-1 text-xs rounded-full",
                                project.state === 'active'
                                    ? "bg-[var(--truth-green)]/20 text-[var(--truth-green)]"
                                    : "bg-[var(--citadel-border)] text-[var(--text-muted)]"
                            )}>
                                {project.state}
                            </span>
                        </div>

                        <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                            {project.name}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-4 flex-1">
                            {project.description || 'No description'}
                        </p>

                        {/* Linked Systems */}
                        {project.linkedSystems.length > 0 && (
                            <div className="flex items-center gap-1 mb-3">
                                <span className="text-xs text-[var(--text-muted)]">Linked:</span>
                                <div className="flex gap-1">
                                    {project.linkedSystems.slice(0, 3).map(sysId => (
                                        <span key={sysId} className="text-sm">
                                            {sysId === 'health' ? '🏥' :
                                                sysId === 'career' ? '💼' :
                                                    sysId === 'finance' ? '💰' :
                                                        sysId === 'mind' ? '🧠' :
                                                            sysId === 'relationships' ? '💞' :
                                                                sysId === 'environment' ? '🏠' : '⏳'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Chat Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setChatProject(project);
                            }}
                            className="w-full mt-auto px-3 py-2 text-xs bg-[var(--citadel-surface)] border border-[var(--citadel-border)] rounded-lg hover:border-[var(--citadel-primary)] transition-colors flex items-center justify-center gap-2"
                        >
                            <MessageCircle className="w-3 h-3" />
                            Chat with Core Mind
                        </button>
                    </motion.div>
                ))}
            </div>

            {/* Core Mind Chat */}
            <AnimatePresence>
                {chatProject && (
                    <CoreMindChat
                        project={chatProject}
                        isOpen={true}
                        onClose={() => setChatProject(null)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
