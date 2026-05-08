# Ticket API Integration - Implementation Changes

## Part 1: `src/lib/api/services/index.ts`

### Changes to `$tickets` object (lines 188-206)

**Replace the entire `$tickets` block with:**

```ts
export const $tickets = {
  getById: (ticketId: string) =>
    api.get<unknown>(`${TICKETS_PREFIX}/${ticketId}`),

  getForEvent: (eventId: string) =>
    api.get<unknown>(`${TICKETS_PREFIX}/events/${eventId}/list`),

  create: (eventId: string, ticket: unknown) =>
    api.post<unknown>(`${TICKETS_PREFIX}/events/${eventId}/create`, ticket),

  update: (ticketId: string, ticket: unknown) =>
    api.patch<unknown>(`${TICKETS_PREFIX}/${ticketId}/update`, ticket),

  delete: (ticketId: string) =>
    api.delete<unknown>(`${TICKETS_PREFIX}/${ticketId}/deactivate`),

  bulkDelete: (ticketIds: string[]) =>
    api.post<unknown>(`${TICKETS_PREFIX}/bulk-delete`, { ids: ticketIds }),

  checkout: (eventId: string, data: unknown) =>
    api.post<unknown>(`${TICKETS_PREFIX}/events/${eventId}/checkout`, data),

  walletPay: (eventId: string, data: unknown) =>
    api.post<unknown>(`${TICKETS_PREFIX}/events/${eventId}/wallet-pay`, data),
};
```

**Changes made:**
- `create`: URL changed from `/tickets/event/` to `/tickets/events/` (singular → plural), param renamed `tickets` → `ticket`
- `update`: HTTP method changed from `PUT` to `PATCH`
- Added `checkout` and `walletPay` methods

---

## Part 2: `src/lib/api/tickets.ts`

### Replace entire file with:

```ts
import { $tickets } from './services';

export interface Ticket {
  id: string;
  event_id: string;
  label: string;
  price: number;
  currency: string;
  quantity_total: number | null;
  quantity_sold: number;
  quantity_remaining: number;
  reserved_quantity: number;
  is_active: boolean;
  benefits?: string[];
  color_theme?: string | null;
  is_physical?: boolean;
  created_at?: string;
}

export interface CheckoutItem {
  ticket_type_id: string;
  quantity: number;
}

export interface Attendee {
  ticket_type_id: string;
  name: string;
  email?: string;
  phone?: string;
  is_me?: boolean;
}

export interface CheckoutRequest {
  items: CheckoutItem[];
  attendees: Attendee[];
  wants_physical_delivery?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CheckoutResponse {
  purchase: {
    status: string;
    amount: number;
  };
  payment_url: string;
  access_code: string;
}

export async function getTicketsForEvent(eventId: string): Promise<Ticket[]> {
  return $tickets.getForEvent(eventId) as unknown as Promise<Ticket[]>;
}

export async function getTicket(ticketId: string): Promise<Ticket | null> {
  try {
    return await $tickets.getById(ticketId) as Ticket;
  } catch {
    return null;
  }
}

export async function createTicket(ticket: Omit<Ticket, 'id' | 'created_at' | 'quantity_sold' | 'quantity_remaining' | 'reserved_quantity' | 'is_active'>, eventId: string): Promise<Ticket> {
  return $tickets.create(eventId, ticket) as unknown as Promise<Ticket>;
}

export async function createTickets(eventId: string, tickets: Omit<Ticket, 'id' | 'created_at' | 'quantity_sold' | 'quantity_remaining' | 'reserved_quantity' | 'is_active'>[]): Promise<{ ok: boolean; error?: string }> {
  try {
    for (const ticket of tickets) {
      await $tickets.create(eventId, ticket);
    }
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateTicket(ticketId: string, ticket: Partial<Ticket>): Promise<{ ok: boolean; error?: string }> {
  try {
    await $tickets.update(ticketId, ticket);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteTicket(ticketId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await $tickets.delete(ticketId);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteTickets(ticketIds: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await $tickets.bulkDelete(ticketIds);
    return { ok: true, error: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function checkoutTicket(eventId: string, request: CheckoutRequest): Promise<CheckoutResponse> {
  return $tickets.checkout(eventId, request) as unknown as Promise<CheckoutResponse>;
}

export async function walletPayTicket(eventId: string, request: CheckoutRequest): Promise<CheckoutResponse> {
  return $tickets.walletPay(eventId, request) as unknown as Promise<CheckoutResponse>;
}
```

**Key changes:**
- Updated `Ticket` interface with new backend fields (`quantity_total`, `quantity_sold`, `quantity_remaining`, `reserved_quantity`, `is_active`)
- Added `CheckoutItem`, `Attendee`, `CheckoutRequest`, `CheckoutResponse` types
- `createTickets` now loops individually (no bulk POST)
- Added `checkoutTicket` and `walletPayTicket` functions

---

## Part 3: `src/pages/CreateEvent.tsx`

### Change 1: Update ticket submission (lines ~686-718)

**Find this block** (inside `handleSubmit`, after event creation):

```ts
// Insert or Update tickets
if (form.tickets.length > 0) {
  const newTickets = form.tickets.filter(t => t.id.startsWith('ticket-'));
  const existingTickets = form.tickets.filter(t => !t.id.startsWith('ticket-'));

  // Insert new tickets
  if (newTickets.length > 0 && eventId) {
    const ticketInserts = newTickets.map(ticket => ({
      event_id: eventId,
      label: ticket.title,
      price: ticket.price,
      currency: ticket.currency,
      quantity: ticket.quantity,
      benefits: ticket.benefits,
      color_theme: ticket.colorTheme,
      is_physical: false,
    }));

    await createTickets(eventId, ticketInserts);
  }

  // Update existing tickets
  if (existingTickets.length > 0) {
    for (const ticket of existingTickets) {
      await updateTicket(ticket.id, {
        label: ticket.title,
        price: ticket.price,
        currency: ticket.currency,
        quantity: ticket.quantity,
        benefits: ticket.benefits,
        color_theme: ticket.colorTheme,
      });
    }
  }
}
```

**Replace with:**

```ts
// Insert or Update tickets
if (form.tickets.length > 0 && eventId) {
  const newTickets = form.tickets.filter(t => t.id.startsWith('ticket-'));
  const existingTickets = form.tickets.filter(t => !t.id.startsWith('ticket-'));

  // Insert new tickets (one at a time - no bulk)
  if (newTickets.length > 0) {
    for (const ticket of newTickets) {
      const ticketPayload = {
        label: ticket.title,
        price: ticket.price,
        currency: ticket.currency,
        quantity_total: ticket.quantity ?? null,
        benefits: ticket.benefits,
        color_theme: ticket.colorTheme,
        is_physical: false,
      };

      await createTicket(ticketPayload, eventId);
    }
  }

  // Update existing tickets
  if (existingTickets.length > 0) {
    for (const ticket of existingTickets) {
      await updateTicket(ticket.id, {
        label: ticket.title,
        price: ticket.price,
        currency: ticket.currency,
        quantity_total: ticket.quantity ?? null,
        benefits: ticket.benefits,
        color_theme: ticket.colorTheme,
      });
    }
  }
}
```

**Key changes:**
- `event_id` removed from payload (it's in the URL path)
- `quantity` → `quantity_total`
- `undefined` quantity → `null` for unlimited
- `createTickets` replaced with loop of `createTicket`
- `updateTicket` also uses `quantity_total`

---

## Part 4: `src/pages/CheckoutPage.tsx`

### Change 1: Update imports (top of file)

**Find:**
```ts
import { createPurchase, getPurchasesByUser } from '@/lib/api/purchases';
```

**Replace with:**
```ts
import { checkoutTicket, walletPayTicket, getTicketsForEvent, getPurchasesByUser } from '@/lib/api';
```

Also add types import:
```ts
import type { CheckoutItem, Attendee, CheckoutRequest } from '@/lib/api/tickets';
```

### Change 2: Replace `handlePayment` function (lines ~158-257)

**Replace the entire `handlePayment` function with:**

```ts
const handlePayment = async () => {
  if (!currentUser) {
    navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    return;
  }
  if (!event) return;

  if (checkoutStep === 'selection') {
    const initialAttendees: Array<{ ticketId: string; name: string; email: string; phone?: string; isMe: boolean }> = [];
    Object.entries(selection).forEach(([ticketId, qty]) => {
      for (let i = 0; i < qty; i++) {
        const isFirst = initialAttendees.length === 0;
        initialAttendees.push({
          ticketId,
          name: isFirst ? (currentUser.user_metadata?.full_name || '') : '',
          email: isFirst ? (currentUser.email || '') : '',
          isMe: isFirst,
          phone: ''
        });
      }
    });
    setAttendees(initialAttendees);
    setCheckoutStep('attendees');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (checkoutStep === 'attendees') {
    const incomplete = attendees.some(a => !a.name.trim() || !a.email.trim());
    if (incomplete) {
      toastError("Please fill in all attendee names and emails.");
      return;
    }

    if (!currentUser.email) {
      toastError("Your account email is required for checkout. Please update your profile.");
      return;
    }

    setCheckoutStep('summary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Summary step - submit checkout
  setProcessing(true);
  try {
    const items: CheckoutItem[] = Object.entries(selection).map(([ticketId, qty]) => ({
      ticket_type_id: ticketId,
      quantity: qty,
    }));

    const attendeesList: Attendee[] = attendees.map(a => ({
      ticket_type_id: a.ticketId,
      name: a.name.trim(),
      email: a.email.trim() || undefined,
      phone: a.phone?.trim() || undefined,
      is_me: a.isMe,
    }));

    const request: CheckoutRequest = {
      items,
      attendees: attendeesList,
      wants_physical_delivery: wantsPhysicalDelivery,
      metadata: {
        physical_delivery_fee: wantsPhysicalDelivery ? PHYSICAL_DELIVERY_FEE : 0,
      },
    };

    const result = await checkoutTicket(event.id, request);

    if (result.purchase.status === 'successful' && result.amount === 0) {
      setSuccess(true);
      toastSuccess("Tickets secured!");
    } else if (result.payment_url) {
      window.location.href = result.payment_url;
    } else {
      throw new Error("No payment URL received");
    }

  } catch (error: any) {
    console.error('Checkout error:', error);
    toastError(error.message || 'Checkout failed');
  } finally {
    setProcessing(false);
  }
};
```

### Change 3: Add inventory display in ticket rows (around lines 707-795)

**In the ticket mapping, after the price display**, add inventory badge:

Find this area (inside the ticket `.map()`, around the price `<p>`):
```tsx
<p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-tight">
  {ticket.price === 0 ? 'Free' : formatPrice(ticket.price)}
</p>
```

**Add after it:**
```tsx
{(ticket as any).quantity_remaining !== undefined && (ticket as any).quantity_remaining <= 0 && (
  <span className="text-xs font-bold text-red-600 mt-1 block">Sold Out</span>
)}
{(ticket as any).quantity_remaining !== undefined && (ticket as any).quantity_remaining > 0 && (ticket as any).quantity_remaining <= 10 && (
  <span className="text-xs font-bold text-amber-600 mt-1 block">Only {(ticket as any).quantity_remaining} left</span>
)}
```

### Change 4: Disable +/- buttons when at inventory limit

**On the `+` button**, add disabled condition:
```tsx
<button
  onClick={(e) => { e.stopPropagation(); updateQuantity(ticket.id, 1); }}
  disabled={(ticket as any).quantity_remaining !== undefined && (selection[ticket.id] || 0) >= (ticket as any).quantity_remaining}
  className="h-10 w-10 flex items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 transition-all shadow-md active:scale-95 font-sans disabled:opacity-30 disabled:cursor-not-allowed"
>
```

### Change 5: Disable checkout button when no valid selections

**On the main checkout/pay button**, add condition that checks for available inventory.

---

## Part 5: `src/components/CheckoutModal.tsx`

### Change 1: Update imports

**Replace:**
```ts
import { createPurchase } from '@/lib/api/purchases';
```

**With:**
```ts
import { checkoutTicket } from '@/lib/api/tickets';
import type { CheckoutItem, Attendee, CheckoutRequest } from '@/lib/api/tickets';
```

### Change 2: Replace `handleSimulatedPayment` (lines ~75-136)

**Replace the entire function with:**

```ts
const handleCheckout = async () => {
  if (!currentUser) {
    setError("You must be logged in to purchase tickets.");
    return;
  }

  if (!currentUser.email) {
    setError("Your account email is required for checkout.");
    return;
  }

  setStep('processing');
  setError(null);

  try {
    const items: CheckoutItem[] = Object.entries(selection).map(([ticketId, qty]) => ({
      ticket_type_id: ticketId,
      quantity: qty,
    }));

    const attendeesList: Attendee[] = [];
    Object.entries(selection).forEach(([ticketId, qty]) => {
      for (let i = 0; i < qty; i++) {
        attendeesList.push({
          ticket_type_id: ticketId,
          name: currentUser.name || '',
          email: currentUser.email || '',
          is_me: true,
        });
      }
    });

    const request: CheckoutRequest = {
      items,
      attendees: attendeesList,
      wants_physical_delivery: false,
      metadata: {},
    };

    const result = await checkoutTicket(event.id, request);

    if (result.purchase.status === 'successful' && result.amount === 0) {
      setStep('success');
    } else if (result.payment_url) {
      window.location.href = result.payment_url;
    } else {
      throw new Error("No payment URL received");
    }

  } catch (err: any) {
    console.error('Checkout failed:', err);
    setError(err.message || "Checkout failed. Please try again.");
    setStep('selection');
  }
};
```

**Then update the button onClick** (line ~278):
```tsx
onClick={handleCheckout}
```

---

## Summary of All Changes

| File | Lines Affected | Type |
|---|---|---|
| `services/index.ts` | 188-206 | Replace `$tickets` block |
| `tickets.ts` | Entire file | Replace all |
| `CreateEvent.tsx` | ~686-718 | Replace ticket submission |
| `CheckoutPage.tsx` | Imports, `handlePayment`, ticket UI | Multiple edits |
| `CheckoutModal.tsx` | Imports, `handleSimulatedPayment` | Multiple edits |
