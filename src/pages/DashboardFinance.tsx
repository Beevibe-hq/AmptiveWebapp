import React, { useEffect, useState } from 'react';
import { DollarSign, Settings as SettingsIcon, FileText, ArrowUpRight, Download, Plus, X, Search, CircleSlash, CreditCard, Receipt, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSession } from '@/lib/api/auth';
import { getEventOwnerPurchases, getBuyerProfiles } from '@/lib/api/finance';

export default function DashboardFinance() {
    const [activeTab, setActiveTab] = useState<'payout' | 'settings' | 'receipt'>('payout');
    const [activeSettingsTab, setActiveSettingsTab] = useState<'payout-methods' | 'billing' | 'tax'>('payout-methods');
    const [showBalances, setShowBalances] = useState(true);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [profileMap, setProfileMap] = useState<Record<string, any>>({});
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historySearchQuery, setHistorySearchQuery] = useState('');
    const [isSearchingHistory, setIsSearchingHistory] = useState(false);
    const [historyDateFilter, setHistoryDateFilter] = useState('All');
    const [showFilterChips, setShowFilterChips] = useState(false);
    const [isDefaultAccount, setIsDefaultAccount] = useState(true);
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    
    // Bank Details State
    const [bankDetails, setBankDetails] = useState({
        bankName: 'GTBank',
        accountNumber: '0123456789',
        accountHolder: 'John Doe'
    });
    const [isEditingBank, setIsEditingBank] = useState(false);
    const [tempBankDetails, setTempBankDetails] = useState({ ...bankDetails });
    const [isCheckingAccount, setIsCheckingAccount] = useState(false);

    // Paystack API Key
    const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY || '';
    const PAYSTACK_BASE_URL = 'https://api.paystack.co';

    // Bank Data State (Initialized with standard Nigerian bank codes)
    const [banks, setBanks] = useState<{name: string, code: string}[]>([
        { name: 'Access Bank', code: '044' },
        { name: 'Access Bank (Diamond)', code: '063' },
        { name: 'ALAT by WEMA', code: '035A' },
        { name: 'Fidelity Bank', code: '070' },
        { name: 'First Bank of Nigeria', code: '011' },
        { name: 'First City Monument Bank', code: '214' },
        { name: 'Guaranty Trust Bank', code: '058' },
        { name: 'Jaiz Bank', code: '301' },
        { name: 'Keystone Bank', code: '082' },
        { name: 'Kuda Bank', code: '50211' },
        { name: 'Moniepoint MFB', code: '50515' },
        { name: 'OPay Digital Services Limited (OPay)', code: '999992' },
        { name: 'PalmPay', code: '999991' },
        { name: 'Polaris Bank', code: '076' },
        { name: 'Stanbic IBTC Bank', code: '221' },
        { name: 'Standard Chartered Bank', code: '068' },
        { name: 'Sterling Bank', code: '232' },
        { name: 'United Bank For Africa', code: '033' },
        { name: 'Union Bank of Nigeria', code: '032' },
        { name: 'Unity Bank', code: '215' },
        { name: 'VFD Microfinance Bank Limited', code: '566' },
        { name: 'Wema Bank', code: '035' },
        { name: 'Zenith Bank', code: '057' }
    ]);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);

    // Fetch Paystack Banks
    useEffect(() => {
        const fetchBanks = async () => {
            if (!PAYSTACK_SECRET_KEY) return;
            setIsLoadingBanks(true);
            try {
                const response = await fetch(`${PAYSTACK_BASE_URL}/bank`, {
                    headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` }
                });
                const result = await response.json();
                if (result.status && result.data) {
                    setBanks(result.data.map((b: any) => ({ name: b.name, code: b.code })));
                } else {
                    console.warn('Paystack API Error:', result.message);
                }
            } catch (error) {
                console.error('Error fetching banks (possible CORS/Auth issue):', error);
                // Fallback list is already initialized
            } finally {
                setIsLoadingBanks(false);
            }
        };
        fetchBanks();
    }, [PAYSTACK_SECRET_KEY]);

    // Real Account Lookup via Paystack
    useEffect(() => {
        if (!isEditingBank) return;
        
        const { accountNumber, bankName } = tempBankDetails;
        const selectedBank = banks.find(b => b.name === bankName);

        if (accountNumber.length === 10 && selectedBank && PAYSTACK_SECRET_KEY) {
            setIsCheckingAccount(true);
            
            const resolveAccount = async () => {
                try {
                    const response = await fetch(`${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${selectedBank.code}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    const result = await response.json();
                    if (result.status && result.data) {
                        setTempBankDetails(prev => ({ ...prev, accountHolder: result.data.account_name }));
                    } else {
                        const errorMsg = result.message || 'Unable to resolve';
                        setTempBankDetails(prev => ({ ...prev, accountHolder: errorMsg }));
                        console.error('Paystack Resolution Error:', result);
                    }
                } catch (error: any) {
                    console.error('Error resolving account:', error);
                    setTempBankDetails(prev => ({ ...prev, accountHolder: 'Check console or connection' }));
                } finally {
                    setIsCheckingAccount(false);
                }
            };

            const timer = setTimeout(resolveAccount, 1000); // 1s debounce
            return () => clearTimeout(timer);
        } else {
            setTempBankDetails(prev => ({ ...prev, accountHolder: '' }));
        }
    }, [tempBankDetails.accountNumber, tempBankDetails.bankName, isEditingBank, banks, PAYSTACK_SECRET_KEY]);

    const fetchFinanceData = async () => {
        try {
            setLoading(true);
            const session = await getSession();
            if (!session?.user) return;

            // 1. Fetch ticket purchases for events owned by this user
            const purchasesData = await getEventOwnerPurchases();
            setPurchases(purchasesData || []);

            // 2. Fetch buyer profiles for avatars
            const buyerIds = [...new Set((purchasesData || [])
                .map(p => p.buyer_id)
                .filter(id => !!id))];

            if (buyerIds.length > 0) {
                const profiles = await getBuyerProfiles(buyerIds);
                if (profiles) {
                    const pMap: Record<string, any> = {};
                    profiles.forEach(p => {
                        pMap[p.user_id] = p;
                    });
                    setProfileMap(pMap);
                }
            }
        } catch (error) {
            console.error('Error fetching finance data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();
    }, []);

    useEffect(() => {
        if (!historySearchQuery) {
            setIsSearchingHistory(false);
            return;
        }

        setIsSearchingHistory(true);
        const timer = setTimeout(() => {
            setIsSearchingHistory(false);
        }, 350);

        return () => clearTimeout(timer);
    }, [historySearchQuery]);

    const totalBalance = purchases.reduce((acc, p) => {
        const status = p.ticket_status?.toLowerCase();
        if (status === 'valid' || status === 'used' || status === 'paid' || status === 'completed' || status === 'success') {
            return acc + (Number(p.total_amount) || Number(p.event_tickets?.price) || 0);
        }
        return acc;
    }, 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    const formatCondensed = (amount: number) => {
        if (amount >= 1000000000) return `₦${(amount / 1000000000).toFixed(1).replace(/\.0$/, '')}b`;
        if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
        if (amount >= 1000) return `₦${(amount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
        return formatCurrency(amount);
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const avatarColors = [
        'bg-blue-100 text-blue-700',
        'bg-purple-100 text-purple-700',
        'bg-green-100 text-green-700',
        'bg-rose-100 text-rose-700',
        'bg-amber-100 text-amber-700',
        'bg-indigo-100 text-indigo-700'
    ];

    const getAvatarColor = (id: string) => {
        const charCode = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return avatarColors[charCode % avatarColors.length];
    };

    return (
        <div className="px-4 md:px-8 py-8 w-full">
            <div className="flex items-center justify-between gap-4 mb-6 md:mb-12">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
                        Finance
                    </h1>
                    <p className="hidden sm:block text-[15px] text-black/40 font-sans mt-1">Manage your payouts, bank accounts, and view all payment receipts.</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <button className="bg-[#FDFDFD] border border-gray-200 text-black px-3 py-2 md:px-4 md:py-2 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shrink-0 rounded-xl">
                        <Download className="w-4 h-4 md:w-5 md:h-5 text-black/70" />
                        <span className="text-sm md:text-base">
                            <span className="md:hidden">Export</span>
                            <span className="hidden md:inline">Export Report</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center mb-8 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 shrink-0">
                    {[
                        { id: 'payout', label: 'Payout', icon: DollarSign },
                        { id: 'settings', label: 'Settings', icon: SettingsIcon },
                        { id: 'receipt', label: 'Receipts', icon: FileText }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${isActive
                                        ? 'bg-[#F2F2F2] text-black'
                                        : 'bg-transparent text-black/60 hover:bg-black/5'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="w-full">

                {activeTab === 'payout' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <h3 className="text-black text-sm font-medium">Available Balance</h3>
                                    <button 
                                        onClick={() => setShowBalances(!showBalances)}
                                        className="hover:opacity-80 transition-opacity"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M9.99998 6C7.77205 6 5.59687 6.9496 3.9367 8.7223L2.74012 9.99998L3.9367 11.2777C5.60258 13.0565 7.67481 14 9.99998 14C12.3252 14 14.3974 13.0565 16.0633 11.2777L17.2599 9.99998L16.0633 8.7223C14.4031 6.9496 12.2279 6 9.99998 6ZM20 9.99998L17.5231 12.6448C15.5084 14.7961 12.9198 16 9.99998 16C7.08018 16 4.49163 14.7961 2.47691 12.6448L0 9.99998L2.47691 7.35518C4.4944 5.20094 7.18913 4 9.99998 4C12.8108 4 15.5056 5.20094 17.5231 7.35518L20 9.99998Z" fill="black"/>
                                            <path d="M10.0001 6.84607C9.68466 6.84607 9.36928 6.9512 9.0539 6.9512C9.57954 7.16146 10.0001 7.79223 10.0001 8.423C10.0001 9.26403 9.26415 9.99993 8.42312 9.99993C7.79235 9.99993 7.26671 9.57942 6.95133 9.05378C6.8462 9.36916 6.84619 9.68454 6.84619 9.99993C6.84619 11.7871 8.21286 13.1538 10.0001 13.1538C11.7872 13.1538 13.1539 11.7871 13.1539 9.99993C13.1539 8.21274 11.7872 6.84607 10.0001 6.84607Z" fill="black"/>
                                            {!showBalances && (
                                                <path stroke="black" strokeWidth="1.5" strokeLinecap="round" d="M4 4L16 16" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                                <div className="text-4xl font-bold tracking-tight text-black flex items-center h-[40px]">
                                    {loading ? (
                                        <div className="h-8 w-32 bg-black/5 animate-pulse rounded-lg" />
                                    ) : (
                                        showBalances ? formatCurrency(totalBalance) : '••••••••'
                                    )}
                                </div>
                                <div className="flex flex-row md:flex-col min-[1285px]:flex-row items-center md:items-stretch min-[1285px]:items-center gap-3 mt-6">
                                    <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                                        <Plus className="w-4 h-4" />
                                        Fund Wallet
                                    </button>
                                    <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-black/5 text-black rounded-full text-sm font-medium hover:bg-black/10 transition-colors">
                                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M7.3335 11.6181V3.0625" stroke="currentColor" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M3.05566 7.34028L7.33344 3.0625L11.6112 7.34028" stroke="currentColor" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Withdraw
                                    </button>
                                </div>
                            </div>
                            <div className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm md:col-span-2">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-black text-sm font-medium">Recent Activity</h3>
                                    <button 
                                        onClick={() => setIsHistoryOpen(true)}
                                        className="bg-[#FDFDFD] border border-gray-200 text-black px-3 py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shrink-0 rounded-xl"
                                    >
                                        View History
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {loading ? (
                                        [1, 2, 3, 4].map(i => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-black/5 animate-pulse">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-black/5" />
                                                    <div className="space-y-2">
                                                        <div className="h-4 w-48 bg-black/5 rounded" />
                                                        <div className="h-3 w-24 bg-black/5 rounded" />
                                                    </div>
                                                </div>
                                                <div className="h-4 w-16 bg-black/5 rounded" />
                                            </div>
                                        ))
                                    ) : purchases.length > 0 ? (
                                        purchases.slice(0, 4).map((item) => {
                                            const profile = profileMap[item.buyer_id];
                                            const buyerName = profile?.full_name || item.buyer_name || 'Guest';
                                            const amount = Number(item.total_amount) || Number(item.event_tickets?.price) || 0;
                                            const time = new Date(item.created_at).toLocaleDateString() === new Date().toLocaleDateString()
                                                ? 'Today'
                                                : new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

                                            return (
                                                <div key={item.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-black/5 transition-colors border border-black/5">
                                                    <div className="flex items-center gap-4">
                                                        {profile?.avatar_url ? (
                                                            <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                                                        ) : (
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${getAvatarColor(item.id)}`}>
                                                                {getInitials(buyerName)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-black text-[13px]">
                                                                {buyerName} <span className="text-black/60 font-normal">purchased a ticket for {item.events?.title}</span>
                                                            </p>
                                                            <p className="text-xs text-black/40 mt-0.5">{time}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-black text-sm">
                                                            {showBalances ? `+₦${amount.toLocaleString()}` : '••••'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-black/10 rounded-2xl">
                                            <p className="text-black/40 text-sm">No recent activity yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Settings Sidebar */}
                            <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
                                {[
                                    { id: 'payout-methods', label: 'Payout Methods', icon: CreditCard },
                                    { id: 'billing', label: 'Billing Details', icon: Receipt },
                                    { id: 'tax', label: 'Tax Information', icon: Building2 }
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeSettingsTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveSettingsTab(tab.id as 'payout-methods' | 'billing' | 'tax')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                                isActive 
                                                    ? 'bg-black text-white' 
                                                    : 'text-black/60 hover:bg-black/5 hover:text-black'
                                            }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Settings Content Area */}
                            <div className="flex-1 min-w-0">
                                {activeSettingsTab === 'payout-methods' && (
                                    <div className="bg-white border border-black/5 rounded-2xl shadow-sm w-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                                        {/* Header */}
                                        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-bold text-black">Bank Accounts</h2>
                                            </div>
                                            <button 
                                                className="p-1 -mr-1 text-black/40 hover:text-black transition-colors"
                                                title="Add Account"
                                            >
                                                <Plus className="w-6 h-6" />
                                            </button>
                                        </div>

                                        {/* Bank Account as a Card */}
                                        <div className="px-6 py-6 border-b border-black/5 last:border-0">
                                            <div className="w-full max-w-[340px] bg-white rounded-2xl border border-black/5 shadow-sm p-5 flex flex-col transition-all duration-300">
                                                {/* Top row */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-xl border border-black/5 shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                                                        <span className="text-xl">🏦</span>
                                                    </div>
                                                    <div className="relative">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setShowAccountMenu(!showAccountMenu); }}
                                                            className={`text-black/40 hover:text-black transition-colors rounded-full p-1 -mr-1 ${showAccountMenu ? 'bg-black/5 text-black' : 'hover:bg-black/5'}`}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                                                        </button>
                                                        
                                                        <AnimatePresence>
                                                            {showAccountMenu && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                                                    className="absolute right-0 top-full mt-2 w-40 bg-red-50 border border-red-100/50 shadow-xl rounded-xl overflow-hidden z-[100] py-1"
                                                                >
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setShowAccountMenu(false); /* Add delete logic here */ }}
                                                                        className="w-full text-left px-3 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-100/50 flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                                        Remove Account
                                                                    </button>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                                
                                                {/* Title & Desc */}
                                                <div className="mb-6">
                                                    <h3 className="text-black font-semibold text-[15px] mb-1.5">{bankDetails.bankName}</h3>
                                                    <p className="text-black/50 text-[13px] leading-relaxed pr-4">
                                                        Account ending in •••• {bankDetails.accountNumber.slice(-4)} for {bankDetails.accountHolder}. Set as default for automatic payouts.
                                                    </p>
                                                </div>

                                                {/* Bottom row */}
                                                <div className="border-t border-black/5 pt-4 flex items-center justify-between mt-auto">
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => { setTempBankDetails({ ...bankDetails }); setIsEditingBank(true); }}
                                                            className="w-9 h-9 rounded-xl border border-black/5 flex items-center justify-center text-black/60 hover:bg-black/5 hover:text-black transition-colors shrink-0"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                                        </button>
                                                        <button className="px-3 h-9 flex items-center rounded-xl border border-black/5 text-[13px] font-medium text-black/80 hover:bg-black/5 transition-colors">
                                                            Details
                                                        </button>
                                                    </div>
                                                    <button 
                                                        onClick={() => setIsDefaultAccount(!isDefaultAccount)}
                                                        className={`w-11 h-6 rounded-full cursor-pointer relative flex items-center transition-colors shadow-inner drop-shadow-sm border border-transparent ${isDefaultAccount ? 'bg-[#2563EB]' : 'bg-gray-300'}`}
                                                    >
                                                        <div className={`w-5 h-5 bg-white rounded-full absolute left-[1px] shadow-sm transition-transform border border-black/5 ${isDefaultAccount ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}></div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSettingsTab === 'billing' && (
                                    <div className="bg-white border border-black/5 rounded-2xl shadow-sm p-12 text-center animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col items-center justify-center min-h-[400px]">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-black/5">
                                            <Receipt className="w-8 h-8 text-black/20" />
                                        </div>
                                        <h3 className="text-lg font-bold text-black mb-2">Billing Details</h3>
                                        <p className="text-black/40 text-[15px] max-w-sm mx-auto">Manage your billing addresses, invoices, and recurring subscriptions here.</p>
                                        <button className="mt-8 bg-[#FDFDFD] border border-gray-200 text-black px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors rounded-xl mx-auto shadow-sm">
                                            Add Billing Details
                                        </button>
                                    </div>
                                )}

                                {activeSettingsTab === 'tax' && (
                                    <div className="bg-white border border-black/5 rounded-2xl shadow-sm p-12 text-center animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col items-center justify-center min-h-[400px]">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-black/5">
                                            <Building2 className="w-8 h-8 text-black/20" />
                                        </div>
                                        <h3 className="text-lg font-bold text-black mb-2">Tax Information</h3>
                                        <p className="text-black/40 text-[15px] max-w-sm mx-auto">Update your corporate tax IDs and location info for compliant invoicing.</p>
                                        <button className="mt-8 bg-[#FDFDFD] border border-gray-200 text-black px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors rounded-xl mx-auto shadow-sm">
                                            Add Tax Info
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'receipt' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-white border md:border-black/5 overflow-hidden border-transparent rounded-2xl shadow-sm">
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-black/5 bg-gray-50/50">
                                            <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Receipt Number</th>
                                            <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Date issued</th>
                                            <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Amount</th>
                                            <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Status</th>
                                            <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5">
                                        {loading ? (
                                            [1, 2, 3, 4, 5].map(i => (
                                                <tr key={i}>
                                                    {[1, 2, 3, 4, 5].map(j => (
                                                        <td key={j} className="px-6 py-4">
                                                            <div className="h-4 w-full bg-black/5 animate-pulse rounded" />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : purchases.length > 0 ? (
                                            purchases.map((item, i) => {
                                                const amount = Number(item.total_amount) || Number(item.event_tickets?.price) || 0;
                                                const date = new Date(item.created_at).toLocaleDateString('en-GB', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                });
                                                const status = item.ticket_status?.toLowerCase();
                                                const isPaid = status === 'valid' || status === 'used' || status === 'paid' || status === 'completed' || status === 'success';

                                                return (
                                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                                        <td className="px-6 py-4 font-medium text-black uppercase">{item.ticket_id || `RCT-${item.id.substring(0, 8)}`}</td>
                                                        <td className="px-6 py-4 text-sm text-black/60">{date}</td>
                                                        <td className="px-6 py-4 font-medium text-black">{formatCurrency(amount)}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                                {isPaid ? 'Paid' : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button className="text-sm font-medium text-black/40 hover:text-black transition-colors flex items-center justify-end w-full gap-2">
                                                                <Download className="w-4 h-4" /> PDF
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-black/40 text-sm">
                                                    No receipts available yet
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Activity History Modal */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsHistoryOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
                            className="relative h-full w-full md:w-[420px] md:h-[95vh] bg-white flex flex-col overflow-y-auto no-scrollbar md:rounded-2xl md:mt-[2.5vh] md:mr-4 md:drop-shadow-[-10px_0_25px_rgba(0,0,0,0.15)] z-10"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
                                <div>
                                    <p className="text-sm font-semibold text-black tracking-tighter">
                                        Activity History
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowFilterChips(!showFilterChips)}
                                            className={`p-2 rounded-full transition-all group ${showFilterChips ? 'bg-black text-white' : 'hover:bg-black/5'}`}
                                            title="Filter Activities"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" className={`${showFilterChips ? 'text-white' : 'text-black/40 group-hover:text-black'} transition-colors`}>
                                                <path d="M200,136a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,136Zm32-56H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16Zm-80,96H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z"></path>
                                            </svg>
                                        </button>

                                        <AnimatePresence>
                                            {showFilterChips && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    className="absolute right-0 mt-2 w-48 bg-white border border-black/5 rounded-2xl shadow-2xl z-20 overflow-hidden"
                                                >
                                                    <div className="p-2 space-y-1">
                                                        {['All', 'Today', 'This Week', 'This Month', 'This Year'].map((filter) => (
                                                            <button
                                                                key={filter}
                                                                onClick={() => {
                                                                    setHistoryDateFilter(filter);
                                                                    setShowFilterChips(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${
                                                                    historyDateFilter === filter
                                                                    ? 'bg-black text-white'
                                                                    : 'text-black/60 hover:bg-black/5'
                                                                }`}
                                                            >
                                                                {filter === 'All' ? 'All Time' : filter}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <button
                                        onClick={() => setIsHistoryOpen(false)}
                                        className="p-2 hover:bg-black/5 rounded-full transition-colors group"
                                        title="Close"
                                    >
                                        <X className="w-5 h-5 text-black/40 group-hover:text-black transition-colors" />
                                    </button>
                                </div>
                            </div>

                            {/* Search Box */}
                            <div className="px-6 py-4">
                                <div className="relative group">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 group-focus-within:text-black transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Search transactions, buyers, or events..." 
                                        className="w-full px-4 py-2 pl-10 h-10 text-sm text-gray-700 bg-gray-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all duration-200 shadow-sm"
                                        value={historySearchQuery}
                                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                                        style={{ boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            {/* Activities List */}
                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-2">
                                <div className="space-y-1">
                                    {isSearchingHistory ? (
                                        <div className="space-y-4 pt-4">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div key={i} className="flex items-center gap-4 py-4 px-6 border-b border-black/5 last:border-0 -mx-6 animate-pulse">
                                                    <div className="w-11 h-11 rounded-full bg-black/5 shrink-0" />
                                                    <div className="flex-1">
                                                        <div className="h-4 w-3/4 bg-black/5 rounded mb-2" />
                                                        <div className="h-3 w-1/4 bg-black/5 rounded" />
                                                    </div>
                                                    <div className="w-16 h-4 bg-black/5 rounded shrink-0" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (() => {
                                        const filteredPurchases = purchases.filter(item => {
                                            const query = historySearchQuery.toLowerCase();
                                            const profile = profileMap[item.buyer_id];
                                            const buyerName = (profile?.full_name || item.buyer_name || '').toLowerCase();
                                            const buyerEmail = (item.buyer_email || '').toLowerCase();
                                            const transId = (item.id || '').toLowerCase();
                                            const eventTitle = (item.events?.title || '').toLowerCase();

                                            const matchesSearch = buyerName.includes(query) || 
                                                                  buyerEmail.includes(query) || 
                                                                  transId.includes(query) ||
                                                                  eventTitle.includes(query);

                                            if (!matchesSearch) return false;

                                            if (historyDateFilter === 'All') return true;

                                            const purchaseDate = new Date(item.created_at);
                                            const now = new Date();

                                            if (historyDateFilter === 'Today') {
                                                return purchaseDate.toDateString() === now.toDateString();
                                            }

                                            if (historyDateFilter === 'This Week') {
                                                const sevenDaysAgo = new Date();
                                                sevenDaysAgo.setDate(now.getDate() - 7);
                                                return purchaseDate >= sevenDaysAgo;
                                            }

                                            if (historyDateFilter === 'This Month') {
                                                return purchaseDate.getMonth() === now.getMonth() && 
                                                       purchaseDate.getFullYear() === now.getFullYear();
                                            }

                                            if (historyDateFilter === 'This Year') {
                                                return purchaseDate.getFullYear() === now.getFullYear();
                                            }

                                            return true;
                                        });

                                        if (filteredPurchases.length > 0) {
                                            let lastDateHeader = '';
                                            return filteredPurchases.map((item) => {
                                                const profile = profileMap[item.buyer_id];
                                                const buyerName = profile?.full_name || item.buyer_name || 'Guest';
                                                const amount = Number(item.total_amount) || Number(item.event_tickets?.price) || 0;
                                                
                                                const dateObj = new Date(item.created_at);
                                                const currentDateHeader = dateObj.toLocaleDateString('en-GB', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                });
                                                const timeStr = dateObj.toLocaleTimeString('en-GB', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                });

                                                const showHeader = currentDateHeader !== lastDateHeader;
                                                lastDateHeader = currentDateHeader;

                                                return (
                                                    <div key={item.id}>
                                                        {showHeader && (
                                                            <div className="pt-6 pb-3">
                                                                <p className="text-[14px] font-semibold text-black leading-tight">{currentDateHeader}</p>
                                                            </div>
                                                        )}
                                                        <div 
                                                            className="flex items-center gap-4 py-4 px-6 hover:bg-black/[0.02] transition-colors border-b border-black/5 last:border-0 -mx-6"
                                                        >
                                                            <div className="shrink-0 relative">
                                                                {profile?.avatar_url ? (
                                                                    <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-xs ${getAvatarColor(item.id)}`}>
                                                                        {getInitials(buyerName)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-black text-[13.5px] leading-snug line-clamp-2">
                                                                    <span className="font-bold">{buyerName}</span>
                                                                    <span className="text-black/40"> purchased a ticket for </span>
                                                                    <span className="font-semibold text-black/80">{item.events?.title}</span>
                                                                </p>
                                                                <div className="mt-1.5">
                                                                    <span className="text-[11px] font-medium text-black/30 uppercase tracking-tight">{timeStr}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="font-bold text-black text-[15px] tracking-tight">
                                                                    +₦{amount.toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        } else if (!historySearchQuery) {
                                            return (
                                                <div className="flex flex-col items-center justify-center text-center pt-24 pb-12 opacity-80">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-3xl">
                                                        🔍
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-black">Find a Transaction</h3>
                                                    <p className="text-[13px] text-black/50 mt-1">Start typing to search payments, buyers, or events</p>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="flex flex-col items-center justify-center text-center pt-24 pb-12">
                                                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                                                        <CircleSlash className="w-8 h-8 text-red-400" />
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-black">No results found</h3>
                                                    <p className="text-[13px] text-black/50 mt-1 px-4">We couldn't find any transactions matching "{historySearchQuery}"</p>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Edit Bank Account Modal (Slide-over Drawer) */}
            <AnimatePresence>
                {isEditingBank && (
                    <div className="fixed inset-0 z-[200] flex justify-end overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsEditingBank(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
                            className="relative h-full w-full md:w-[420px] md:h-[95vh] bg-white flex flex-col overflow-y-auto no-scrollbar md:rounded-2xl md:mt-[2.5vh] md:mr-4 md:drop-shadow-[-10px_0_25px_rgba(0,0,0,0.15)] z-10"
                        >
                            {/* Drawer Header */}
                            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
                                <div>
                                    <p className="text-sm font-semibold text-black tracking-tighter">
                                        Edit Bank Details
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsEditingBank(false)}
                                    className="p-2 hover:bg-black/5 rounded-full transition-colors group"
                                    title="Close"
                                >
                                    <X className="w-5 h-5 text-black/40 group-hover:text-black transition-colors" />
                                </button>
                            </div>
                            
                            {/* Drawer Form Content */}
                            <div className="p-6 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="block text-[13px] font-medium text-gray-700 ml-1">Account Number</label>
                                    <input 
                                        type="text" 
                                        maxLength={10}
                                        value={tempBankDetails.accountNumber}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setTempBankDetails({ 
                                                ...tempBankDetails, 
                                                accountNumber: val,
                                                bankName: '',
                                                accountHolder: ''
                                            });
                                        }}
                                        className="block w-full rounded-2xl px-3.5 py-3 text-base font-medium text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                                        placeholder="Enter 10-digit account number"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[13px] font-medium text-gray-700 ml-1">Bank Name</label>
                                        <select 
                                            value={tempBankDetails.bankName}
                                            onChange={(e) => setTempBankDetails({ ...tempBankDetails, bankName: e.target.value })}
                                            className="block w-full rounded-2xl px-3.5 py-3 text-base font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5 appearance-none cursor-pointer disabled:opacity-50"
                                            disabled={isLoadingBanks}
                                        >
                                            <option value="" disabled>{isLoadingBanks ? "Loading banks..." : "Select your bank"}</option>
                                            {banks.map(bank => (
                                                <option key={`${bank.code}-${bank.name}`} value={bank.name}>{bank.name}</option>
                                            ))}
                                        </select>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="block text-[13px] font-medium text-gray-700">Account Holder</label>
                                        {isCheckingAccount && (
                                            <span className="text-[11px] font-bold text-blue-600 animate-pulse flex items-center gap-1.5">
                                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Checking...
                                            </span>
                                        )}
                                    </div>
                                    <input 
                                        type="text" 
                                        value={tempBankDetails.accountHolder}
                                        readOnly
                                        className={`block w-full rounded-2xl px-3.5 py-3 text-base font-medium transition-all duration-200 shadow-sm ${isCheckingAccount ? 'bg-black/2' : 'bg-black/5'} ${tempBankDetails.accountHolder ? 'text-gray-900' : 'text-gray-400'}`}
                                        placeholder={isCheckingAccount ? "Resolving name..." : "Account holder name"}
                                    />
                                </div>
                                
                                {/* Info Tip */}
                                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/20">
                                    <p className="text-[11px] text-blue-600/70 font-medium leading-relaxed">
                                        Note: The account holder name is automatically retrieved from your bank's records to ensure accuracy.
                                    </p>
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className="px-6 py-5 border-t border-black/5 bg-gray-50/50 sticky bottom-0 flex items-center justify-end gap-3 mt-auto">
                                <button 
                                    onClick={() => setIsEditingBank(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black/60 hover:text-black hover:bg-black/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => { setBankDetails(tempBankDetails); setIsEditingBank(false); }}
                                    className="px-8 py-2.5 bg-black rounded-xl text-sm font-semibold text-white shadow-lg shadow-black/10 hover:bg-black/80 transition-all active:scale-[0.98]"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
