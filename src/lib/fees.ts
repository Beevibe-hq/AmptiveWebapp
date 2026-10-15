/*
 * Amptive's platform fees.
 *
 * The backend charges these; the website only shows them. Keep the numbers here in step with
 * the backend, or users will see one amount and be charged another.
 */

/** Naira charged per paid ticket, paid by the buyer on top of the ticket price. Free tickets carry no fee. */
export const TICKET_SERVICE_FEE = 100;

/** Smallest withdrawal the backend accepts, in naira. */
export const MIN_WITHDRAWAL_AMOUNT = 10000;

/** Share of every wallet withdrawal (ticket sales and tips alike) kept by Amptive. */
export const WITHDRAWAL_FEE_RATE = 0.05;

/** "5%", for copy. */
export const WITHDRAWAL_FEE_LABEL = `${Math.round(WITHDRAWAL_FEE_RATE * 100)}%`;

/** Service fee for a basket holding `paidTicketCount` paid tickets. */
export function ticketServiceFee(paidTicketCount: number): number {
  return Math.max(0, paidTicketCount) * TICKET_SERVICE_FEE;
}

/** Fee on a withdrawal of `amount`, rounded to the kobo. */
export function withdrawalFee(amount: number): number {
  return Math.round(Math.max(0, amount) * WITHDRAWAL_FEE_RATE * 100) / 100;
}
