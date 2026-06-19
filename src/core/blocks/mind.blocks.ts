// ============================================
// MIND SYSTEM SPECIALIZED BLOCKS
// Block definitions for Mind/Cognition sub-domains
// ============================================

import { OmniBlockSchema } from '../schemas/block.schema';

// ============================================
// COGNITIVE BLOCKS
// ============================================

export const THOUGHT_JOURNAL_BLOCK: OmniBlockSchema = {
    block_id: 'mind.thought_journal',
    display_name: 'Thought Journal',
    category: 'mind_system',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['mind', 'thoughts', 'journal', 'stream', 'consciousness'],
    wiring_logic: 'Stream of consciousness capture and reflection',
    icon: '💭',
    description: 'Stream of consciousness capture',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'mind',
    ports: [
        { id: 'thoughts_out', direction: 'output', dataType: 'text', label: 'Thought Stream' }
    ]
};

export const IDEA_CAPTURE_BLOCK: OmniBlockSchema = {
    block_id: 'mind.idea_capture',
    display_name: 'Idea Capture',
    category: 'mind_system',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['mind', 'ideas', 'inspiration', 'creativity', 'brainstorm'],
    wiring_logic: 'Quick capture of ideas and inspirations',
    icon: '💡',
    description: 'Quick idea and inspiration capture',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'mind',
    ports: [
        { id: 'ideas_out', direction: 'output', dataType: 'json', label: 'Idea Bank' }
    ]
};

export const MEMORY_PALACE_BLOCK: OmniBlockSchema = {
    block_id: 'mind.memory_palace',
    display_name: 'Memory Palace',
    category: 'mind_system',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['mind', 'memory', 'learning', 'flashcards', 'spaced-repetition'],
    wiring_logic: 'Spaced repetition system for learning retention',
    icon: '🏛️',
    description: 'Spaced repetition flashcards for learning',
    expandMode: 'portal',
    isUserCreatable: true,
    systemId: 'mind',
    ports: [
        { id: 'cards_out', direction: 'output', dataType: 'json', label: 'Review Queue' }
    ]
};

// ============================================
// EMOTIONAL BLOCKS
// ============================================

export const MOOD_TRACKER_BLOCK: OmniBlockSchema = {
    block_id: 'mind.mood_tracker',
    display_name: 'Mood Tracker',
    category: 'mind_system',
    data_type: 'biometric',
    refresh_rate: 'manual',
    semantic_tags: ['mind', 'mood', 'emotions', 'feelings', 'wellbeing'],
    wiring_logic: 'Track emotional states and identify patterns',
    icon: '🎭',
    description: 'Daily emotional check-ins and patterns',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'mind',
    ports: [
        { id: 'mood_out', direction: 'output', dataType: 'json', label: 'Mood Data' }
    ]
};

export const ANXIETY_LOG_BLOCK: OmniBlockSchema = {
    block_id: 'mind.anxiety_log',
    display_name: 'Anxiety Log',
    category: 'mind_system',
    data_type: 'biometric',
    refresh_rate: 'manual',
    semantic_tags: ['mind', 'anxiety', 'triggers', 'coping', 'mental-health'],
    wiring_logic: 'Track anxiety triggers and coping strategies',
    icon: '😰',
    description: 'Track anxiety triggers and coping strategies',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'mind',
    ports: [
        { id: 'anxiety_out', direction: 'output', dataType: 'json', label: 'Anxiety Patterns' }
    ]
};

export const JOY_LOG_BLOCK: OmniBlockSchema = {
    block_id: 'mind.joy_log',
    display_name: 'Joy Log',
    category: 'mind_system',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['mind', 'joy', 'happiness', 'positive', 'gratitude'],
    wiring_logic: 'Capture moments of joy and happiness',
    icon: '😊',
    description: 'Capture moments of joy and happiness',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'mind',
    ports: [
        { id: 'joy_out', direction: 'output', dataType: 'json', label: 'Joy Moments' }
    ]
};

// ============================================
// CONSCIOUSNESS BLOCKS
// ============================================

export const FLOW_STATE_LOG_BLOCK: OmniBlockSchema = {
    block_id: 'mind.flow_state_log',
    display_name: 'Flow State Log',
    category: 'mind_system',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['mind', 'flow', 'peak-performance', 'focus', 'zone'],
    wiring_logic: 'Track peak performance and flow state moments',
    icon: '⚡',
    description: 'Track peak performance and flow states',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'mind',
    ports: [
        { id: 'flow_out', direction: 'output', dataType: 'json', label: 'Flow Data' }
    ]
};

export const DREAM_JOURNAL_BLOCK: OmniBlockSchema = {
    block_id: 'mind.dream_journal',
    display_name: 'Dream Journal',
    category: 'mind_system',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['mind', 'dreams', 'subconscious', 'sleep', 'lucid'],
    wiring_logic: 'Record and analyze dreams for insights',
    icon: '🌙',
    description: 'Record and analyze dreams',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'mind',
    ports: [
        { id: 'dreams_out', direction: 'output', dataType: 'text', label: 'Dream Log' }
    ]
};

// ============================================
// ALL MIND BLOCKS REGISTRY
// ============================================

export const MIND_BLOCKS: OmniBlockSchema[] = [
    // Cognitive
    THOUGHT_JOURNAL_BLOCK,
    IDEA_CAPTURE_BLOCK,
    MEMORY_PALACE_BLOCK,
    // Emotional
    MOOD_TRACKER_BLOCK,
    ANXIETY_LOG_BLOCK,
    JOY_LOG_BLOCK,
    // Consciousness
    FLOW_STATE_LOG_BLOCK,
    DREAM_JOURNAL_BLOCK
];

export default MIND_BLOCKS;
