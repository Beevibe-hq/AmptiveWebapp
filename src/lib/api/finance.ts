import { $finance } from './services/finance';

export interface PurchaseRecord {
  id: string;
  buyer_id: string;
  ticket_id: string;
  event_id: string;
  status: string;
  total_amount?: number;
  created_at: string;
  buyer_name?: string;
  buyer_email?: string;
  ticket_label?: string;
  ticket_price?: number;
  color_theme?: string;
  [key: string]: unknown;
}

export interface BuyerProfile {
  user_id: string;
  avatar_url?: string;
  full_name?: string;
  email?: string;
  [key: string]: unknown;
}

export interface PaymentBank {
  name: string;
  code: string;
  [key: string]: unknown;
}

export interface PaymentBankAccount {
  id: string;
  bank_account_id?: string;
  bank_name: string;
  bank_code?: string;
  account_number: string;
  account_name?: string;
  is_default?: boolean;
  [key: string]: unknown;
}

const parseMaybeJsonString = (response: unknown) => {
  if (typeof response !== 'string') return response;
  try {
    return JSON.parse(response);
  } catch {
    return response;
  }
};

const asArray = (response: unknown, keys: string[]) => {
  response = parseMaybeJsonString(response);
  if (Array.isArray(response)) return response;
  const root = response as Record<string, any> | null;
  if (!root || typeof root !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key];
    if (Array.isArray(root.data?.[key])) return root.data[key];
    if (Array.isArray(root[key]?.data)) return root[key].data;
    if (Array.isArray(root[key]?.items)) return root[key].items;
    if (Array.isArray(root.data?.[key]?.data)) return root.data[key].data;
    if (Array.isArray(root.data?.[key]?.items)) return root.data[key].items;
  }
  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(root.results)) return root.results;
  if (Array.isArray(root.data?.items)) return root.data.items;
  if (Array.isArray(root.data?.results)) return root.data.results;
  return [];
};

const unwrapObject = (response: unknown, keys: string[]) => {
  response = parseMaybeJsonString(response);
  const root = response as Record<string, any> | null;
  if (!root || typeof root !== 'object') return null;
  for (const key of keys) {
    if (root[key] && typeof root[key] === 'object') return root[key];
    if (root.data?.[key] && typeof root.data[key] === 'object') return root.data[key];
  }
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) return root.data;
  return root;
};

export async function getEventOwnerPurchases(): Promise<PurchaseRecord[]> {
  try {
    const response = await $finance.getEventOwnerPurchases();
    if (Array.isArray(response)) return response as PurchaseRecord[];
    return ((response as any)?.purchases || (response as any)?.data?.purchases || (response as any)?.data || []) as PurchaseRecord[];
  } catch {
    return [];
  }
}

export async function getBuyerProfiles(userIds: string[]): Promise<BuyerProfile[]> {
  if (userIds.length === 0) return [];
  try {
    const response = await $finance.getBuyerProfiles(userIds);
    return (response.profiles || []) as BuyerProfile[];
  } catch {
    return [];
  }
}

export async function getPaymentBanks(): Promise<PaymentBank[]> {
  try {
    const response = await $finance.getBanks();
    return asArray(response, ['banks']).map((bank: any) => ({
      ...bank,
      name: bank.name || bank.bank_name || '',
      code: bank.code || bank.bank_code || '',
    })).filter((bank: PaymentBank) => (
      bank.name &&
      bank.code &&
      bank.active !== false &&
      (!bank.currency || bank.currency === 'NGN')
    ));
  } catch {
    return [];
  }
}

export async function resolvePaymentBankAccount(payload: { bank_code: string; account_number: string }): Promise<{ account_name?: string; account_number?: string } | null> {
  try {
    const response = await $finance.resolveBankAccount(payload);
    if (typeof response === 'string') {
      const parsed = parseMaybeJsonString(response);
      if (typeof parsed === 'string') {
        return {
          account_name: parsed,
          account_number: payload.account_number,
        };
      }
    }
    const resolved = unwrapObject(response, ['account', 'bank_account', 'recipient']);
    if (!resolved) return null;
    return {
      ...resolved,
      account_name: resolved.account_name || resolved.accountHolder || resolved.account_holder || resolved.name,
      account_number: resolved.account_number || payload.account_number,
    };
  } catch {
    return null;
  }
}

export async function getPaymentBankAccounts(): Promise<PaymentBankAccount[]> {
  try {
    const response = await $finance.getBankAccounts();
    return asArray(response, ['bank_accounts', 'accounts']).map((account: any) => ({
      ...account,
      id: account.id || account.bank_account_id || account.account_id || account._id,
      bank_account_id: account.bank_account_id || account.id || account.account_id || account._id,
      bank_name: account.bank_name || account.bankName || account.bank?.name || account.bank?.bank_name || '',
      bank_code: account.bank_code || account.bankCode || account.bank?.code || account.bank?.bank_code || '',
      account_number: account.account_number || account.accountNumber || account.masked_account_number || account.number || '',
      account_name: account.account_name || account.accountName || account.account_holder || account.accountHolder || account.name || '',
      is_default: Boolean(account.is_default ?? account.default),
    })).filter((account: PaymentBankAccount) => account.id && account.bank_name && account.account_number);
  } catch {
    return [];
  }
}

export async function createPaymentBankAccount(payload: {
  bank_code: string;
  bank_name?: string;
  account_number: string;
  account_name?: string;
}): Promise<PaymentBankAccount | null> {
  try {
    const response = await $finance.createBankAccount({
      bank_code: payload.bank_code,
      account_number: payload.account_number,
    });
    if (typeof response === 'string') {
      return {
        id: '',
        bank_account_id: '',
        bank_name: payload.bank_name || '',
        bank_code: payload.bank_code,
        account_number: payload.account_number,
        account_name: payload.account_name || '',
        is_default: true,
      };
    }
    const account = unwrapObject(response, ['bank_account', 'account']);
    if (!account) return null;
    return {
      ...account,
      id: account.id || account.bank_account_id || account.account_id || account._id,
      bank_account_id: account.bank_account_id || account.id || account.account_id || account._id,
      bank_name: account.bank_name || account.bankName || account.bank?.name || payload.bank_name || '',
      bank_code: account.bank_code || account.bankCode || account.bank?.code || payload.bank_code,
      account_number: account.account_number || account.accountNumber || account.number || payload.account_number,
      account_name: account.account_name || account.accountName || account.account_holder || account.name || payload.account_name || '',
      is_default: Boolean(account.is_default ?? account.default),
    };
  } catch (error) {
    throw error;
  }
}

export async function setDefaultPaymentBankAccount(bankAccountId: string): Promise<boolean> {
  try {
    await $finance.setDefaultBankAccount(bankAccountId);
    return true;
  } catch {
    return false;
  }
}

export async function deletePaymentBankAccount(bankAccountId: string): Promise<boolean> {
  await $finance.deleteBankAccount(bankAccountId);
  return true;
}
