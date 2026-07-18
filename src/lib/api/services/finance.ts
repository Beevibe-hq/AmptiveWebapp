import { api } from '../client';

const PAYMENTS_PREFIX = '/payments';

export interface PaymentBankAccountPayload {
  bank_code: string;
  account_number: string;
}

export const $finance = {
  getBanks: () =>
    api.get<unknown>(`${PAYMENTS_PREFIX}/banks`),

  getWalletBalance: () =>
    api.get<unknown>(`${PAYMENTS_PREFIX}/wallet/balance`),

  getTransactions: (params?: { cursor?: string; page_size?: number }) => {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.page_size) query.set('page_size', String(params.page_size));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return api.get<unknown>(`${PAYMENTS_PREFIX}/transactions${suffix}`);
  },

  resolveBankAccount: (payload: { bank_code: string; account_number: string }) =>
    api.post<unknown>(`${PAYMENTS_PREFIX}/bank-accounts/resolve`, payload),

  getBankAccounts: () =>
    api.get<unknown>(`${PAYMENTS_PREFIX}/bank-accounts`),

  createBankAccount: (payload: PaymentBankAccountPayload) =>
    api.post<unknown>(`${PAYMENTS_PREFIX}/bank-accounts`, payload),

  getBankAccount: (bankAccountId: string) =>
    api.get<unknown>(`${PAYMENTS_PREFIX}/bank-accounts/${bankAccountId}`),

  deleteBankAccount: (bankAccountId: string) =>
    api.delete<unknown>(`${PAYMENTS_PREFIX}/bank-accounts/${bankAccountId}`),

  setDefaultBankAccount: (bankAccountId: string) =>
    api.patch<unknown>(`${PAYMENTS_PREFIX}/bank-accounts/${bankAccountId}/default`, {}),

  withdraw: (payload: { amount: number; bank_account_id?: string }) =>
    api.post<unknown>(`${PAYMENTS_PREFIX}/withdraw`, payload),
};
