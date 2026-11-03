import { $payment } from "./services";
import { api } from "./client";

export async function verifyPaymentRef(reference: string, isGuest: boolean): Promise<any> {
    const data = await $payment.verify(reference, isGuest) as unknown as Promise<any>
    return data;
}

/**
 * What actually happened to a payment, according to the backend.
 *
 * `pending` is a real answer, not an error: bank transfers settle asynchronously,
 * so a reference can be genuinely unresolved for minutes after the supporter
 * returns to the page.
 */
export type PaymentOutcome = 'successful' | 'pending' | 'failed';

const SUCCESS_STATES = new Set(['successful', 'success', 'completed', 'paid']);
const FAILED_STATES = new Set(['expired', 'failed', 'cancelled', 'canceled', 'abandoned', 'reversed']);

/**
 * Resolve a payment reference to its real outcome.
 *
 * Deliberately reads `transaction.status` rather than the envelope's own `status`
 * flag: the envelope reports whether the *lookup* worked, and stays `true` for
 * references the gateway never collected.
 */
export async function resolvePaymentOutcome(reference: string): Promise<PaymentOutcome> {
  if (!reference) return 'pending';

  try {
    const result = await verifyPaymentRef(reference, !api.getToken());
    const status = String(result?.transaction?.status || '').toLowerCase();

    if (SUCCESS_STATES.has(status)) return 'successful';
    if (FAILED_STATES.has(status)) return 'failed';
    return 'pending';
  } catch {
    // A lookup that errored tells us nothing about the money, so never report failure.
    return 'pending';
  }
}
