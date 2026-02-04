export const TICKET_THEMES: Record<string, {
    name: string;
    gradient: string;
    border: string;
    text: string;
    badge: string;
    badgeText: string;
}> = {
    silver: {
        name: 'Silver',
        gradient: 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200',
        border: 'border-gray-200',
        text: 'text-gray-900',
        badge: 'bg-gray-100 border-gray-200',
        badgeText: 'text-gray-700'
    },
    bronze: {
        name: 'Bronze',
        gradient: 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200',
        border: 'border-orange-200',
        text: 'text-orange-900',
        badge: 'bg-orange-100 border-orange-200',
        badgeText: 'text-orange-800'
    },
    gold: {
        name: 'Gold',
        gradient: 'bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-200',
        border: 'border-yellow-200',
        text: 'text-yellow-900',
        badge: 'bg-yellow-100 border-yellow-200',
        badgeText: 'text-yellow-800'
    },
    platinum: {
        name: 'Platinum',
        gradient: 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200',
        border: 'border-slate-200',
        text: 'text-slate-900',
        badge: 'bg-slate-100 border-slate-200',
        badgeText: 'text-slate-700'
    },
    obsidian: {
        name: 'Obsidian',
        gradient: 'bg-gradient-to-br from-gray-800 via-gray-900 to-black',
        border: 'border-gray-700',
        text: 'text-white',
        badge: 'bg-gray-800 border-gray-700',
        badgeText: 'text-gray-300'
    }
};
