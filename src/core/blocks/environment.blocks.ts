// ============================================
// ENVIRONMENT SYSTEM SPECIALIZED BLOCKS
// Block definitions for Environment sub-domains
// ============================================

import { OmniBlockSchema } from '../schemas/block.schema';

// ============================================
// LIVING SPACE BLOCKS
// ============================================

export const HOME_MAINTENANCE_BLOCK: OmniBlockSchema = {
    block_id: 'environment.home_maintenance',
    display_name: 'Home Maintenance',
    category: 'environment',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['environment', 'home', 'maintenance', 'repairs', 'upkeep'],
    wiring_logic: 'Track home repairs and maintenance schedules',
    icon: '🔧',
    description: 'Track repairs, maintenance, and upkeep',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'environment',
    ports: [
        { id: 'maintenance_out', direction: 'output', dataType: 'json', label: 'Maintenance Schedule' }
    ]
};

export const DECLUTTER_LIST_BLOCK: OmniBlockSchema = {
    block_id: 'environment.declutter_list',
    display_name: 'Declutter List',
    category: 'environment',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['environment', 'declutter', 'organize', 'minimalism', 'clean'],
    wiring_logic: 'Track items to organize, donate, or discard',
    icon: '📦',
    description: 'Items to organize, donate, or discard',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'environment',
    ports: [
        { id: 'items_out', direction: 'output', dataType: 'json', label: 'Declutter Items' }
    ]
};

export const SPACE_OPTIMIZER_BLOCK: OmniBlockSchema = {
    block_id: 'environment.space_optimizer',
    display_name: 'Space Optimizer',
    category: 'environment',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['environment', 'space', 'layout', 'optimization', 'feng-shui'],
    wiring_logic: 'Optimize room and desk arrangements',
    icon: '🏠',
    description: 'Optimize room and workspace layout',
    expandMode: 'portal',
    isUserCreatable: true,
    systemId: 'environment',
    ports: [
        { id: 'layout_out', direction: 'output', dataType: 'json', label: 'Layout Plans' }
    ]
};

// ============================================
// DIGITAL SPACE BLOCKS
// ============================================

export const DEVICE_MANAGER_BLOCK: OmniBlockSchema = {
    block_id: 'environment.device_manager',
    display_name: 'Device Manager',
    category: 'environment',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['environment', 'devices', 'tech', 'inventory', 'digital'],
    wiring_logic: 'Track tech inventory and device health',
    icon: '📱',
    description: 'Tech inventory and device health tracking',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'environment',
    ports: [
        { id: 'devices_out', direction: 'output', dataType: 'json', label: 'Device Inventory' }
    ]
};

export const SECURITY_CHECK_BLOCK: OmniBlockSchema = {
    block_id: 'environment.security_check',
    display_name: 'Security Check',
    category: 'environment',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['environment', 'security', 'passwords', 'privacy', 'protection'],
    wiring_logic: 'Track home and digital security status',
    icon: '🔒',
    description: 'Home and digital security checklist',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'environment',
    ports: [
        { id: 'security_out', direction: 'output', dataType: 'json', label: 'Security Status' }
    ]
};

// ============================================
// NATURAL SPACE BLOCKS
// ============================================

export const PLANT_CARE_BLOCK: OmniBlockSchema = {
    block_id: 'environment.plant_care',
    display_name: 'Plant Care',
    category: 'environment',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['environment', 'plants', 'garden', 'nature', 'green'],
    wiring_logic: 'Track indoor and outdoor plant care schedules',
    icon: '🌱',
    description: 'Track plant watering and care schedules',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'environment',
    ports: [
        { id: 'plants_out', direction: 'output', dataType: 'json', label: 'Plant Schedule' }
    ]
};

export const TRAVEL_PLANNER_BLOCK: OmniBlockSchema = {
    block_id: 'environment.travel_planner',
    display_name: 'Travel Planner',
    category: 'environment',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['environment', 'travel', 'trips', 'adventures', 'explore'],
    wiring_logic: 'Plan trips and capture travel memories',
    icon: '✈️',
    description: 'Plan trips and capture travel memories',
    expandMode: 'portal',
    isUserCreatable: true,
    systemId: 'environment',
    ports: [
        { id: 'travel_out', direction: 'output', dataType: 'json', label: 'Trip Plans' }
    ]
};

export const CLIMATE_CONTROL_BLOCK: OmniBlockSchema = {
    block_id: 'environment.climate_control',
    display_name: 'Climate Control',
    category: 'environment',
    data_type: 'telemetry',
    refresh_rate: '5m',
    semantic_tags: ['environment', 'climate', 'temperature', 'air-quality', 'comfort'],
    wiring_logic: 'Monitor temperature and air quality',
    icon: '🌡️',
    description: 'Monitor temperature and air quality',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'environment',
    ports: [
        { id: 'climate_out', direction: 'output', dataType: 'json', label: 'Climate Data' }
    ]
};

// ============================================
// ALL ENVIRONMENT BLOCKS REGISTRY
// ============================================

export const ENVIRONMENT_BLOCKS: OmniBlockSchema[] = [
    // Living Space
    HOME_MAINTENANCE_BLOCK,
    DECLUTTER_LIST_BLOCK,
    SPACE_OPTIMIZER_BLOCK,
    // Digital Space
    DEVICE_MANAGER_BLOCK,
    SECURITY_CHECK_BLOCK,
    // Natural Space
    PLANT_CARE_BLOCK,
    TRAVEL_PLANNER_BLOCK,
    CLIMATE_CONTROL_BLOCK
];

export default ENVIRONMENT_BLOCKS;
