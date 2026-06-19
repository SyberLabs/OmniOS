// ============================================
// HEALTH SYSTEM SPECIALIZED BLOCKS
// Block definitions for Health sub-domains
// ============================================

import { OmniBlockSchema } from '../schemas/block.schema';

// ============================================
// MOVEMENT BLOCKS
// ============================================

export const EXERCISE_TRACKER_BLOCK: OmniBlockSchema = {
    block_id: 'health.exercise_tracker',
    display_name: 'Exercise Tracker',
    category: 'health',
    data_type: 'biometric',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'fitness', 'exercise', 'movement', 'workout'],
    wiring_logic: 'Provides exercise data to Health Mind for activity analysis',
    icon: '🏃',
    description: 'Track workouts, exercises, and physical activity',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'activity_out', direction: 'output', dataType: 'json', label: 'Activity Data' },
        { id: 'stats_out', direction: 'output', dataType: 'json', label: 'Weekly Stats' }
    ],
    subscribedGraphId: 'health.movement',
    graphNodeMapping: {
        'value': 'workouts',
        'steps': 'steps',
        'active_minutes': 'active_minutes'
    }
};

export const WORKOUT_LOG_BLOCK: OmniBlockSchema = {
    block_id: 'health.workout_log',
    display_name: 'Workout Log',
    category: 'health',
    data_type: 'biometric',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'fitness', 'workout', 'strength', 'cardio'],
    wiring_logic: 'Detailed workout logging with sets, reps, and weights',
    icon: '🏋️',
    description: 'Log detailed workouts with sets, reps, and weights',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    subscribedGraphId: 'health.movement',
    graphNodeMapping: {
        'value': 'workouts'
    }
};

export const ACTIVITY_RINGS_BLOCK: OmniBlockSchema = {
    block_id: 'health.activity_rings',
    display_name: 'Activity Rings',
    category: 'health',
    data_type: 'biometric',
    refresh_rate: '5m',
    semantic_tags: ['health', 'activity', 'movement', 'goals', 'apple'],
    wiring_logic: 'Visual activity ring display synced with health APIs',
    icon: '⭕',
    description: 'Apple-style activity rings showing daily progress',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    subscribedGraphId: 'health.movement',
    graphNodeMapping: {
        'value': 'active_minutes'
    }
};

// ============================================
// NUTRITION BLOCKS
// ============================================

export const CALORIE_TRACKER_BLOCK: OmniBlockSchema = {
    block_id: 'health.calorie_tracker',
    display_name: 'Calorie Tracker',
    category: 'health',
    data_type: 'biometric',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'nutrition', 'calories', 'diet', 'food'],
    wiring_logic: 'Tracks calories consumed and burned for energy balance',
    icon: '🔥',
    description: 'Log food intake and track daily calorie consumption',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'food_in', direction: 'input', dataType: 'json', label: 'Food Entry' },
        { id: 'calories_out', direction: 'output', dataType: 'json', label: 'Calorie Data' },
        { id: 'macros_out', direction: 'output', dataType: 'json', label: 'Macro Breakdown' }
    ],
    subscribedGraphId: 'health.nutrition',
    graphNodeMapping: {
        'value': 'calories',
        'water': 'water',
        'protein': 'protein'
    }
};

export const GROCERY_BUDGET_BLOCK: OmniBlockSchema = {
    block_id: 'health.grocery_budget',
    display_name: 'Grocery Budget',
    category: 'health',
    data_type: 'financial',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'nutrition', 'grocery', 'budget', 'shopping'],
    wiring_logic: 'Tracks grocery spending aligned with nutrition goals',
    icon: '🛒',
    description: 'Track grocery spending and optimize food budget',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'budget_out', direction: 'output', dataType: 'json', label: 'Budget Status' },
        { id: 'items_out', direction: 'output', dataType: 'json', label: 'Shopping List' }
    ]
};

export const RECIPE_FINDER_BLOCK: OmniBlockSchema = {
    block_id: 'health.recipe_finder',
    display_name: 'Recipe Finder',
    category: 'health',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'nutrition', 'recipes', 'cooking', 'meals'],
    wiring_logic: 'Suggests recipes based on nutrition goals and preferences',
    icon: '📖',
    description: 'Find recipes matching your dietary needs and preferences',
    expandMode: 'portal',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'diet_in', direction: 'input', dataType: 'json', label: 'Diet Preferences' },
        { id: 'ingredients_in', direction: 'input', dataType: 'json', label: 'Available Ingredients' },
        { id: 'recipe_out', direction: 'output', dataType: 'json', label: 'Suggested Recipe' }
    ]
};

export const MEAL_PLANNER_BLOCK: OmniBlockSchema = {
    block_id: 'health.meal_planner',
    display_name: 'Meal Planner',
    category: 'health',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'nutrition', 'meals', 'planning', 'weekly'],
    wiring_logic: 'Weekly meal planning with nutrition optimization',
    icon: '📅',
    description: 'Plan meals for the week with nutrition balance',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'goals_in', direction: 'input', dataType: 'json', label: 'Nutrition Goals' },
        { id: 'plan_out', direction: 'output', dataType: 'json', label: 'Meal Plan' }
    ],
    subscribedGraphId: 'health.nutrition'
};

// ============================================
// SLEEP BLOCKS
// ============================================

export const SLEEP_TRACKER_BLOCK: OmniBlockSchema = {
    block_id: 'health.sleep_tracker',
    display_name: 'Sleep Tracker',
    category: 'health',
    data_type: 'biometric',
    refresh_rate: '1h',
    semantic_tags: ['health', 'sleep', 'rest', 'recovery', 'biometric'],
    wiring_logic: 'Tracks sleep duration and quality from health APIs',
    icon: '😴',
    description: 'Track sleep duration, quality, and patterns',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'sleep_out', direction: 'output', dataType: 'json', label: 'Sleep Data' },
        { id: 'quality_out', direction: 'output', dataType: 'json', label: 'Quality Score' }
    ],
    subscribedGraphId: 'health.sleep',
    graphNodeMapping: {
        'value': 'sleep_duration',
        'quality': 'sleep_quality'
    }
};

export const SLEEP_CYCLES_BLOCK: OmniBlockSchema = {
    block_id: 'health.sleep_cycles',
    display_name: 'Sleep Cycles',
    category: 'health',
    data_type: 'biometric',
    refresh_rate: '1h',
    semantic_tags: ['health', 'sleep', 'cycles', 'rem', 'deep'],
    wiring_logic: 'Visualizes sleep cycle stages and patterns',
    icon: '🌙',
    description: 'Visualize deep, light, and REM sleep stages',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'cycles_out', direction: 'output', dataType: 'json', label: 'Cycle Data' }
    ]
};

export const BEDTIME_ROUTINE_BLOCK: OmniBlockSchema = {
    block_id: 'health.bedtime_routine',
    display_name: 'Bedtime Routine',
    category: 'health',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'sleep', 'routine', 'habits', 'wind-down'],
    wiring_logic: 'Checklist-based bedtime routine tracker',
    icon: '🛏️',
    description: 'Track your wind-down routine for better sleep',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'routine_out', direction: 'output', dataType: 'json', label: 'Routine Status' }
    ]
};

// ============================================
// MIND BLOCKS
// ============================================

export const MEDITATION_TIMER_BLOCK: OmniBlockSchema = {
    block_id: 'health.meditation_timer',
    display_name: 'Meditation Timer',
    category: 'health',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'mind', 'meditation', 'mindfulness', 'timer'],
    wiring_logic: 'Guided meditation timer with session tracking',
    icon: '🧘',
    description: 'Meditation timer with breathing guidance',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'session_out', direction: 'output', dataType: 'json', label: 'Session Data' }
    ],
    subscribedGraphId: 'health.stress',
    graphNodeMapping: {
        'value': 'meditation'
    }
};

export const FOCUS_TIMER_BLOCK: OmniBlockSchema = {
    block_id: 'health.focus_timer',
    display_name: 'Focus Timer',
    category: 'health',
    data_type: 'custom',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'mind', 'focus', 'pomodoro', 'productivity'],
    wiring_logic: 'Pomodoro-style focus timer with break reminders',
    icon: '🎯',
    description: 'Focus timer with Pomodoro technique',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'focus_out', direction: 'output', dataType: 'json', label: 'Focus Stats' }
    ]
};

export const STRESS_LOG_BLOCK: OmniBlockSchema = {
    block_id: 'health.stress_log',
    display_name: 'Stress Log',
    category: 'health',
    data_type: 'biometric',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'mind', 'stress', 'anxiety', 'mood'],
    wiring_logic: 'Track stress levels with triggers and coping strategies',
    icon: '📊',
    description: 'Log stress levels and identify patterns',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'stress_out', direction: 'output', dataType: 'json', label: 'Stress Data' }
    ],
    subscribedGraphId: 'health.stress',
    graphNodeMapping: {
        'value': 'stress_level'
    }
};

// ============================================
// SPIRIT BLOCKS
// ============================================

export const GRATITUDE_JOURNAL_BLOCK: OmniBlockSchema = {
    block_id: 'health.gratitude_journal',
    display_name: 'Gratitude Journal',
    category: 'health',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'spirit', 'gratitude', 'journal', 'positivity'],
    wiring_logic: 'Daily gratitude practice with reflection prompts',
    icon: '🙏',
    description: 'Daily gratitude entries and reflection',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'entries_out', direction: 'output', dataType: 'json', label: 'Gratitude Entries' }
    ]
};

export const PURPOSE_JOURNAL_BLOCK: OmniBlockSchema = {
    block_id: 'health.purpose_journal',
    display_name: 'Purpose Journal',
    category: 'health',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['health', 'spirit', 'purpose', 'meaning', 'values'],
    wiring_logic: 'Reflect on life purpose and core values',
    icon: '🎯',
    description: 'Explore and document your life purpose',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health',
    ports: [
        { id: 'purpose_out', direction: 'output', dataType: 'text', label: 'Purpose Statement' }
    ]
};

// ============================================
// ALL HEALTH BLOCKS REGISTRY
// ============================================

export const HEALTH_BLOCKS: OmniBlockSchema[] = [
    // Movement
    EXERCISE_TRACKER_BLOCK,
    WORKOUT_LOG_BLOCK,
    ACTIVITY_RINGS_BLOCK,
    // Nutrition
    CALORIE_TRACKER_BLOCK,
    GROCERY_BUDGET_BLOCK,
    RECIPE_FINDER_BLOCK,
    MEAL_PLANNER_BLOCK,
    // Sleep
    SLEEP_TRACKER_BLOCK,
    SLEEP_CYCLES_BLOCK,
    BEDTIME_ROUTINE_BLOCK,
    // Mind
    MEDITATION_TIMER_BLOCK,
    FOCUS_TIMER_BLOCK,
    STRESS_LOG_BLOCK,
    // Spirit
    GRATITUDE_JOURNAL_BLOCK,
    PURPOSE_JOURNAL_BLOCK
];

export default HEALTH_BLOCKS;
