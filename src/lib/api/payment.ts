import { $payment } from "./services";

export async function verifyPaymentRef(reference: string, isGuest: boolean): Promise<any> {
    const data = await $payment.verify(reference, isGuest) as unknown as Promise<any>    
    return data;
}
