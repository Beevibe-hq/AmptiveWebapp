import { api, API_BASE } from '@/lib/api/client';

export function createClient() {
  return supabaseCompat;
}

const supabaseCompat = {
  auth: {
    getSession: async () => {
      const token = localStorage.getItem('amptive.auth_token');
      if (!token) return { data: { session: null }, error: null };
      try {
        const user = await api.get('/auth/me');
        return {
          data: {
            session: { user, access_token: token, expires_at: Date.now() + 3600000 }
          },
          error: null
        };
      } catch {
        return { data: { session: null }, error: null };
      }
    },
    getUser: async () => {
      try {
        const user = await api.get('/auth/me');
        return { data: { user }, error: null };
      } catch (e) {
        return { data: { user: null }, error: e };
      }
    },
    refreshSession: async () => {
      try {
        const response = await api.post('/auth/refresh');
        return { data: response.session ? { session: response.session } : { session: null }, error: null };
      } catch (e) {
        return { data: { session: null }, error: e };
      }
    },
    signOut: async () => {
      try { await api.post('/auth/logout'); } 
      finally { api.clearToken(); }
      return { error: null };
    },
    onAuthStateChange: () => ({ data: { unsubscribe: () => {} } }),
  },
  storage: {
    from: (bucket: string) => ({
      list: async () => ({ data: [], error: null }),
      upload: async (path: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_BASE}/storage/${bucket}/${path}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${api.getToken()}` },
          body: formData,
        });
        return { error: response.ok ? null : new Error('Upload failed'), data: { path } };
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: `${API_BASE}/storage/${bucket}/${path}` } }),
    }),
  },
  from: (table: string) => queryBuilder(table),
};

function queryBuilder(table: string) {
  const filters: Record<string, string> = {};
  let selectCols = '*';

  return {
    select(columns?: string) {
      if (columns) selectCols = columns;
      return {
        eq(field: string, value: string) {
          filters[field] = value;
          return {
            single: async () => {
              try {
                if (table === 'events') {
                  const data = await api.get(`/events/${value}`);
                  return { data: { ...data, event_tickets: [] }, error: null };
                } else if (table === 'event_tickets') {
                  const data = await api.get(`/event-tickets?eventId=${value}`);
                  return { data, error: null };
                } else if (table === 'profiles') {
                  const data = await api.get(`/profiles/${value}`);
                  return { data, error: null };
                }
                return { data: null, error: null };
              } catch (e) {
                return { data: null, error: e };
              }
            },
            limit: async (n: number) => {
              try {
                const data = await api.get(`/${table}?limit=${n}`);
                return { data, error: null };
              } catch (e) {
                return { data: [], error: null };
              }
            },
          };
        },
        neq(field: string, value: string) {
          filters[field + '_ne'] = value;
          return { limit: async (n: number) => ({ data: [], error: null }) };
        },
      };
    },
    insert: async (rows: unknown[]) => {
      try {
        if (table === 'events') {
          return { data: await api.post('/events', rows), error: null };
        } else if (table === 'event_tickets') {
          return { data: await api.post('/event-tickets', rows), error: null };
        }
        return { data: null, error: null };
      } catch (e) {
        return { data: null, error: e };
      }
    },
    update(data: unknown) {
      return {
        eq: async (field: string, value: string) => {
          try {
            if (table === 'events') {
              return { data: await api.put(`/events/${value}`, data), error: null };
            } else if (table === 'event_tickets') {
              return { data: await api.put(`/event-tickets/${value}`, data), error: null };
            }
            return { data: null, error: null };
          } catch (e) {
            return { data: null, error: e };
          }
        },
      };
    },
    delete() {
      return { in: async () => ({ error: null }) };
    },
  };
}