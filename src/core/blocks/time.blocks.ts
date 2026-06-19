// ============================================
// TIME SYSTEM SPECIALIZED BLOCKS
// Block definitions for Time sub-domains
// ============================================

import { OmniBlockSchema } from '../schemas/block.schema';

// ============================================
// PRESENT BLOCKS
// ============================================

export const TIME_AUDIT_BLOCK: OmniBlockSchema = {
    block_id: 'time.time_audit',
    display_name: 'Time Audit',
    category: 'time',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['time', 'audit', 'analysis', 'where-time-goes', 'tracking'],
    wiring_logic: 'Analyze where time actually goes',
    icon: '⏱️',
    description: 'Analyze where your time actually goes',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'time',
    ports: [
        { id: 'audit_out', direction: 'output', dataType: 'json', label: 'Time Analysis' }
    ]
};

export const ROUTINE_BUILDER_BLOCK: OmniBlockSchema = {
    block_id: 'time.routine_builder',
    display_name: 'Routine Builder',
    category: 'time',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['time', 'routines', 'morning', 'evening', 'habits'],
    wiring_logic: 'Build and track morning/evening routines',
    icon: '🌅',
    description: 'Build morning and evening routines',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'time',
    ports: [
        { id: 'routines_out', direction: 'output', dataType: 'json', label: 'Routine Status' }
    ]
};

export const WEEKLY_REVIEW_BLOCK: OmniBlockSchema = {
    block_id: 'time.weekly_review',
    display_name: 'Weekly Review',
    category: 'time',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['time', 'review', 'reflection', 'planning', 'weekly'],
    wiring_logic: 'Weekly reflection and planning ritual',
    icon: '📋',
    description: 'Weekly reflection and planning',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'time',
    ports: [
        { id: 'review_out', direction: 'output', dataType: 'text', label: 'Weekly Review' }
    ]
};

export const HABIT_STREAKS_BLOCK: OmniBlockSchema = {
    block_id: 'time.habit_streaks',
    display_name: 'Habit Streaks',
    category: 'time',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['time', 'habits', 'streaks', 'consistency', 'daily'],
    wiring_logic: 'Track daily habit streaks and consistency',
    icon: '🔥',
    description: 'Track daily habit streaks',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'time',
    ports: [
        { id: 'habits_out', direction: 'output', dataType: 'json', label: 'Habit Data' }
    ]
};

// ============================================
// FUTURE BLOCKS
// ============================================

export const GOAL_TRACKER_BLOCK: OmniBlockSchema = {
    block_id: 'time.goal_tracker',
    display_name: 'Goal Tracker',
    category: 'time',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['time', 'goals', 'objectives', 'milestones', 'progress'],
    wiring_logic: 'Track long-term goals and milestones',
    icon: '🎯',
    description: 'Track long-term goal progress',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'time',
    ports: [
        { id: 'goals_out', direction: 'output', dataType: 'json', label: 'Goal Progress' }
    ]
};

export const LIFE_CALENDAR_BLOCK: OmniBlockSchema = {
    block_id: 'time.life_calendar',
    display_name: 'Life Calendar',
    category: 'time',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['time', 'life', 'calendar', 'weeks', 'mortality'],
    wiring_logic: 'Visualize life in weeks - memento mori',
    icon: '📆',
    description: 'Visualize your life in weeks',
    expandMode: 'portal',
    isUserCreatable: true,
    systemId: 'time',
    ports: [
        { id: 'life_out', direction: 'output', dataType: 'json', label: 'Life Data' }
    ]
};

export const BUCKET_LIST_BLOCK: OmniBlockSchema = {
    block_id: 'time.bucket_list',
    display_name: 'Bucket List',
    category: 'time',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['time', 'bucket-list', 'experiences', 'dreams', 'adventures'],
    wiring_logic: 'Track life experiences and dreams',
    icon: '🪣',
    description: 'Track life experiences to have',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'time',
    ports: [
        { id: 'bucket_out', direction: 'output', dataType: 'json', label: 'Bucket Items' }
    ]
};

// ============================================
// LEGACY BLOCKS
// ============================================

export const LEGACY_JOURNAL_BLOCK: OmniBlockSchema = {
    block_id: 'time.legacy_journal',
    display_name: 'Legacy Journal',
    category: 'time',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['time', 'legacy', 'impact', 'contribution', 'meaning'],
    wiring_logic: 'Reflect on the legacy you want to leave',
    icon: '📜',
    description: 'Document the legacy you want to leave',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'time',
    ports: [
        { id: 'legacy_out', direction: 'output', dataType: 'text', label: 'Legacy Statement' }
    ]
};

// ============================================
// ALL TIME BLOCKS REGISTRY
// ============================================

export const TIME_BLOCKS: OmniBlockSchema[] = [
    // Present
    TIME_AUDIT_BLOCK,
    ROUTINE_BUILDER_BLOCK,
    WEEKLY_REVIEW_BLOCK,
    HABIT_STREAKS_BLOCK,
    // Future
    GOAL_TRACKER_BLOCK,
    LIFE_CALENDAR_BLOCK,
    BUCKET_LIST_BLOCK,
    // Legacy
    LEGACY_JOURNAL_BLOCK
];

export default TIME_BLOCKS;
