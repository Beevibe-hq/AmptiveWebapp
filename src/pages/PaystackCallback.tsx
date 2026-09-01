import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toastError, toastSuccess } from '@/lib/ui/toast';
import { getCurrentUser } from '@/lib/api/auth';
import { verifyPaymentRef } from '@/lib/api/payment';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';

export default function PaystackCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your payment...');

    useEffect(() => {
        const verifyPayment = async () => {
            const reference = searchParams.get('reference') || searchParams.get('trxref') || searchParams.get('tx_ref');

            if (!reference) {
                setStatus('error');
                setMessage('No payment reference found.');
                return;
            }

            // Check if this payment was for Creator Support / Gifting
            try {
                const pendingSupportRaw = sessionStorage.getItem('pending_support_data');
                if (pendingSupportRaw) {
                    const parsed = JSON.parse(pendingSupportRaw);
                    const targetUser = parsed.username || '';
                    if (targetUser) {
                        navigate(`/support/${encodeURIComponent(targetUser)}?reference=${encodeURIComponent(reference)}&status=successful`, { replace: true });
                        return;
                    }
                }
            } catch {}

            try {
                const user = await getCurrentUser()
                const isGuest = !user;                

                const verificationResult = await verifyPaymentRef(reference, isGuest);

                if (verificationResult && verificationResult.status) {
                    setStatus('success');
                    setMessage('Payment successful! Your tickets have been secured.');
                    toastSuccess('Payment successful!');

                    setTimeout(() => {
                        if (isGuest) {
                            navigate('/purchase/confirmed', { replace: true });
                        } else {
                            navigate('/my-tickets', { replace: true });
                        }
                    }, 2000);
                } else {
                    setStatus('error');
                    setMessage(verificationResult?.message || 'Payment verification failed.');
                    toastError(verificationResult?.message || 'Payment verification failed.');
                }
            } catch (error: any) {
                setStatus('error');
                setMessage(error.message || 'Failed to verify payment.');
                toastError(error.message || 'Failed to verify payment.');
            }
        };

        verifyPayment();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="space-y-4 max-w-md">
                {status === 'verifying' && (
                    <>
                        <AmptiveSpinner className="mx-auto text-black" />
                        <h2 className="text-2xl font-bold text-gray-900">Verifying Payment</h2>
                        <p className="text-gray-500">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
                        <p className="text-gray-500">{message}</p>
                        <p className="text-sm text-gray-400">Redirecting...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <XCircle className="h-10 w-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Payment Failed</h2>
                        <p className="text-gray-500">{message}</p>
                        <button
                            onClick={() => navigate('/', { replace: true })}
                            className="mt-4 px-6 py-3 rounded-full bg-black text-white font-medium hover:bg-gray-800 transition-colors"
                        >
                            Go Home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
