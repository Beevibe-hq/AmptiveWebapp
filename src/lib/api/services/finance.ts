import { api } from '../client';

const EVENTS_PREFIX = '/events';

export const $finance = {
  getEventOwnerPurchases: () =>
    api.get<{ purchases: unknown[] }>(`${EVENTS_PREFIX}/me/purchases`),

  getBuyerProfiles: (userIds: string[]) =>
    api.post<{ profiles: Record<string, unknown>[] }>(`/users/batch`, { user_ids: userIds }),
};
