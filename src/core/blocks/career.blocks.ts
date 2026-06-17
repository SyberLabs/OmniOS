// ============================================
// CAREER SYSTEM SPECIALIZED BLOCKS
// Block definitions for Career sub-domains
// ============================================

import { OmniBlockSchema } from '../schemas/block.schema';

// ============================================
// WORK BLOCKS
// ============================================

export const PROJECT_TRACKER_BLOCK: OmniBlockSchema = {
    block_id: 'career.project_tracker',
    display_name: 'Project Tracker',
    category: 'career',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['career', 'projects', 'milestones', 'work', 'progress'],
    wiring_logic: 'Tracks active projects and milestones for Career Mind',
    icon: '📊',
    description: 'Track active projects, milestones, and deliverables',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'career',
    ports: [
        { id: 'projects_out', direction: 'output', dataType: 'json', label: 'Project Data' }
    ],
    subscribedGraphId: 'career.performance',
    graphNodeMapping: {
        'velocity': 'project_velocity'
    }
};

export const TASK_MANAGER_BLOCK: OmniBlockSchema = {
    block_id: 'career.task_manager',
    display_name: 'Task Manager',
    category: 'career',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['career', 'tasks', 'todo', 'productivity', 'work'],
    wiring_logic: 'Daily and weekly task management with priorities',
    icon: '✅',
    description: 'Manage daily and weekly tasks with priorities',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'career',
    ports: [
        { id: 'tasks_out', direction: 'output', dataType: 'json', label: 'Task List' }
    ],
    subscribedGraphId: 'career.performance',
    graphNodeMapping: {
        'completed': 'tasks_completed'
    }
};

export const MEETING_NOTES_BLOCK: OmniBlockSchema = {
    block_id: 'career.meeting_notes',
    display_name: 'Meeting Notes',
    category: 'career',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['career', 'meetings', 'notes', 'decisions', 'action-items'],
    wiring_logic: 'Capture and organize meeting insights and action items',
    icon: '📝',
    description: 'Capture meeting insights, decisions, and action items',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'career',
    ports: [
        { id: 'notes_out', direction: 'output', dataType: 'text', label: 'Meeting Notes' }
    ]
};

// ============================================
// GROWTH BLOCKS
// ============================================

export const SKILL_RADAR_BLOCK: OmniBlockSchema = {
    block_id: 'career.skill_radar',
    display_name: 'Skill Radar',
    category: 'career',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['career', 'skills', 'competencies', 'growth', 'development'],
    wiring_logic: 'Track and visualize skill development over time',
    icon: '🎯',
    description: 'Visualize and track your skill development',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'career',
    ports: [
        { id: 'skills_out', direction: 'output', dataType: 'json', label: 'Skill Map' }
    ],
    subscribedGraphId: 'career.growth',
    graphNodeMapping: {
        'leverage': 'skill_leverage'
    }
};

export const LEARNING_LOG_BLOCK: OmniBlockSchema = {
    block_id: 'career.learning_log',
    display_name: 'Learning Log',
    category: 'career',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['career', 'learning', 'courses', 'books', 'certifications'],
    wiring_logic: 'Track courses, books, and certifications',
    icon: '📚',
    description: 'Track courses, books, and certifications',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'career',
    ports: [
        { id: 'learning_out', direction: 'output', dataType: 'json', label: 'Learning Progress' }
    ],
    subscribedGraphId: 'career.growth',
    graphNodeMapping: {
        'hours': 'learning_hours'
    }
};

export const MENTOR_TRACKER_BLOCK: OmniBlockSchema = {
    block_id: 'career.mentor_tracker',
    display_name: 'Mentor Tracker',
    category: 'career',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['career', 'mentorship', 'guidance', 'coaching', 'growth'],
    wiring_logic: 'Track mentorship relationships and insights',
    icon: '🧭',
    description: 'Track mentors, mentees, and key learnings',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'career',
    ports: [
        { id: 'mentorship_out', direction: 'output', dataType: 'json', label: 'Mentorship Data' }
    ]
};

// ============================================
// NETWORK BLOCKS
// ============================================

export const NETWORK_MAP_BLOCK: OmniBlockSchema = {
    block_id: 'career.network_map',
    display_name: 'Network Map',
    category: 'career',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['career', 'network', 'connections', 'professional', 'contacts'],
    wiring_logic: 'Visualize and manage professional network',
    icon: '🕸️',
    description: 'Visualize your professional network and connections',
    expandMode: 'portal',
    isUserCreatable: true,
    systemId: 'career',
    ports: [
        { id: 'network_out', direction: 'output', dataType: 'json', label: 'Network Data' }
    ]
};

export const JOB_BOARD_BLOCK: OmniBlockSchema = {
    block_id: 'career.job_board',
    display_name: 'Job Board',
    category: 'career',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['career', 'jobs', 'opportunities', 'applications', 'hiring'],
    wiring_logic: 'Track job opportunities and application status',
    icon: '💼',
    description: 'Track opportunities and application status',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'career',
    ports: [
        { id: 'jobs_out', direction: 'output', dataType: 'json', label: 'Job Applications' }
    ]
};

// ============================================
// ALL CAREER BLOCKS REGISTRY
// ============================================

export const CAREER_BLOCKS: OmniBlockSchema[] = [
    // Work
    PROJECT_TRACKER_BLOCK,
    TASK_MANAGER_BLOCK,
    MEETING_NOTES_BLOCK,
    // Growth
    SKILL_RADAR_BLOCK,
    LEARNING_LOG_BLOCK,
    MENTOR_TRACKER_BLOCK,
    // Network
    NETWORK_MAP_BLOCK,
    JOB_BOARD_BLOCK
];

export default CAREER_BLOCKS;
