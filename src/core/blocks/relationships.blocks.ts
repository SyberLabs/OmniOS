// ============================================
// RELATIONSHIPS SYSTEM SPECIALIZED BLOCKS
// Block definitions for Relationships sub-domains
// ============================================

import { OmniBlockSchema } from '../schemas/block.schema';

// ============================================
// INNER CIRCLE BLOCKS
// ============================================

export const CONTACT_HUB_BLOCK: OmniBlockSchema = {
    block_id: 'relationships.contact_hub',
    display_name: 'Contact Hub',
    category: 'relationships',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['relationships', 'contacts', 'people', 'connections', 'crm'],
    wiring_logic: 'Central hub for key relationships and contact info',
    icon: '👥',
    description: 'Key people and relationship health scores',
    expandMode: 'portal',
    isUserCreatable: true,
    systemId: 'relationships',
    ports: [
        { id: 'contacts_out', direction: 'output', dataType: 'json', label: 'Contact Data' }
    ],
    subscribedGraphId: 'relationships.inner_circle',
    graphNodeMapping: {
        'trust_level': 'trust_level',
        'depth': 'connection_depth'
    }
};

export const INTERACTION_LOG_BLOCK: OmniBlockSchema = {
    block_id: 'relationships.interaction_log',
    display_name: 'Interaction Log',
    category: 'relationships',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['relationships', 'interactions', 'conversations', 'touchpoints', 'history'],
    wiring_logic: 'Track meaningful interactions and conversation notes',
    icon: '💬',
    description: 'Track meaningful connections and conversations',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'relationships',
    ports: [
        { id: 'interactions_out', direction: 'output', dataType: 'json', label: 'Interaction History' }
    ],
    subscribedGraphId: 'relationships.inner_circle',
    graphNodeMapping: {
        'count': 'interactions'
    }
};

export const DATE_PLANNER_BLOCK: OmniBlockSchema = {
    block_id: 'relationships.date_planner',
    display_name: 'Date Planner',
    category: 'relationships',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['relationships', 'dates', 'quality-time', 'partner', 'romance'],
    wiring_logic: 'Plan and track quality time with partner',
    icon: '❤️',
    description: 'Plan quality time and romantic dates',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'relationships',
    ports: [
        { id: 'dates_out', direction: 'output', dataType: 'json', label: 'Date Ideas' }
    ]
};

// ============================================
// COMMUNITY BLOCKS
// ============================================

export const GIFT_TRACKER_BLOCK: OmniBlockSchema = {
    block_id: 'relationships.gift_tracker',
    display_name: 'Gift Tracker',
    category: 'relationships',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['relationships', 'gifts', 'birthdays', 'occasions', 'presents'],
    wiring_logic: 'Track birthdays, occasions, and gift ideas',
    icon: '🎁',
    description: 'Track birthdays, occasions, and gift ideas',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'relationships',
    ports: [
        { id: 'gifts_out', direction: 'output', dataType: 'json', label: 'Gift Calendar' }
    ]
};

export const GROUP_MANAGER_BLOCK: OmniBlockSchema = {
    block_id: 'relationships.group_manager',
    display_name: 'Group Manager',
    category: 'relationships',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['relationships', 'groups', 'communities', 'social', 'clubs'],
    wiring_logic: 'Manage social groups and community involvement',
    icon: '👨‍👩‍👧‍👦',
    description: 'Manage social groups and community events',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'relationships',
    ports: [
        { id: 'groups_out', direction: 'output', dataType: 'json', label: 'Group Data' }
    ],
    subscribedGraphId: 'relationships.community',
    graphNodeMapping: {
        'battery_drain': 'social_battery',
        'event_count': 'events_attended'
    }
};

export const FAMILY_TREE_BLOCK: OmniBlockSchema = {
    block_id: 'relationships.family_tree',
    display_name: 'Family Tree',
    category: 'relationships',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['relationships', 'family', 'genealogy', 'relatives', 'heritage'],
    wiring_logic: 'Visualize family connections and heritage',
    icon: '🌳',
    description: 'Visualize family connections and history',
    expandMode: 'portal',
    isUserCreatable: true,
    systemId: 'relationships',
    ports: [
        { id: 'family_out', direction: 'output', dataType: 'json', label: 'Family Data' }
    ]
};

// ============================================
// CONFLICT & GROWTH BLOCKS
// ============================================

export const CONFLICT_RESOLUTION_BLOCK: OmniBlockSchema = {
    block_id: 'relationships.conflict_resolution',
    display_name: 'Conflict Resolution',
    category: 'relationships',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['relationships', 'conflicts', 'resolution', 'growth', 'communication'],
    wiring_logic: 'Track and work through relationship tensions',
    icon: '🤝',
    description: 'Track and resolve relationship tensions',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'relationships',
    ports: [
        { id: 'conflicts_out', direction: 'output', dataType: 'json', label: 'Conflict Status' }
    ]
};

export const GRATITUDE_LETTERS_BLOCK: OmniBlockSchema = {
    block_id: 'relationships.gratitude_letters',
    display_name: 'Gratitude Letters',
    category: 'relationships',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['relationships', 'gratitude', 'appreciation', 'letters', 'love'],
    wiring_logic: 'Write appreciation letters to important people',
    icon: '💌',
    description: 'Write appreciation letters to loved ones',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'relationships',
    ports: [
        { id: 'letters_out', direction: 'output', dataType: 'text', label: 'Letters' }
    ]
};

// ============================================
// ALL RELATIONSHIPS BLOCKS REGISTRY
// ============================================

export const RELATIONSHIPS_BLOCKS: OmniBlockSchema[] = [
    // Inner Circle
    CONTACT_HUB_BLOCK,
    INTERACTION_LOG_BLOCK,
    DATE_PLANNER_BLOCK,
    // Community
    GIFT_TRACKER_BLOCK,
    GROUP_MANAGER_BLOCK,
    FAMILY_TREE_BLOCK,
    // Conflict & Growth
    CONFLICT_RESOLUTION_BLOCK,
    GRATITUDE_LETTERS_BLOCK
];

export default RELATIONSHIPS_BLOCKS;
