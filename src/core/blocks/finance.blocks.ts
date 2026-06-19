// ============================================
// FINANCE SYSTEM SPECIALIZED BLOCKS
// Block definitions for Finance sub-domains
// ============================================

import { OmniBlockSchema } from '../schemas/block.schema';

// ============================================
// INCOME BLOCKS
// ============================================

export const INCOME_STREAMS_BLOCK: OmniBlockSchema = {
    block_id: 'finance.income_streams',
    display_name: 'Income Streams',
    category: 'finance',
    data_type: 'financial',
    refresh_rate: 'manual',
    semantic_tags: ['finance', 'income', 'salary', 'revenue', 'earnings'],
    wiring_logic: 'Track multiple income sources and projections',
    icon: '💵',
    description: 'Track salary, side hustles, and passive income',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'finance',
    ports: [
        { id: 'income_out', direction: 'output', dataType: 'json', label: 'Income Data' }
    ],
    subscribedGraphId: 'finance.liquidity',
    graphNodeMapping: {
        'value': 'income_node'
    }
};

export const INVESTMENT_PORTFOLIO_BLOCK: OmniBlockSchema = {
    block_id: 'finance.investment_portfolio',
    display_name: 'Investment Portfolio',
    category: 'finance',
    data_type: 'financial',
    refresh_rate: '5m',
    semantic_tags: ['finance', 'investments', 'stocks', 'crypto', 'portfolio'],
    wiring_logic: 'Track investments and portfolio performance',
    icon: '📈',
    description: 'Track stocks, crypto, ETFs, and returns',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'finance',
    ports: [
        { id: 'portfolio_out', direction: 'output', dataType: 'json', label: 'Portfolio Value' }
    ]
};

// ============================================
// EXPENSES BLOCKS
// ============================================

export const BUDGET_DASHBOARD_BLOCK: OmniBlockSchema = {
    block_id: 'finance.budget_dashboard',
    display_name: 'Budget Dashboard',
    category: 'finance',
    data_type: 'financial',
    refresh_rate: 'manual',
    semantic_tags: ['finance', 'budget', 'spending', 'overview', 'money'],
    wiring_logic: 'Overview of income vs expenses with trends',
    icon: '📊',
    description: 'Income vs expenses overview with trends',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'finance',
    ports: [
        { id: 'budget_out', direction: 'output', dataType: 'json', label: 'Budget Status' }
    ]
};

export const EXPENSE_TRACKER_BLOCK: OmniBlockSchema = {
    block_id: 'finance.expense_tracker',
    display_name: 'Expense Tracker',
    category: 'finance',
    data_type: 'financial',
    refresh_rate: 'manual',
    semantic_tags: ['finance', 'expenses', 'spending', 'categories', 'tracking'],
    wiring_logic: 'Log and categorize all spending',
    icon: '💳',
    description: 'Log and categorize daily spending',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'finance',
    ports: [
        { id: 'expenses_out', direction: 'output', dataType: 'json', label: 'Expense Data' }
    ],
    subscribedGraphId: 'finance.liquidity',
    graphNodeMapping: {
        'value': 'expense_node'
    }
};

export const BILL_CALENDAR_BLOCK: OmniBlockSchema = {
    block_id: 'finance.bill_calendar',
    display_name: 'Bill Calendar',
    category: 'finance',
    data_type: 'financial',
    refresh_rate: '1h',
    semantic_tags: ['finance', 'bills', 'payments', 'due-dates', 'recurring'],
    wiring_logic: 'Track upcoming bills and payment due dates',
    icon: '📅',
    description: 'Track upcoming bills and payment dates',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'finance',
    ports: [
        { id: 'bills_out', direction: 'output', dataType: 'json', label: 'Bill Schedule' }
    ]
};

export const SUBSCRIPTION_MANAGER_BLOCK: OmniBlockSchema = {
    block_id: 'finance.subscription_manager',
    display_name: 'Subscription Manager',
    category: 'finance',
    data_type: 'financial',
    refresh_rate: 'manual',
    semantic_tags: ['finance', 'subscriptions', 'recurring', 'services', 'apps'],
    wiring_logic: 'Manage and optimize recurring subscriptions',
    icon: '🔄',
    description: 'Manage all recurring subscriptions',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'finance',
    ports: [
        { id: 'subs_out', direction: 'output', dataType: 'json', label: 'Subscriptions' }
    ]
};

// ============================================
// WEALTH BLOCKS
// ============================================

export const NET_WORTH_TRACKER_BLOCK: OmniBlockSchema = {
    block_id: 'finance.net_worth_tracker',
    display_name: 'Net Worth Tracker',
    category: 'finance',
    data_type: 'financial',
    refresh_rate: 'manual',
    semantic_tags: ['finance', 'net-worth', 'assets', 'liabilities', 'wealth'],
    wiring_logic: 'Calculate and track net worth over time',
    icon: '💎',
    description: 'Track assets minus liabilities over time',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'finance',
    ports: [
        { id: 'networth_out', direction: 'output', dataType: 'json', label: 'Net Worth' }
    ],
    subscribedGraphId: 'finance.liquidity',
    graphNodeMapping: {
        'value': 'cash_flow'
    }
};

export const SAVINGS_GOALS_BLOCK: OmniBlockSchema = {
    block_id: 'finance.savings_goals',
    display_name: 'Savings Goals',
    category: 'finance',
    data_type: 'financial',
    refresh_rate: 'manual',
    semantic_tags: ['finance', 'savings', 'goals', 'targets', 'progress'],
    wiring_logic: 'Track progress toward savings goals',
    icon: '🎯',
    description: 'Set and track savings goals with progress',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'finance',
    ports: [
        { id: 'savings_out', direction: 'output', dataType: 'json', label: 'Savings Progress' }
    ]
};

// ============================================
// ALL FINANCE BLOCKS REGISTRY
// ============================================

export const FINANCE_BLOCKS: OmniBlockSchema[] = [
    // Income
    INCOME_STREAMS_BLOCK,
    INVESTMENT_PORTFOLIO_BLOCK,
    // Expenses
    BUDGET_DASHBOARD_BLOCK,
    EXPENSE_TRACKER_BLOCK,
    BILL_CALENDAR_BLOCK,
    SUBSCRIPTION_MANAGER_BLOCK,
    // Wealth
    NET_WORTH_TRACKER_BLOCK,
    SAVINGS_GOALS_BLOCK
];

export default FINANCE_BLOCKS;
