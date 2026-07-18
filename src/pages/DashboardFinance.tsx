import React, { useEffect, useState } from 'react';
import { DollarSign, Settings as SettingsIcon, FileText, Download, Plus, X, Search, CircleSlash, CreditCard, Receipt, Building2, Trash2, ShieldCheck, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';
import { getSession, setWalletPin } from '@/lib/api/auth';
import {
    createPaymentBankAccount,
    deletePaymentBankAccount,
    getPaymentBankAccounts,
    getPaymentBanks,
    getPaymentTransactions,
    getWalletBalanceStatus,
    requestWithdrawal,
    resolvePaymentBankAccount,
    setDefaultPaymentBankAccount,
    type PaymentBankAccount,
    type WalletBalance,
} from '@/lib/api/finance';
import { getEventOrders, getEventsByUser } from '@/lib/api/events';
import { getTicketsForEvent } from '@/lib/api/tickets';

const BANK_BRANDS: Record<string, { label: string; className: string }> = {
    '044': { label: 'A', className: 'bg-orange-50 text-orange-700' },
    '063': { label: 'A', className: 'bg-orange-50 text-orange-700' },
    '035A': { label: 'A', className: 'bg-purple-50 text-purple-700' },
    '070': { label: 'F', className: 'bg-emerald-50 text-emerald-700' },
    '011': { label: '1', className: 'bg-blue-50 text-blue-700' },
    '214': { label: 'F', className: 'bg-indigo-50 text-indigo-700' },
    '058': { label: 'GT', className: 'bg-orange-50 text-orange-700' },
    '301': { label: 'J', className: 'bg-green-50 text-green-700' },
    '082': { label: 'K', className: 'bg-red-50 text-red-700' },
    '50211': { label: 'K', className: 'bg-violet-50 text-violet-700' },
    '50515': { label: 'M', className: 'bg-sky-50 text-sky-700' },
    '999992': { label: 'O', className: 'bg-emerald-50 text-emerald-700' },
    '999991': { label: 'P', className: 'bg-pink-50 text-pink-700' },
    '076': { label: 'P', className: 'bg-blue-50 text-blue-700' },
    '221': { label: 'S', className: 'bg-blue-50 text-blue-700' },
    '068': { label: 'SC', className: 'bg-emerald-50 text-emerald-700' },
    '232': { label: 'S', className: 'bg-red-50 text-red-700' },
    '033': { label: 'UBA', className: 'bg-red-50 text-red-700' },
    '032': { label: 'U', className: 'bg-sky-50 text-sky-700' },
    '215': { label: 'U', className: 'bg-green-50 text-green-700' },
    '566': { label: 'V', className: 'bg-violet-50 text-violet-700' },
    '035': { label: 'W', className: 'bg-purple-50 text-purple-700' },
    '057': { label: 'Z', className: 'bg-red-50 text-red-700' },
};

const BANK_DETAILS_STORAGE_KEY = 'amptive_payout_bank_details';
// Bank details are cached per user so one account's payout details never render for another
// user on a shared browser. The un-scoped legacy key is cleared on load.
const getBankDetailsStorageKey = (userKey: string) => `${BANK_DETAILS_STORAGE_KEY}.${userKey}`;
const WITHDRAWALS_STORAGE_KEY = 'amptive_withdrawal_requests';
const WALLET_SECURITY_QUESTION_KEY = 'amptive_wallet_security_question';
const SECURITY_QUESTIONS = [
    'In what city were you born?',
    'What was the name of your first pet?',
    'What is your childhood nickname?',
    'What was the name of your first school?',
    "What is your mother's maiden name?",
];

const getUserScopedWithdrawalKey = (userId?: string) => (
    userId ? `${WITHDRAWALS_STORAGE_KEY}:${userId}` : WITHDRAWALS_STORAGE_KEY
);

const readSavedWithdrawals = (userId?: string) => {
    try {
        const stored = localStorage.getItem(getUserScopedWithdrawalKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const readWalletSecurityQuestion = () => {
    try {
        return localStorage.getItem(WALLET_SECURITY_QUESTION_KEY) || SECURITY_QUESTIONS[2];
    } catch {
        return SECURITY_QUESTIONS[2];
    }
};

const PinInput = ({ value, onChange, length = 4, autoFocus = false }: { value: string, onChange: (v: string) => void, length?: number, autoFocus?: boolean }) => {
    const inputs = React.useRef<(HTMLInputElement | null)[]>([]);

    React.useEffect(() => {
        if (autoFocus && inputs.current[0] && !value) {
            inputs.current[0].focus();
        }
    }, [autoFocus]);

    const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        if (!val) return;
        
        let newArr = value.split('').slice(0, length);
        while (newArr.length < length) newArr.push('');
        
        newArr[index] = val.slice(-1); 
        const newValue = newArr.join('');
        onChange(newValue);
        if (index < length - 1) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            let newArr = value.split('').slice(0, length);
            while (newArr.length < length) newArr.push('');
            
            if (!newArr[index] && index > 0) {
                inputs.current[index - 1]?.focus();
                newArr[index - 1] = '';
                onChange(newArr.join(''));
            } else {
                newArr[index] = '';
                onChange(newArr.join(''));
            }
        }
    };

    return (
        <div className="flex w-full justify-between max-w-[320px]">
            {Array.from({ length }).map((_, i) => (
                <input
                    key={i}
                    ref={el => inputs.current[i] = el}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ''}
                    onChange={e => handleChange(i, e)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="w-[60px] h-[72px] sm:w-[64px] sm:h-[76px] text-center text-[28px] font-semibold text-gray-900 bg-white border border-gray-200 rounded-[16px] focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)]"
                />
            ))}
        </div>
    );
};

export default function DashboardFinance() {
    const WithdrawalIcon = () => (
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.23584" y="1.24219" width="31.5273" height="31.5273" rx="15.7636" fill="#307FE2" />
            <path d="M17.1182 22.6632V11.0938" stroke="white" strokeWidth="2.2037" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11.3335 16.8785L17.1182 11.0938L22.9029 16.8785" stroke="white" strokeWidth="2.2037" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const PaidEventIcon = () => (
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.23584" y="1.24219" width="31.5273" height="31.5273" rx="15.7636" fill="#F91880" />
            <path d="M22.1666 11.8359C22.5561 11.8359 22.89 11.9744 23.1676 12.252C23.4448 12.5291 23.5836 12.8633 23.5836 13.2529V21.7529C23.5835 22.1424 23.4447 22.4763 23.1676 22.7539C22.89 23.031 22.5561 23.1689 22.1666 23.1689H10.8336C10.444 23.1689 10.1098 23.0311 9.83264 22.7539C9.55507 22.4763 9.4167 22.1424 9.41663 21.7529V18.9189C10.1989 18.9189 10.8334 18.2852 10.8336 17.5029C10.8336 16.7205 10.199 16.0859 9.41663 16.0859V13.2529C9.41663 12.8633 9.55498 12.5291 9.83264 12.252C10.1098 11.9743 10.444 11.8359 10.8336 11.8359H22.1666ZM16.4996 16.7939C16.2991 16.794 16.1312 16.8626 15.9957 16.998C15.8599 17.134 15.7916 17.3023 15.7916 17.5029V20.3359C15.7916 20.5366 15.8598 20.7043 15.9957 20.8398C16.1312 20.9758 16.2991 21.0439 16.4996 21.0439H20.7496C20.9503 21.0439 21.119 20.9758 21.2545 20.8398C21.3903 20.7044 21.4586 20.5365 21.4586 20.3359V17.5029C21.4586 17.3024 21.3903 17.134 21.2545 16.998C21.119 16.8625 20.9503 16.7939 20.7496 16.7939H16.4996Z" fill="white" />
        </svg>
    );

    const getBankBrand = (bankCode?: string, bankName?: string) => {
        const directMatch = bankCode ? BANK_BRANDS[bankCode] : undefined;
        if (directMatch) return directMatch;
        const matchedBank = banks.find(bank => bank.name === bankName);
        if (matchedBank && BANK_BRANDS[matchedBank.code]) return BANK_BRANDS[matchedBank.code];
        const initials = (bankName || 'Bank')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0])
            .join('')
            .toUpperCase();
        return { label: initials || 'B', className: 'bg-gray-50 text-gray-500' };
    };

    const BankLogo = ({ bankCode, bankName, className = 'h-10 w-10 rounded-xl' }: { bankCode?: string; bankName?: string; className?: string }) => {
        const brand = getBankBrand(bankCode, bankName);
        return (
            <div className={`${className} ${brand.className} shrink-0 overflow-hidden border border-black/5 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]`}>
                <span className="text-[11px] font-black tracking-tight">{brand.label}</span>
            </div>
        );
    };

    const [activeTab, setActiveTab] = useState<'payout' | 'settings' | 'receipt'>('payout');
    const [activeSettingsTab, setActiveSettingsTab] = useState<'payout-methods' | 'billing' | 'tax'>('payout-methods');
    const [showBalances, setShowBalances] = useState(true);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
    const [walletSetupRequired, setWalletSetupRequired] = useState(false);
    const [walletSetupError, setWalletSetupError] = useState('');
    const [isWalletSetupOpen, setIsWalletSetupOpen] = useState(false);
    const [isSettingWalletPin, setIsSettingWalletPin] = useState(false);
    const [walletSetupStep, setWalletSetupStep] = useState<'intro' | 'pin' | 'security' | 'creating' | 'result'>('intro');
    const [walletSetupSuccess, setWalletSetupSuccess] = useState(false);
    const [selectedWalletSecurityQuestion, setSelectedWalletSecurityQuestion] = useState(readWalletSecurityQuestion);
    const [walletPinForm, setWalletPinForm] = useState({
        new_pin: '',
        confirm_new_pin: '',
        security_question: selectedWalletSecurityQuestion,
        security_question_answer: '',
    });
    const [loading, setLoading] = useState(true);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historySearchQuery, setHistorySearchQuery] = useState('');
    const [isSearchingHistory, setIsSearchingHistory] = useState(false);
    const [historyDateFilter, setHistoryDateFilter] = useState('All');
    const [showFilterChips, setShowFilterChips] = useState(false);
    // Bank Details State
    const emptyBankDetails = {
        id: '',
        bankCode: '',
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        backendConfirmed: false
    };

    const toBankDetails = (account: PaymentBankAccount | null | undefined) => {
        if (!account) return { ...emptyBankDetails };
        return {
            id: account.id || account.bank_account_id || '',
            bankCode: account.bank_code || '',
            bankName: account.bank_name || '',
            accountNumber: account.account_number || '',
            accountHolder: account.account_name || '',
            backendConfirmed: true
        };
    };

    const readConfirmedBankDetails = (userKey: string) => {
        if (!userKey) return null;
        try {
            const stored = localStorage.getItem(getBankDetailsStorageKey(userKey));
            if (!stored) return null;
            const parsed = JSON.parse(stored);
            if (!parsed?.backendConfirmed || !parsed?.bankName || !parsed?.accountNumber) return null;
            return {
                ...emptyBankDetails,
                ...parsed,
                backendConfirmed: true
            };
        } catch {
            return null;
        }
    };

    const [bankDetails, setBankDetails] = useState({ ...emptyBankDetails });
    const [isEditingBank, setIsEditingBank] = useState(false);
    const [tempBankDetails, setTempBankDetails] = useState({ ...bankDetails });
    const [isCheckingAccount, setIsCheckingAccount] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawalAmount, setWithdrawalAmount] = useState('');
    const [withdrawalPin, setWithdrawalPin] = useState('');
    const [withdrawalSecurityAnswer, setWithdrawalSecurityAnswer] = useState('');
    const [withdrawalError, setWithdrawalError] = useState('');
    const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawStep, setWithdrawStep] = useState<'amount' | 'confirm'>('amount');
    const [currentUserKey, setCurrentUserKey] = useState('');
    const [withdrawals, setWithdrawals] = useState<any[]>([]);

    // Bank Data State (backend list replaces this fallback when available)
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
    const [isSavingBank, setIsSavingBank] = useState(false);
    const [isDeletingBank, setIsDeletingBank] = useState(false);
    const [bankSaveError, setBankSaveError] = useState('');
    const [bankDeleteError, setBankDeleteError] = useState('');
    const [accountResolveError, setAccountResolveError] = useState('');
    const hasBankAccount = Boolean(bankDetails.bankName && bankDetails.accountNumber);

    const saveBankDetails = async () => {
        const selectedBank = banks.find(b => b.name === tempBankDetails.bankName);
        if (!selectedBank || tempBankDetails.accountNumber.length !== 10) return;

        setIsSavingBank(true);
        setBankSaveError('');
        setAccountResolveError('');
        try {
            const createdAccount = await createPaymentBankAccount({
                bank_code: selectedBank.code,
                bank_name: selectedBank.name,
                account_number: tempBankDetails.accountNumber,
                account_name: tempBankDetails.accountHolder || undefined,
            });

            if (!createdAccount) {
                setBankSaveError('Could not save this bank account. Please try again.');
                return;
            }

            const nextBankDetails = toBankDetails(createdAccount);
            setBankDetails(nextBankDetails);
            setTempBankDetails(nextBankDetails);
            if (currentUserKey) localStorage.setItem(getBankDetailsStorageKey(currentUserKey), JSON.stringify(nextBankDetails));
            if (nextBankDetails.id) {
                await setDefaultPaymentBankAccount(nextBankDetails.id);
            }
            await loadBankAccounts();
            setIsEditingBank(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message.toLowerCase().includes('already been added')) {
                const loaded = await loadBankAccounts();
                if (loaded) {
                    setBankSaveError('');
                    setIsEditingBank(false);
                    return;
                }
                const existingAccount = {
                    ...tempBankDetails,
                    bankCode: selectedBank.code,
                    bankName: selectedBank.name,
                    backendConfirmed: true
                };
                setBankDetails(existingAccount);
                setTempBankDetails(existingAccount);
                if (currentUserKey) localStorage.setItem(getBankDetailsStorageKey(currentUserKey), JSON.stringify(existingAccount));
                setBankSaveError('');
                setIsEditingBank(false);
                return;
            }
            setBankSaveError(message || 'Could not save this bank account. Please try again.');
        } finally {
            setIsSavingBank(false);
        }
    };

    const loadBankAccounts = async (userKey = currentUserKey) => {
        try {
            const accounts = await getPaymentBankAccounts();
            const defaultAccount = accounts.find(account => account.is_default) || accounts[0];
            if (defaultAccount) {
                const nextBankDetails = toBankDetails(defaultAccount);
                setBankDetails(nextBankDetails);
                setTempBankDetails(nextBankDetails);
                setBankDeleteError('');
                if (userKey) localStorage.setItem(getBankDetailsStorageKey(userKey), JSON.stringify(nextBankDetails));
                return true;
            } else {
                setBankDetails({ ...emptyBankDetails });
                setTempBankDetails({ ...emptyBankDetails });
                setBankDeleteError('');
                if (userKey) localStorage.removeItem(getBankDetailsStorageKey(userKey));
                return false;
            }
        } catch (error) {
            console.error('Error loading bank accounts:', error);
            // Backend unavailable — keep whatever this user's cache had rather than wiping the card.
            const savedAccount = readConfirmedBankDetails(userKey);
            setBankDetails(savedAccount || { ...emptyBankDetails });
            setTempBankDetails(savedAccount || { ...emptyBankDetails });
            return Boolean(savedAccount);
        }
    };

    const fetchBanks = async () => {
        setIsLoadingBanks(true);
        try {
            const backendBanks = await getPaymentBanks();
            if (backendBanks.length > 0) setBanks(backendBanks.map((b) => ({ name: b.name, code: b.code })));
        } catch (error) {
            console.error('Error fetching banks:', error);
        } finally {
            setIsLoadingBanks(false);
        }
    };

    const openBankEditor = (details = hasBankAccount ? { ...bankDetails } : { ...emptyBankDetails }) => {
        setTempBankDetails(details);
        setBankSaveError('');
        setBankDeleteError('');
        setAccountResolveError('');
        setIsEditingBank(true);
        fetchBanks();
    };

    const deleteBankDetails = async () => {
        if (!hasBankAccount || isDeletingBank) return;

        setIsDeletingBank(true);
        setBankDeleteError('');
        try {
            // The cached details may lack an id (older saves) — resolve it from the backend
            // list so the account is actually deleted server-side, not just hidden locally.
            let accountId = bankDetails.id;
            if (!accountId) {
                const accounts = await getPaymentBankAccounts().catch(() => []);
                const match = accounts.find(account =>
                    account.account_number === bankDetails.accountNumber ||
                    (account.account_number || '').slice(-4) === (bankDetails.accountNumber || '').slice(-4)
                );
                accountId = match?.id || '';
            }
            if (accountId) {
                await deletePaymentBankAccount(accountId);
            }
            setBankDetails({ ...emptyBankDetails });
            setTempBankDetails({ ...emptyBankDetails });
            if (currentUserKey) localStorage.removeItem(getBankDetailsStorageKey(currentUserKey));
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            setBankDeleteError(message || 'Could not delete this bank account. Please try again.');
        } finally {
            setIsDeletingBank(false);
        }
    };

    useEffect(() => {
        fetchBanks();
    }, []);

    useEffect(() => {
        if (!isEditingBank) return;
        
        const { accountNumber, bankName } = tempBankDetails;
        const selectedBank = banks.find(b => b.name === bankName);

        if (accountNumber.length === 10 && selectedBank) {
            setIsCheckingAccount(true);
            setAccountResolveError('');
            
            const resolveAccount = async () => {
                try {
                    const result = await resolvePaymentBankAccount({
                        account_number: accountNumber,
                        bank_code: selectedBank.code,
                    });
                    const accountName = result?.account_name || '';

                    if (accountName) {
                        setTempBankDetails(prev => ({ ...prev, bankCode: selectedBank.code, accountHolder: accountName }));
                        setAccountResolveError('');
                    } else {
                        setTempBankDetails(prev => ({ ...prev, bankCode: selectedBank.code, accountHolder: '' }));
                        setAccountResolveError('Unable to resolve account. Please confirm the bank and account number, then try again.');
                    }
                } catch (error: any) {
                    console.error('Error resolving account:', error);
                    setTempBankDetails(prev => ({ ...prev, bankCode: selectedBank.code, accountHolder: '' }));
                    setAccountResolveError('Unable to resolve account. Please confirm the bank and account number, then try again.');
                } finally {
                    setIsCheckingAccount(false);
                }
            };

            const timer = setTimeout(resolveAccount, 1000); // 1s debounce
            return () => clearTimeout(timer);
        } else {
            setTempBankDetails(prev => ({ ...prev, bankCode: selectedBank?.code || '', accountHolder: '' }));
            setAccountResolveError('');
        }
    }, [tempBankDetails.accountNumber, tempBankDetails.bankName, isEditingBank, banks]);

    const fetchFinanceData = async () => {
        try {
            setLoading(true);
            const session = await getSession();
            if (!session?.user) return;
            const userKey = String((session.user as any).id || (session.user as any).user_id || session.user.email || '');
            setCurrentUserKey(userKey);
            setWithdrawals(readSavedWithdrawals(userKey));

            // Drop the legacy un-scoped cache so it can never leak across accounts.
            localStorage.removeItem(BANK_DETAILS_STORAGE_KEY);
            // Seed from this user's cache for an instant render; backend result overwrites it.
            const cachedBankDetails = readConfirmedBankDetails(userKey);
            if (cachedBankDetails) {
                setBankDetails(cachedBankDetails);
                setTempBankDetails(cachedBankDetails);
            }

            await loadBankAccounts(userKey);
            const [balanceResult, transactions] = await Promise.all([
                getWalletBalanceStatus(),
                getPaymentTransactions(100),
            ]);
            setWalletBalance(balanceResult.balance);
            setWalletSetupRequired(balanceResult.walletMissing);
            setWalletSetupError(balanceResult.walletMissing ? 'Set up your wallet PIN to create your wallet and view your balance.' : '');
            setPaymentTransactions(transactions);

            // Build ticket purchase rows from the event/ticket APIs that exist today.
            const financeRows = await buildTicketSalesFallback(transactions);
            setPurchases(financeRows);
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

    const toNumber = (value: unknown) => {
        if (value === null || value === undefined || value === '') return 0;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
    };

    const getTicketSoldCount = (ticket: any) => toNumber(
        ticket.quantity_sold ??
        ticket.sold ??
        ticket.sold_quantity ??
        ticket.tickets_sold ??
        ticket.purchased_count ??
        ticket.purchase_count
    );

    const getTicketPrice = (ticket: any) => toNumber(ticket.price ?? ticket.amount ?? ticket.ticket_price);

    const getOrderAmount = (item: any) => {
        const directAmount = toNumber(
            item.total_amount ??
            item.total_price ??
            item.amount ??
            item.purchase?.amount ??
            item.purchase?.total_amount ??
            item.price_paid ??
            item.amount_paid ??
            item.unit_price_paid ??
            item.ticket_pricing?.unit_price
        );
        if (directAmount > 0) return directAmount;

        const tickets = Array.isArray(item.tickets) ? item.tickets : [];
        const ticketTotal = tickets.reduce((sum: number, ticket: any) => {
            const ticketAmount = toNumber(
                ticket.total_amount ??
                ticket.price_paid ??
                ticket.amount_paid ??
                ticket.unit_price_paid ??
                ticket.ticket_pricing?.unit_price
            );
            return sum + ticketAmount;
        }, 0);
        if (ticketTotal > 0) return ticketTotal;

        return toNumber(item.event_tickets?.price ?? item.ticket_price);
    };

    const getOrderStatus = (item: any) => String(
        item.ticket_status ??
        item.status ??
        item.payment_status ??
        item.purchase?.status ??
        item.purchase?.payment_status ??
        item.payment?.status ??
        item.transaction_status ??
        item.transaction_status ??
        item.transaction?.status ??
        item.tickets?.[0]?.ticket_status ??
        item.tickets?.[0]?.status ??
        ''
    ).trim().toLowerCase();

    const isPaidOrder = (item: any) => {
        if (item.source === 'ticket_summary') return true;
        const status = getOrderStatus(item);
        if (['cancelled', 'canceled', 'refunded', 'failed', 'void'].includes(status)) return false;
        if (['valid', 'used', 'paid', 'completed', 'success', 'successful', 'attended', 'scanned', 'issued'].includes(status)) return true;
        return getOrderAmount(item) > 0 && !status;
    };

    const getEventTitle = (item: any) => (
        item.event_title ||
        item.metadata?.event_title ||
        item.events?.title ||
        item.event?.title ||
        (item.category ? item.category.replace(/_/g, ' ') : 'Transaction')
    );

    const getBuyerName = (item: any, profile?: any) => {
        if (item.source === 'ticket_summary') return item.ticket_label || 'Ticket sales';
        if (item.source === 'payment_transaction') {
            if (item.category === 'event_payment') return item.buyer_name || item.customer_name || 'Ticket payment';
            if (item.category === 'withdrawal') return 'Withdrawal';
            if (item.category === 'wallet_funding') return 'Wallet funding';
            return item.category ? item.category.replace(/_/g, ' ') : 'Transaction';
        }
        return profile?.full_name || item.buyer_name || item.customer_name || 'Guest';
    };

    const getItemDate = (item: any) => item.created_at || item.updated_at || new Date().toISOString();

    const getWithdrawalArrivalDate = (createdAt: string) => {
        const date = new Date(createdAt);
        date.setDate(date.getDate() + 2);
        return date;
    };

    const formatArrivalTime = (createdAt: string) => {
        return getWithdrawalArrivalDate(createdAt).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    // Rows built from successful event payments — used while the orders endpoint is failing
    // server-side, so history still shows real purchase dates and references.
    const buildEventPaymentRows = (events: any[], transactions: any[]) => {
        const singleEventTitle = events.length === 1 ? (events[0]?.title || '') : '';
        return (transactions || [])
            .filter((tx: any) => (
                tx.category === 'event_payment' &&
                tx.transaction_type !== 'debit' &&
                ['successful', 'success', 'completed', 'paid'].includes(String(tx.transaction_status || '').toLowerCase())
            ))
            .map((tx: any) => ({
                ...tx,
                source: 'payment_transaction',
                id: tx.reference,
                event_title: singleEventTitle,
                buyer_name: tx.buyer_name || 'Ticket buyer',
                total_amount: toNumber(tx.amount),
                status: tx.transaction_status,
                created_at: tx.created_at || new Date().toISOString(),
            }));
    };

    const buildTicketSalesFallback = async (transactions: any[] = []) => {
        try {
            const events = await getEventsByUser();
            const failures: unknown[] = [];
            const rows = await Promise.all((events || []).map(async (event: any) => {
                const eventId = event.event_id || event.id;
                if (!eventId) return [];

                const eventOrders = await getEventOrders(eventId).catch((error) => {
                    failures.push(error);
                    return [];
                });
                if (eventOrders.length > 0) {
                    return eventOrders.map((order: any) => {
                        const purchase = order.purchase || {};
                        const tickets = Array.isArray(order.tickets) ? order.tickets : [];
                        const firstTicket = tickets[0] || {};
                        const metadata = purchase.metadata || order.metadata || {};

                        return {
                            ...order,
                            source: 'event_order',
                            id: order.id || purchase.id || order.purchase_id || firstTicket.purchase_id || firstTicket.id,
                            event_id: order.event_id || purchase.event_id || eventId,
                            event_title: order.event_title || order.events?.title || order.event?.title || event.title,
                            events: { ...(order.events || {}), title: order.event_title || order.events?.title || order.event?.title || event.title },
                            buyer_id: order.buyer_id || order.buyer_user_id || order.user_id || purchase.buyer_id || purchase.buyer_user_id || purchase.user_id || metadata.buyer_id || metadata.buyer_user_id || order.user?.id || order.buyer?.id || '',
                            buyer_name: order.buyer_name || purchase.buyer_name || metadata.buyer_name || firstTicket.attendee_name || order.user?.name || order.buyer?.name || 'Guest',
                            buyer_email: order.buyer_email || purchase.buyer_email || metadata.buyer_email || firstTicket.attendee_email || order.user?.email || order.buyer?.email || '',
                            ticket_label: order.ticket_label || firstTicket.event_tickets?.label || firstTicket.label || 'Ticket',
                            ticket_count: tickets.length || order.ticket_count || order.quantity || 1,
                            total_amount: getOrderAmount(order),
                            ticket_status: order.ticket_status || order.status || purchase.status || firstTicket.ticket_status || firstTicket.status || 'paid',
                            created_at: order.created_at || purchase.created_at || order.purchase_date || order.purchased_at || firstTicket.created_at || new Date().toISOString(),
                        };
                    }).filter((order: any) => getOrderAmount(order) > 0 && isPaidOrder(order));
                }

                let tickets = Array.isArray(event.ticket_types)
                    ? event.ticket_types
                    : Array.isArray(event.event_tickets)
                        ? event.event_tickets
                        : [];

                if (tickets.length === 0) {
                    try {
                        tickets = await getTicketsForEvent(eventId);
                    } catch {
                        tickets = [];
                    }
                }

                return tickets
                    .map((ticket: any) => {
                        const soldCount = getTicketSoldCount(ticket);
                        const price = getTicketPrice(ticket);
                        if (soldCount <= 0 || price <= 0) return null;

                        return {
                            id: `ticket-summary-${eventId}-${ticket.id || ticket.ticket_type_id || ticket.label}`,
                            source: 'ticket_summary',
                            event_id: eventId,
                            ticket_id: ticket.id || ticket.ticket_type_id,
                            ticket_label: ticket.label || ticket.name || 'Ticket',
                            ticket_count: soldCount,
                            total_amount: soldCount * price,
                            ticket_price: price,
                            ticket_status: 'paid',
                            created_at: ticket.updated_at || ticket.created_at || event.updated_at || event.created_at || new Date().toISOString(),
                            events: { title: event.title || 'Event' },
                        };
                    })
                    .filter(Boolean);
            }));

            // If every event's orders request failed, prefer per-payment rows (real dates and
            // references) over the aggregated ticket-summary rows built above.
            if (failures.length > 0 && failures.length === (events || []).length) {
                const paymentRows = buildEventPaymentRows(events || [], transactions);
                if (paymentRows.length > 0) return paymentRows;
            }

            return rows.flat();
        } catch (error) {
            console.error('Error building finance fallback data:', error);
            return [];
        }
    };

    const totalBalance = purchases.reduce((acc, p) => {
        if (isPaidOrder(p)) {
            return acc + getOrderAmount(p);
        }
        return acc;
    }, 0);
    const pendingWithdrawalTotal = withdrawals
        .filter((item) => item.status === 'pending' || item.status === 'processing')
        .reduce((acc, item) => acc + toNumber(item.amount), 0);
    const pendingBalance = walletBalance?.pending_balance ?? 0;
    const availableBalance = walletBalance?.available_balance ?? 0;

    const openWithdrawDrawer = () => {
        if (walletSetupRequired) {
            setWalletSetupStep('intro');
            setWalletSetupSuccess(false);
            setIsWalletSetupOpen(true);
            return;
        }
        setWithdrawalError('');
        setWithdrawalSuccess(false);
        setWithdrawalAmount('');
        setWithdrawalPin('');
        setWithdrawalSecurityAnswer('');
        setWithdrawStep('amount');
        setIsWithdrawOpen(true);
    };

    const continueWithdrawal = () => {
        const amount = toNumber(withdrawalAmount.replace(/,/g, ''));
        if (!hasBankAccount) {
            setWithdrawalError('Add a payout bank account before withdrawing.');
            return;
        }
        if (amount <= 0) {
            setWithdrawalError('Enter a valid withdrawal amount.');
            return;
        }
        if (amount > availableBalance) {
            setWithdrawalError('Amount is higher than your available balance.');
            return;
        }
        setWithdrawalError('');
        setWithdrawStep('confirm');
    };

    const handleWalletPinChange = (field: keyof typeof walletPinForm, value: string) => {
        const nextValue = field.includes('pin') ? value.replace(/\D/g, '').slice(0, 4) : value;
        setWalletSetupError('');
        setWalletPinForm(prev => ({ ...prev, [field]: nextValue }));
    };

    const openWalletSetup = () => {
        setWalletSetupStep('intro');
        setWalletSetupSuccess(false);
        setWalletSetupError('');
        setIsWalletSetupOpen(true);
    };

    const closeWalletSetup = () => {
        if (isSettingWalletPin) return;
        setIsWalletSetupOpen(false);
    };

    const submitWalletSetup = async (event?: React.FormEvent) => {
        event?.preventDefault();
        if (isSettingWalletPin) return;

        if (walletPinForm.new_pin.length !== 4) {
            setWalletSetupStep('pin');
            setWalletSetupError('Enter a 4-digit wallet PIN.');
            return;
        }

        if (walletPinForm.new_pin !== walletPinForm.confirm_new_pin) {
            setWalletSetupStep('pin');
            setWalletSetupError('The PIN confirmation does not match.');
            return;
        }

        if (!walletPinForm.security_question.trim()) {
            setWalletSetupStep('security');
            setWalletSetupError('Select a security question.');
            return;
        }

        if (!walletPinForm.security_question_answer.trim()) {
            setWalletSetupStep('security');
            setWalletSetupError('Answer your security question. This answer is case sensitive.');
            return;
        }

        setIsSettingWalletPin(true);
        setWalletSetupError('');
        setWalletSetupStep('creating');
        try {
            const result = await setWalletPin({
                new_pin: walletPinForm.new_pin,
                confirm_new_pin: walletPinForm.confirm_new_pin,
                security_question: walletPinForm.security_question.trim(),
                security_question_answer: walletPinForm.security_question_answer.trim(),
            });

            if (!result.ok) {
                setWalletSetupSuccess(false);
                setWalletSetupStep('result');
                setWalletSetupError(result.message || 'Could not set up your wallet.');
                return;
            }

            const balanceResult = await getWalletBalanceStatus();
            setWalletBalance(balanceResult.balance);
            setWalletSetupRequired(balanceResult.walletMissing);
            setWalletSetupSuccess(!balanceResult.walletMissing);
            setWalletSetupStep('result');
            setWalletSetupError(balanceResult.walletMissing ? 'Wallet PIN saved, but the wallet balance is still not available. Please refresh and try again.' : '');
            if (!balanceResult.walletMissing) {
                setSelectedWalletSecurityQuestion(walletPinForm.security_question);
                localStorage.setItem(WALLET_SECURITY_QUESTION_KEY, walletPinForm.security_question);
            }
        } finally {
            setIsSettingWalletPin(false);
        }
    };

    const formatAmountInput = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (!digits) return '';
        return Number(digits).toLocaleString('en-NG');
    };

    const handleWithdrawalAmountChange = (value: string) => {
        const formattedAmount = formatAmountInput(value);
        const amount = toNumber(formattedAmount.replace(/,/g, ''));
        setWithdrawalAmount(formattedAmount);

        if (amount > availableBalance) {
            setWithdrawalError('Amount is higher than your available balance.');
            return;
        }

        setWithdrawalError('');
    };

    const submitWithdrawal = async () => {
        if (isWithdrawing) return;
        const amount = toNumber(withdrawalAmount.replace(/,/g, ''));

        if (!hasBankAccount) {
            setWithdrawalError('Add a payout bank account before withdrawing.');
            return;
        }

        if (amount <= 0) {
            setWithdrawalError('Enter a valid withdrawal amount.');
            return;
        }

        if (amount > availableBalance) {
            setWithdrawalError('Amount is higher than your available balance.');
            return;
        }

        if (withdrawalPin.length !== 4) {
            setWithdrawalError('Enter your 4-digit wallet PIN.');
            return;
        }

        if (!withdrawalSecurityAnswer) {
            setWithdrawalError('Enter your security answer exactly as you created it.');
            return;
        }

        setIsWithdrawing(true);
        setWithdrawalError('');
        try {
            const result = await requestWithdrawal({
                amount,
                bank_account_id: bankDetails.id || undefined,
            });

            if (!result.ok) {
                setWithdrawalError(result.error || 'Withdrawal request failed. Please try again.');
                return;
            }

            // Keep a local record for the activity feed until the backend transaction appears.
            const request = {
                id: `wd-${Date.now()}`,
                type: 'withdrawal',
                amount,
                bankName: bankDetails.bankName,
                accountNumber: bankDetails.accountNumber,
                accountHolder: bankDetails.accountHolder,
                status: 'pending',
                created_at: new Date().toISOString(),
            };
            const nextWithdrawals = [request, ...withdrawals];
            setWithdrawals(nextWithdrawals);
            localStorage.setItem(getUserScopedWithdrawalKey(currentUserKey), JSON.stringify(nextWithdrawals));

            const balanceResult = await getWalletBalanceStatus();
            setWalletBalance(balanceResult.balance);

            setWithdrawalSuccess(true);
            setWithdrawalAmount('');
        } finally {
            setIsWithdrawing(false);
        }
    };

    const backendWithdrawals = paymentTransactions
        .filter((item) => item.transaction_type === 'debit' || item.category === 'withdrawal')
        .map((item) => ({
            ...item,
            source: 'payment_transaction',
            type: 'withdrawal',
            status: item.transaction_status,
            created_at: item.created_at || new Date().toISOString(),
        }));

    const backendNonEventPayments = paymentTransactions
        .filter((item) => {
            if (item.transaction_type === 'debit' || item.category === 'withdrawal') return false;
            if (item.category === 'event_payment') return false;
            return ['successful', 'success', 'paid', 'completed'].includes(String(item.transaction_status || item.status || '').toLowerCase());
        })
        .map((item) => ({
            ...item,
            source: 'payment_transaction',
            type: 'purchase',
            status: item.transaction_status,
            created_at: item.created_at || new Date().toISOString(),
        }));

    const ticketPurchaseItems = purchases.map((item) => ({
        ...item,
        type: item.type || 'purchase',
        created_at: getItemDate(item),
    })).filter(isPaidOrder);

    const localWithdrawalItems = withdrawals.map((item) => ({
        ...item,
        type: 'withdrawal',
        created_at: item.created_at || new Date().toISOString(),
    }));

    // Merge: ticket purchase data (richest source for event orders) + backend withdrawals + local withdrawals + other backend transactions
    const allWithdrawals = backendWithdrawals.length > 0 ? backendWithdrawals : localWithdrawalItems;

    const activityItems = [
        ...ticketPurchaseItems,
        ...allWithdrawals,
        ...backendNonEventPayments,
    ].sort((a, b) => new Date(getItemDate(b)).getTime() - new Date(getItemDate(a)).getTime());

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
                                    ) : walletSetupRequired ? (
                                        <span className="text-[24px] leading-none">Set up wallet</span>
                                    ) : (
                                        showBalances ? formatCurrency(availableBalance) : '••••••••'
                                    )}
                                </div>
                                {walletSetupRequired && !loading && (
                                    <p className="mt-2 text-[12px] font-medium text-amber-700">
                                        Set up your wallet to receive payments from events, gifts, and subscriptions.
                                    </p>
                                )}
                                {pendingBalance > 0 && !loading && (
                                    <p className="mt-2 text-[12px] font-medium text-black/40">
                                        {formatCurrency(pendingBalance)} pending
                                    </p>
                                )}
                                <div className="flex flex-row md:flex-col min-[1285px]:flex-row items-center md:items-stretch min-[1285px]:items-center gap-3 mt-6">
                                    <button
                                        onClick={() => walletSetupRequired && openWalletSetup()}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                                    >
                                        {walletSetupRequired ? <ShieldCheck className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        {walletSetupRequired ? 'Set Up Wallet' : 'Fund Wallet'}
                                    </button>
                                    <button
                                        onClick={openWithdrawDrawer}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-black/5 text-black rounded-full text-sm font-medium hover:bg-black/10 transition-colors"
                                    >
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
                                    ) : activityItems.length > 0 ? (
                                        activityItems.slice(0, 4).map((item) => {
                                            const buyerName = getBuyerName(item);
                                            const amount = getOrderAmount(item);
                                            const eventTitle = getEventTitle(item);
                                            const isWithdrawal = item.type === 'withdrawal';
                                            const time = new Date(getItemDate(item)).toLocaleDateString() === new Date().toLocaleDateString()
                                                ? 'Today'
                                                : new Date(getItemDate(item)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

                                            return (
                                                <div key={item.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-black/5 transition-colors border border-black/5">
                                                    <div className="flex items-center gap-4">
                                                        {isWithdrawal ? (
                                                            <div className="w-10 h-10 flex items-center justify-center shrink-0">
                                                                <WithdrawalIcon />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 flex items-center justify-center shrink-0">
                                                                <PaidEventIcon />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-black text-[13px]">
                                                                {isWithdrawal ? (
                                                                    <>
                                                                        Withdrawal <span className="text-black/60 font-normal">to {item.bankName} arrives {formatArrivalTime(getItemDate(item))}</span>
                                                                    </>
                                                                ) : item.source === 'ticket_summary' ? (
                                                                    <>
                                                                        {buyerName} <span className="text-black/60 font-normal">sold for {eventTitle}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {buyerName} <span className="text-black/60 font-normal">purchased a ticket for {eventTitle}</span>
                                                                    </>
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-black/40 mt-0.5">{time}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-black text-sm">
                                                            {showBalances ? `${isWithdrawal ? '-' : '+'}₦${amount.toLocaleString()}` : '••••'}
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
                                                onClick={() => openBankEditor()}
                                                className="p-1 -mr-1 text-black/40 hover:text-black transition-colors"
                                                title="Add Account"
                                            >
                                                <Plus className="w-6 h-6" />
                                            </button>
                                        </div>

                                        <div className="px-6 py-6 border-t border-black/5">
                                            {hasBankAccount ? (
                                                <div className="w-full max-w-[340px] bg-white rounded-2xl border border-black/5 shadow-sm p-5 flex flex-col transition-all duration-300">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <BankLogo bankCode={bankDetails.bankCode} bankName={bankDetails.bankName} />
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={deleteBankDetails}
                                                                disabled={isDeletingBank}
                                                                className="w-9 h-9 rounded-xl border border-black/5 flex items-center justify-center text-black/40 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                                                                title="Delete Account"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openBankEditor({ ...bankDetails })}
                                                                className="w-9 h-9 rounded-xl border border-black/5 flex items-center justify-center text-black/60 hover:bg-black/5 hover:text-black transition-colors shrink-0"
                                                                title="Edit Account"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="mb-6">
                                                        <h3 className="text-black font-semibold text-[15px] mb-1.5">{bankDetails.bankName}</h3>
                                                        <p className="text-black/50 text-[13px] leading-relaxed pr-4">
                                                            Account ending in •••• {bankDetails.accountNumber.slice(-4)}
                                                            {bankDetails.accountHolder ? ` for ${bankDetails.accountHolder}` : ''}.
                                                        </p>
                                                    </div>

                                                    <div className="border-t border-black/5 pt-4 flex items-center justify-between mt-auto">
                                                        <span className="text-[12px] font-medium text-black/40">Default payout account</span>
                                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                                            Active
                                                        </span>
                                                    </div>
                                                    {bankDeleteError && (
                                                        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">
                                                            {bankDeleteError}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="py-8 flex flex-col items-center justify-center text-center">
                                                    <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-black/5 flex items-center justify-center mb-5">
                                                        <Building2 className="w-7 h-7 text-black/20" />
                                                    </div>
                                                    <h3 className="text-black font-semibold text-[15px] mb-1.5">No bank account added</h3>
                                                    <p className="text-black/45 text-[13px] leading-relaxed max-w-[300px]">
                                                        Add a payout account when you are ready to receive withdrawals.
                                                    </p>
                                                    <button
                                                        onClick={() => openBankEditor({ ...emptyBankDetails })}
                                                        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Add Account
                                                    </button>
                                                </div>
                                            )}
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
                                                const amount = getOrderAmount(item);
                                                const date = new Date(getItemDate(item)).toLocaleDateString('en-GB', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                });
                                                const isPaid = isPaidOrder(item);

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

            {/* Wallet Setup Drawer */}
            <AnimatePresence>
                {isWalletSetupOpen && (
                    <div className="fixed inset-0 z-[190] flex justify-end overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={closeWalletSetup}
                        />
                        <motion.form
                            onSubmit={submitWalletSetup}
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
                            className="relative h-full w-full md:w-[420px] md:h-[95vh] bg-white flex flex-col overflow-y-auto no-scrollbar md:rounded-2xl md:mt-[2.5vh] md:mr-4 md:drop-shadow-[-10px_0_25px_rgba(0,0,0,0.15)] z-10"
                        >
                            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
                                <div>
                                    <p className="text-sm font-semibold text-black tracking-tighter">Set Up Wallet</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeWalletSetup}
                                    className="p-2 hover:bg-black/5 rounded-full transition-colors group"
                                    title="Close"
                                >
                                    <X className="w-5 h-5 text-black/40 group-hover:text-black transition-colors" />
                                </button>
                            </div>

                            <div className="p-6 flex-1">
                                <AnimatePresence mode="wait">
                                    {walletSetupStep === 'intro' && (
                                        <motion.div
                                            key="wallet-intro"
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -12 }}
                                            className="min-h-[500px] flex flex-col justify-center text-center"
                                        >
                                            <img
                                                src="/images/finance/wallet-setup-illustration.svg"
                                                alt=""
                                                className="mx-auto h-[150px] w-auto object-contain"
                                            />
                                            <h2 className="mt-6 text-[24px] font-bold tracking-tight text-black">Setup your Amptive wallet</h2>
                                            <p className="mx-auto mt-3 max-w-[300px] text-[14px] leading-relaxed text-black/45">
                                                Your Wallet, Your Way
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setWalletSetupStep('pin')}
                                                className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-[15px] font-bold text-white hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                Begin Setup
                                            </button>
                                        </motion.div>
                                    )}

                                    {walletSetupStep === 'pin' && (
                                        <motion.div
                                            key="wallet-pin"
                                            initial={{ opacity: 0, x: 18 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -18 }}
                                            className="space-y-6"
                                        >
                                            {walletPinForm.new_pin.length < 4 ? (
                                                <motion.div
                                                    key="create-pin"
                                                    initial={{ opacity: 0, x: 18 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -18 }}
                                                    className="space-y-6"
                                                >
                                                    <div>
                                                        <p className="text-[12px] font-semibold uppercase tracking-wide text-black/35">Step 1 of 2</p>
                                                        <h2 className="mt-2 text-[22px] font-bold tracking-tight text-black">Create your PIN</h2>
                                                        <p className="mt-2 text-[13px] leading-relaxed text-black/45">
                                                            Use a 4-digit PIN. You will enter this PIN when making withdrawals.
                                                        </p>
                                                    </div>
                                                    <div className="pt-2">
                                                        <PinInput 
                                                            value={walletPinForm.new_pin} 
                                                            onChange={(v) => {
                                                                handleWalletPinChange('new_pin', v);
                                                                setWalletSetupError('');
                                                            }} 
                                                            autoFocus
                                                        />
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="confirm-pin"
                                                    initial={{ opacity: 0, x: 18 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -18 }}
                                                    className="space-y-6"
                                                >
                                                    <div>
                                                        <p className="text-[12px] font-semibold uppercase tracking-wide text-black/35">Step 1 of 2</p>
                                                        <h2 className="mt-2 text-[22px] font-bold tracking-tight text-black">Confirm your PIN</h2>
                                                        <p className="mt-2 text-[13px] leading-relaxed text-black/45">
                                                            Please enter your 4-digit PIN again to confirm.
                                                        </p>
                                                    </div>
                                                    <div className="pt-2">
                                                        <PinInput 
                                                            value={walletPinForm.confirm_new_pin} 
                                                            onChange={(v) => {
                                                                handleWalletPinChange('confirm_new_pin', v);
                                                                setWalletSetupError('');
                                                            }} 
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleWalletPinChange('new_pin', '');
                                                                handleWalletPinChange('confirm_new_pin', '');
                                                                setWalletSetupError('');
                                                            }}
                                                            className="text-[13px] font-semibold text-black/40 hover:text-black transition-colors"
                                                        >
                                                            Start over
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {walletSetupError && (
                                                <p className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
                                                    {walletSetupError}
                                                </p>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (walletPinForm.new_pin.length !== 4) {
                                                        setWalletSetupError('Enter a 4-digit wallet PIN.');
                                                        return;
                                                    }
                                                    if (walletPinForm.new_pin !== walletPinForm.confirm_new_pin) {
                                                        setWalletSetupError('The PIN confirmation does not match.');
                                                        return;
                                                    }
                                                    setWalletSetupError('');
                                                    setWalletSetupStep('security');
                                                }}
                                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-[15px] font-bold text-white hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                Continue
                                            </button>
                                        </motion.div>
                                    )}

                                    {walletSetupStep === 'security' && (
                                        <motion.div
                                            key="wallet-security"
                                            initial={{ opacity: 0, x: 18 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -18 }}
                                            className="space-y-6"
                                        >
                                            <div>
                                                <p className="text-[12px] font-semibold uppercase tracking-wide text-black/35">Step 2 of 2</p>
                                                <h2 className="mt-2 text-[22px] font-bold tracking-tight text-black">Security question</h2>
                                                <p className="mt-2 text-[13px] leading-relaxed text-black/45">
                                                    Pick one question and answer it carefully. Your answer is case sensitive.
                                                </p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="block text-[13px] font-medium text-gray-700 ml-1">Security Question</label>
                                                <div className="relative">
                                                    <select
                                                        value={walletPinForm.security_question}
                                                        onChange={(e) => handleWalletPinChange('security_question', e.target.value)}
                                                        className="block w-full rounded-2xl px-3.5 py-3 pr-11 text-base font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5 appearance-none cursor-pointer"
                                                    >
                                                        <option value="" disabled>Select a security question</option>
                                                        {SECURITY_QUESTIONS.map((question) => (
                                                            <option key={question} value={question}>{question}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="block text-[13px] font-medium text-gray-700 ml-1">Answer</label>
                                                <input
                                                    type="text"
                                                    value={walletPinForm.security_question_answer}
                                                    onChange={(e) => handleWalletPinChange('security_question_answer', e.target.value)}
                                                    className="block w-full rounded-2xl px-3.5 py-3 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                                                    placeholder="Case-sensitive answer"
                                                />
                                            </div>

                                            {walletSetupError && (
                                                <p className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
                                                    {walletSetupError}
                                                </p>
                                            )}

                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setWalletSetupError('');
                                                        setWalletSetupStep('pin');
                                                    }}
                                                    className="flex-1 rounded-full bg-black/5 px-5 py-3 text-sm font-semibold text-black hover:bg-black/10 transition-colors"
                                                >
                                                    Back
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="flex-1 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                                                >
                                                    Create wallet
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {walletSetupStep === 'creating' && (
                                        <motion.div
                                            key="wallet-creating"
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -12 }}
                                            className="min-h-[500px] flex flex-col items-center justify-center text-center"
                                        >
                                            <h2 className="text-[22px] font-bold tracking-tight text-black">Creating your wallet</h2>
                                            <AmptiveSpinner className="mt-5 h-12 w-12 text-black animate-pulse" />
                                        </motion.div>
                                    )}

                                    {walletSetupStep === 'result' && (
                                        <motion.div
                                            key="wallet-result"
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -12 }}
                                            className="min-h-[500px] flex flex-col items-center justify-center text-center"
                                        >
                                            {walletSetupSuccess ? (
                                                <img
                                                    src="/images/finance/wallet-success-illustration.svg"
                                                    alt=""
                                                    className="h-[150px] w-auto object-contain"
                                                />
                                            ) : (
                                                <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-red-50 text-red-600 border border-red-100">
                                                    <CircleSlash className="h-8 w-8" />
                                                </div>
                                            )}
                                            <h2 className="mt-6 text-[22px] font-bold tracking-tight text-black">
                                                {walletSetupSuccess ? 'Wallet created' : 'Wallet setup failed'}
                                            </h2>
                                            <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-relaxed text-black/45">
                                                {walletSetupSuccess
                                                    ? 'Your wallet is ready. You can now view balances and continue with payouts.'
                                                    : walletSetupError || 'We could not create your wallet. Please try again.'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (walletSetupSuccess) {
                                                        setIsWalletSetupOpen(false);
                                                        return;
                                                    }
                                                    setWalletSetupError('');
                                                    setWalletSetupStep('security');
                                                }}
                                                className="mt-8 inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                                            >
                                                {walletSetupSuccess ? 'Open Wallet' : 'Try Again'}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>

            {/* Withdrawal Drawer */}
            <AnimatePresence>
                {isWithdrawOpen && (
                    <div className="fixed inset-0 z-[180] flex justify-end overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsWithdrawOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
                            className="relative h-full w-full md:w-[420px] md:h-[95vh] bg-white flex flex-col overflow-y-auto no-scrollbar md:rounded-2xl md:mt-[2.5vh] md:mr-4 md:drop-shadow-[-10px_0_25px_rgba(0,0,0,0.15)] z-10"
                        >
                            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
                                <div>
                                    <p className="text-sm font-semibold text-black tracking-tighter">Withdraw Funds</p>
                                    {!withdrawalSuccess && (
                                        <p className="text-[11px] font-medium text-black/40 mt-0.5">
                                            {withdrawStep === 'amount' ? 'Step 1 of 2 · Amount' : 'Step 2 of 2 · Confirm'}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsWithdrawOpen(false)}
                                    className="p-2 hover:bg-black/5 rounded-full transition-colors group"
                                    title="Close"
                                >
                                    <X className="w-5 h-5 text-black/40 group-hover:text-black transition-colors" />
                                </button>
                            </div>

                            <div className="p-6 flex-1">
                                {withdrawalSuccess ? (
                                    <div className="min-h-[420px] flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
                                            <DollarSign className="w-8 h-8 text-emerald-600" />
                                        </div>
                                        <h3 className="text-[18px] font-semibold text-black tracking-tight">Withdrawal requested</h3>
                                        <p className="mt-2 text-[13px] leading-relaxed text-black/45 max-w-[300px]">
                                            Your withdrawal request has been submitted and is being processed. Funds typically arrive in your bank account within 2 business days.
                                        </p>
                                        <button
                                            onClick={() => setIsWithdrawOpen(false)}
                                            className="mt-7 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                                        >
                                            Done
                                        </button>
                                    </div>
                                ) : withdrawStep === 'amount' ? (
                                    <div className="space-y-6">
                                        <div className="rounded-2xl border border-black/5 bg-gray-50/70 p-5">
                                            <p className="text-[12px] font-medium text-black/40">Available to withdraw</p>
                                            <p className="mt-1 text-[32px] font-bold tracking-tight text-black">
                                                {showBalances ? formatCurrency(availableBalance) : '••••••••'}
                                            </p>
                                            {pendingBalance > 0 && (
                                                <p className="mt-1 text-[12px] font-medium text-black/40">
                                                    {formatCurrency(pendingBalance)} is already pending.
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[13px] font-medium text-gray-700 ml-1">Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-semibold text-black/35">₦</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={withdrawalAmount}
                                                    onChange={(e) => handleWithdrawalAmountChange(e.target.value)}
                                                    className="block w-full rounded-2xl pl-8 pr-3.5 py-3 text-base font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[13px] font-medium text-gray-700 ml-1">Payout account</p>
                                            {hasBankAccount ? (
                                                <div className="rounded-2xl border border-black/5 p-4 flex items-start gap-3">
                                                    <BankLogo bankCode={bankDetails.bankCode} bankName={bankDetails.bankName} />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[14px] font-semibold text-black truncate">{bankDetails.bankName}</p>
                                                        <p className="mt-1 text-[12px] font-medium text-black/45 truncate">
                                                            •••• {bankDetails.accountNumber.slice(-4)}
                                                            {bankDetails.accountHolder ? ` · ${bankDetails.accountHolder}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl border border-dashed border-black/10 p-5 text-center">
                                                    <p className="text-[14px] font-semibold text-black">No payout account</p>
                                                    <p className="mt-1 text-[12px] text-black/45">Add a bank account before requesting a withdrawal.</p>
                                                    <button
                                                        onClick={() => {
                                                            setIsWithdrawOpen(false);
                                                            setActiveTab('settings');
                                                            setActiveSettingsTab('payout-methods');
                                                            openBankEditor({ ...emptyBankDetails });
                                                        }}
                                                        className="mt-4 inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                                                    >
                                                        Add Account
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {withdrawalError && (
                                            <p className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
                                                {withdrawalError}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="rounded-2xl border border-black/5 bg-gray-50/70 p-5">
                                            <p className="text-[12px] font-medium text-black/40">You're withdrawing</p>
                                            <p className="mt-1 text-[32px] font-bold tracking-tight text-black">
                                                ₦{withdrawalAmount || '0'}
                                            </p>
                                            {hasBankAccount && (
                                                <p className="mt-1 text-[12px] font-medium text-black/40">
                                                    to {bankDetails.bankName} •••• {bankDetails.accountNumber.slice(-4)}
                                                </p>
                                            )}
                                        </div>

                                        <p className="text-[13px] leading-relaxed text-black/45">
                                            Confirm it's you to complete this withdrawal.
                                        </p>

                                        <div className="space-y-1.5">
                                            <label className="block text-[13px] font-medium text-gray-700 ml-1">Wallet PIN</label>
                                            <PinInput
                                                value={withdrawalPin}
                                                onChange={(v) => {
                                                    setWithdrawalError('');
                                                    setWithdrawalPin(v.slice(0, 4));
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[13px] font-medium text-gray-700 ml-1">Security Answer</label>
                                            <p className="ml-1 text-[12px] leading-relaxed text-black/40">{selectedWalletSecurityQuestion}</p>
                                            <input
                                                type="password"
                                                autoComplete="off"
                                                value={withdrawalSecurityAnswer}
                                                onChange={(e) => {
                                                    setWithdrawalError('');
                                                    setWithdrawalSecurityAnswer(e.target.value);
                                                }}
                                                className="block w-full rounded-2xl px-3.5 py-3 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                                                placeholder="Case-sensitive answer"
                                            />
                                        </div>

                                        {withdrawalError && (
                                            <p className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
                                                {withdrawalError}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {!withdrawalSuccess && (
                                <div className="px-6 py-5 border-t border-black/5 bg-gray-50/50 sticky bottom-0 flex items-center justify-end gap-3 mt-auto">
                                    {withdrawStep === 'amount' ? (
                                        <>
                                            <button
                                                onClick={() => setIsWithdrawOpen(false)}
                                                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black/60 hover:text-black hover:bg-black/5 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={continueWithdrawal}
                                                disabled={!hasBankAccount || availableBalance <= 0 || toNumber(withdrawalAmount.replace(/,/g, '')) <= 0}
                                                className="px-8 py-2.5 bg-black rounded-xl text-sm font-semibold text-white shadow-lg shadow-black/10 hover:bg-black/80 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-black/20 disabled:shadow-none"
                                            >
                                                Continue
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setWithdrawalError('');
                                                    setWithdrawStep('amount');
                                                }}
                                                disabled={isWithdrawing}
                                                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black/60 hover:text-black hover:bg-black/5 transition-colors disabled:opacity-50"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={submitWithdrawal}
                                                disabled={isWithdrawing || !hasBankAccount || availableBalance <= 0 || withdrawalPin.length !== 4 || !withdrawalSecurityAnswer}
                                                className="px-8 py-2.5 bg-black rounded-xl text-sm font-semibold text-white shadow-lg shadow-black/10 hover:bg-black/80 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-black/20 disabled:shadow-none"
                                            >
                                                {isWithdrawing ? 'Processing…' : 'Request Withdrawal'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                                        const filteredPurchases = activityItems.filter(item => {
                                            const query = historySearchQuery.toLowerCase();
                                            const buyerName = getBuyerName(item).toLowerCase();
                                            const buyerEmail = (item.buyer_email || item.customer_email || '').toLowerCase();
                                            const transId = (item.id || '').toLowerCase();
                                            const eventTitle = getEventTitle(item).toLowerCase();
                                            const ticketLabel = (item.ticket_label || '').toLowerCase();
                                            const bankName = (item.bankName || '').toLowerCase();

                                            const matchesSearch = buyerName.includes(query) || 
                                                                  buyerEmail.includes(query) || 
                                                                  transId.includes(query) ||
                                                                  eventTitle.includes(query) ||
                                                                  ticketLabel.includes(query) ||
                                                                  bankName.includes(query) ||
                                                                  (item.type === 'withdrawal' && 'withdrawal'.includes(query));

                                            if (!matchesSearch) return false;

                                            if (historyDateFilter === 'All') return true;

                                            const purchaseDate = new Date(getItemDate(item));
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
                                                const buyerName = getBuyerName(item);
                                                const amount = getOrderAmount(item);
                                                const eventTitle = getEventTitle(item);
                                                const isWithdrawal = item.type === 'withdrawal';
                                                
                                                const dateObj = new Date(getItemDate(item));
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
                                                                {isWithdrawal ? (
                                                                    <div className="w-11 h-11 flex items-center justify-center">
                                                                        <WithdrawalIcon />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-11 h-11 flex items-center justify-center">
                                                                        <PaidEventIcon />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-black text-[13.5px] leading-snug line-clamp-2">
                                                                    {isWithdrawal ? (
                                                                        <>
                                                                            <span className="font-bold">Withdrawal requested</span>
                                                                            <span className="text-black/40"> to </span>
                                                                            <span className="font-semibold text-black/80">{item.bankName}</span>
                                                                        </>
                                                                    ) : item.source === 'ticket_summary' ? (
                                                                        <>
                                                                            <span className="font-bold">{buyerName}</span>
                                                                            <span className="text-black/40"> sold for </span>
                                                                            <span className="font-semibold text-black/80">{eventTitle}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className="font-bold">{buyerName}</span>
                                                                            <span className="text-black/40"> purchased a ticket for </span>
                                                                            <span className="font-semibold text-black/80">{eventTitle}</span>
                                                                        </>
                                                                    )}
                                                                </p>
                                                                <div className="mt-1.5">
                                                                    <span className="text-[11px] font-medium text-black/30 uppercase tracking-tight">
                                                                        {isWithdrawal ? `Arrives ${formatArrivalTime(getItemDate(item))}` : timeStr}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="font-bold text-black text-[15px] tracking-tight">
                                                                    {isWithdrawal ? '-' : '+'}₦{amount.toLocaleString()}
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
                                            setAccountResolveError('');
                                            setTempBankDetails({ 
                                                ...tempBankDetails, 
                                                accountNumber: val,
                                                bankName: '',
                                                bankCode: '',
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
                                            onChange={(e) => {
                                                const selectedBank = banks.find(bank => bank.name === e.target.value);
                                                setAccountResolveError('');
                                                setTempBankDetails({
                                                    ...tempBankDetails,
                                                    bankName: e.target.value,
                                                    bankCode: selectedBank?.code || '',
                                                    accountHolder: ''
                                                });
                                            }}
                                            className="block w-full rounded-2xl px-3.5 py-3 text-base font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5 appearance-none cursor-pointer disabled:opacity-50"
                                            disabled={isLoadingBanks}
                                        >
                                            <option value="" disabled>{isLoadingBanks ? "Loading banks..." : "Select your bank"}</option>
                                            {banks.map(bank => (
                                                <option key={`${bank.code}-${bank.name}`} value={bank.name}>{bank.name}</option>
                                            ))}
                                        </select>
                                        {tempBankDetails.bankName && (
                                            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3">
                                                <BankLogo bankCode={tempBankDetails.bankCode} bankName={tempBankDetails.bankName} className="h-9 w-9 rounded-xl" />
                                                <div className="min-w-0">
                                                    <p className="truncate text-[13px] font-semibold text-black">{tempBankDetails.bankName}</p>
                                                    <p className="mt-0.5 text-[11px] font-medium text-black/40">Selected bank</p>
                                                </div>
                                            </div>
                                        )}
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
                                    {accountResolveError && (
                                        <p className="ml-1 text-[12px] font-medium leading-relaxed text-red-500">
                                            {accountResolveError}
                                        </p>
                                    )}
                                </div>
                                
                                {/* Info Tip */}
                                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/20">
                                    <p className="text-[11px] text-blue-600/70 font-medium leading-relaxed">
                                        Note: The account holder name is automatically retrieved from your bank's records to ensure accuracy.
                                    </p>
                                </div>

                                {bankSaveError && (
                                    <p className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
                                        {bankSaveError}
                                    </p>
                                )}
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
                                    onClick={saveBankDetails}
                                    disabled={isSavingBank || !tempBankDetails.bankName || tempBankDetails.accountNumber.length !== 10}
                                    className="px-8 py-2.5 bg-black rounded-xl text-sm font-semibold text-white shadow-lg shadow-black/10 hover:bg-black/80 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-black/20 disabled:shadow-none"
                                >
                                    {isSavingBank ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
