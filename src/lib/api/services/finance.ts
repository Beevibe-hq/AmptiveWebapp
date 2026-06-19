import { api } from '../client';

const EVENTS_PREFIX = '/events';
const PAYMENTS_PREFIX = '/payments';

export interface PaymentBankAccountPayload {
  bank_code: string;
  account_number: string;
}

export const $finance = {
  getEventOwnerPurchases: () =>
    api.get<{ purchases: unknown[] }>(`${EVENTS_PREFIX}/me/purchases`),

  getBuyerProfiles: (userIds: string[]) =>
    api.post<{ profiles: Record<string, unknown>[] }>(`/users/batch`, { user_ids: userIds }),

  getBanks: () =>
    api.get<unknown>(`${PAYMENTS_PREFIX}/banks`),

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
};
