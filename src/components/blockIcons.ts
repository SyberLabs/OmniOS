// Shared Lucide map for Armory, canvas cards, command palette, and the
// API Command Center. A provider that is on the canvas but missing here
// falls back to Activity / Plus and looks unsupported.

import {
    Activity,
    BookOpen,
    Brain,
    Briefcase,
    Building,
    Clock,
    CloudSun,
    Code,
    Coins,
    Cpu,
    DollarSign,
    FileText,
    Files,
    FlaskConical,
    Github,
    Globe,
    Heart,
    Hexagon,
    Home,
    Image,
    Library,
    LineChart,
    Maximize,
    MessageSquare,
    Newspaper,
    Palette,
    Plane,
    Shield,
    Ship,
    Swords,
    Target,
    TrendingUp,
    User,
    Users,
    Wallet,
    Zap,
    type LucideIcon
} from 'lucide-react';

export const BLOCK_ICON_COMPONENTS: Record<string, LucideIcon> = {
    Activity,
    BookOpen,
    Brain,
    Briefcase,
    Building,
    Clock,
    CloudSun,
    Code,
    Coins,
    Cpu,
    DollarSign,
    FileText,
    Files,
    FlaskConical,
    Github,
    Globe,
    Heart,
    Hexagon,
    Home,
    Image,
    Library,
    LineChart,
    Maximize,
    MessageSquare,
    Newspaper,
    Palette,
    Plane,
    Shield,
    Ship,
    Swords,
    Target,
    TrendingUp,
    User,
    Users,
    Wallet,
    Zap
};

export function resolveBlockIcon(iconName?: string): LucideIcon {
    if (iconName && BLOCK_ICON_COMPONENTS[iconName]) {
        return BLOCK_ICON_COMPONENTS[iconName];
    }
    return Activity;
}
