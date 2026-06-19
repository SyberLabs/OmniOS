'use client';

// ============================================
// MASLOW'S PYRAMID COMPONENT
// Visual pyramid display for hierarchy of needs
// ============================================

import { motion } from 'framer-motion';
import { FrameworkOverlay, FrameworkLevel } from '@/core/schemas/domain.schema';
import { cn } from '@/lib/utils';

// ============================================
// PROPS INTERFACE
// ============================================

interface MaslowPyramidProps {
    framework: FrameworkOverlay;
    onLevelClick?: (level: FrameworkLevel) => void;
    compact?: boolean;
}

// ============================================
// MASLOW PYRAMID COMPONENT
// ============================================

export function MaslowPyramid({
    framework,
    onLevelClick,
    compact = false
}: MaslowPyramidProps) {
    // Sort levels by sortOrder (ascending = bottom to top)
    const sortedLevels = [...framework.levels].sort((a, b) => b.sortOrder - a.sortOrder);

    return (
        <div className={cn("maslow-pyramid", compact && "maslow-compact")}>
            <h4 className="maslow-title">
                <span className="text-lg">🔺</span>
                {framework.name}
            </h4>

            <div className="pyramid-container">
                {sortedLevels.map((level, index) => {
                    // Calculate width for pyramid shape (top is narrowest)
                    const widthPercent = 40 + (index * 15); // 40% to 100%

                    return (
                        <motion.div
                            key={level.id}
                            className="pyramid-level"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            style={{
                                width: `${widthPercent}%`,
                                '--level-color': level.color
                            } as React.CSSProperties}
                            onClick={() => onLevelClick?.(level)}
                        >
                            {/* Level background with fill based on fulfillment */}
                            <div
                                className="pyramid-level-fill"
                                style={{
                                    width: `${level.fulfillment}%`,
                                    backgroundColor: level.color
                                }}
                            />

                            {/* Level content */}
                            <div className="pyramid-level-content">
                                <span className="pyramid-level-icon">{level.icon}</span>
                                <div className="pyramid-level-info">
                                    <span className="pyramid-level-name">{level.name}</span>
                                    {!compact && (
                                        <span className="pyramid-level-desc">{level.description}</span>
                                    )}
                                </div>
                                <span className="pyramid-level-score">
                                    {level.fulfillment}%
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Overall fulfillment */}
            <div className="maslow-overall">
                <span className="maslow-overall-label">Overall Fulfillment</span>
                <span className="maslow-overall-score">
                    {Math.round(
                        framework.levels.reduce((acc, l) => acc + l.fulfillment, 0) / framework.levels.length
                    )}%
                </span>
            </div>
        </div>
    );
}

export default MaslowPyramid;
