import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, Search, Ticket, UserCheck, XCircle } from 'lucide-react';
import { getEventsByUser, getEventOrders, StandaloneEvent } from '@/lib/api/events';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';

type CheckInTicket = {
    id: string;
    code: string;
    qr: string;
    status: string;
    eventId: string;
    eventTitle: string;
    attendeeName: string;
    attendeeEmail: string;
    ticketLabel: string;
    orderId: string;
};

type ScanResult = {
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    ticket?: CheckInTicket;
};

const CHECK_IN_STORAGE_KEY = 'amptive.dashboard.checkins';

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const getNested = (source: any, path: string) => {
    return path.split('.').reduce((value, key) => value?.[key], source);
};

const firstValue = (...values: unknown[]) => {
    const value = values.find(item => String(item || '').trim());
    return value == null ? '' : String(value);
};

const collectTicketValues = (ticket: CheckInTicket) => {
    return [ticket.id, ticket.code, ticket.qr, ticket.orderId]
        .flatMap(value => extractScanTokens(value))
        .map(normalize)
        .filter(Boolean);
};

const extractScanTokens = (value: unknown) => {
    const raw = String(value || '').trim();
    if (!raw) return [];

    const tokens = new Set<string>([raw]);

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            [
                'id',
                'ticket_id',
                'ticketId',
                'ticket_code',
                'ticketCode',
                'code',
                'qr_code_data',
                'qrCodeData',
                'purchase_id',
                'purchaseId',
                'order_id',
                'orderId',
                'access_code',
                'accessCode',
            ].forEach(key => {
                const parsedValue = (parsed as Record<string, unknown>)[key];
                if (parsedValue) tokens.add(String(parsedValue));
            });
        }
    } catch {
        // Plain ticket codes are expected, so non-JSON QR values are fine.
    }

    try {
        const url = new URL(raw);
        url.searchParams.forEach(value => {
            if (value) tokens.add(value);
        });

        url.pathname.split('/').forEach(part => {
            if (part) tokens.add(part);
        });
    } catch {
        raw.split(/[?&/#:=,\s]+/).forEach(part => {
            if (part) tokens.add(part);
        });
    }

    return Array.from(tokens);
};

const getTicketStatus = (ticket: CheckInTicket) => {
    const raw = normalize(ticket.status);
    if (raw === 'used' || raw === 'scanned' || raw === 'attended') return 'checked-in';
    if (raw === 'cancelled' || raw === 'refunded') return raw;
    return 'valid';
};

const flattenOrders = (orders: any[], fallbackEvent?: StandaloneEvent): CheckInTicket[] => {
    return orders.flatMap((order) => {
        const eventTitle = order.event_title || order.events?.title || fallbackEvent?.title || 'Untitled event';
        const eventId = order.event_id || fallbackEvent?.event_id || '';
        const buyerName = order.buyer_name || order.profiles?.display_name || order.attendee_name || 'Guest';
        const buyerEmail = order.buyer_email || order.profiles?.email || order.attendee_email || '';
        const orderTickets = Array.isArray(order.tickets) && order.tickets.length > 0 ? order.tickets : [order];

        return orderTickets.map((ticket: any, index: number) => {
            const id = firstValue(
                ticket.id,
                ticket.ticket_id,
                ticket.ticketId,
                ticket.event_ticket_id,
                ticket.purchase_ticket_id,
                order.ticket_id,
                order.ticketId,
                order.id,
            );
            const code = firstValue(
                ticket.ticket_code,
                ticket.ticketCode,
                ticket.code,
                ticket.access_code,
                ticket.accessCode,
                order.ticket_code,
                order.ticketCode,
                order.code,
                order.access_code,
                order.accessCode,
                id,
            );
            const qr = firstValue(
                ticket.qr_code_data,
                ticket.qrCodeData,
                ticket.qr,
                ticket.qr_code,
                ticket.qrCode,
                order.qr_code_data,
                order.qrCodeData,
                order.qr,
                order.qr_code,
                order.qrCode,
                code,
                id,
            );
            const orderId = firstValue(
                order.id,
                order.purchase_id,
                order.purchaseId,
                order.order_id,
                order.orderId,
                ticket.purchase_id,
                ticket.purchaseId,
                ticket.order_id,
                ticket.orderId,
            );

            return {
                id,
                code,
                qr,
                status: ticket.ticket_status || ticket.status || order.ticket_status || order.status || 'valid',
                eventId,
                eventTitle,
                attendeeName: ticket.attendee_name || order.attendee_name || buyerName,
                attendeeEmail: ticket.attendee_email || order.attendee_email || buyerEmail,
                ticketLabel: getNested(ticket, 'event_tickets.label') || ticket.ticket_label || order.ticket_label || `Ticket ${index + 1}`,
                orderId,
            };
        });
    }).filter((ticket) => ticket.id || ticket.code || ticket.qr);
};

export default function DashboardCheckIn() {
    const [events, setEvents] = useState<StandaloneEvent[]>([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [tickets, setTickets] = useState<CheckInTicket[]>([]);
    const [checkedIn, setCheckedIn] = useState<Record<string, string>>({});
    const [manualCode, setManualCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<any>(null);
    const scanIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(CHECK_IN_STORAGE_KEY);
        if (stored) {
            setCheckedIn(JSON.parse(stored));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(CHECK_IN_STORAGE_KEY, JSON.stringify(checkedIn));
    }, [checkedIn]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await getEventsByUser();
                setEvents(data || []);
            } catch {
                setEvents([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!selectedEventId) {
                setTickets([]);
                return;
            }

            setOrdersLoading(true);
            try {
                const selectedEvent = events.find(event => event.event_id === selectedEventId);
                const orders = await getEventOrders(selectedEventId);
                setTickets(flattenOrders(orders, selectedEvent));
            } catch {
                setTickets([]);
            } finally {
                setOrdersLoading(false);
            }
        };

        fetchOrders();
    }, [selectedEventId, events]);

    useEffect(() => {
        return () => stopCamera();
    }, []);

    const selectedEvent = events.find(event => event.event_id === selectedEventId);
    const checkedInCount = tickets.filter(ticket => checkedIn[ticket.id] || getTicketStatus(ticket) === 'checked-in').length;
    const validCount = tickets.filter(ticket => getTicketStatus(ticket) === 'valid').length;

    const recentTickets = useMemo(() => {
        return tickets
            .filter(ticket => checkedIn[ticket.id])
            .sort((a, b) => new Date(checkedIn[b.id]).getTime() - new Date(checkedIn[a.id]).getTime())
            .slice(0, 6);
    }, [tickets, checkedIn]);

    const findTicket = (code: string) => {
        const queries = extractScanTokens(code).map(normalize).filter(Boolean);
        if (queries.length === 0) return null;

        return tickets.find(ticket => {
            const values = collectTicketValues(ticket);
            return values.some(value => queries.some(query => value === query || value.includes(query) || query.includes(value)));
        }) || null;
    };

    const checkInCode = (code: string) => {
        const ticket = findTicket(code);

        if (!ticket) {
            setResult({
                type: 'error',
                title: 'Ticket not found',
                message: 'This QR code or ticket ID does not match this event.',
            });
            return;
        }

        const status = getTicketStatus(ticket);
        if (status === 'cancelled' || status === 'refunded') {
            setResult({
                type: 'error',
                title: 'Ticket not valid',
                message: `This ticket is ${status} and should not be admitted.`,
                ticket,
            });
            return;
        }

        if (checkedIn[ticket.id] || status === 'checked-in') {
            setResult({
                type: 'warning',
                title: 'Already checked in',
                message: `${ticket.attendeeName || 'This attendee'} was already checked in.`,
                ticket,
            });
            return;
        }

        const timestamp = new Date().toISOString();
        setCheckedIn(prev => ({ ...prev, [ticket.id]: timestamp }));
        setResult({
            type: 'success',
            title: 'Check-in approved',
            message: `${ticket.attendeeName || 'Attendee'} can enter.`,
            ticket,
        });
    };

    const handleManualSubmit = (event: FormEvent) => {
        event.preventDefault();
        checkInCode(manualCode);
        setManualCode('');
    };

    const stopCamera = () => {
        if (scanIntervalRef.current) {
            window.clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setCameraActive(false);
    };

    const startCamera = async () => {
        setCameraError('');
        const BarcodeDetector = (window as any).BarcodeDetector;
        if (!BarcodeDetector) {
            setCameraError('Camera scanning is not supported in this browser. Enter the ticket ID manually.');
            return;
        }

        try {
            detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setCameraActive(true);

            scanIntervalRef.current = window.setInterval(async () => {
                if (!videoRef.current || !detectorRef.current) return;
                const codes = await detectorRef.current.detect(videoRef.current).catch(() => []);
                const first = codes?.[0]?.rawValue;
                if (first) {
                    checkInCode(first);
                    stopCamera();
                }
            }, 700);
        } catch {
            setCameraError('Unable to open the camera. Check browser permissions or enter the ticket ID manually.');
            stopCamera();
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-full items-center justify-center">
                <AmptiveSpinner className="h-8 w-8 text-black" />
            </div>
        );
    }

    if (!selectedEventId) {
        return (
            <div className="w-full px-4 py-8 md:px-10">
                <header className="mb-10">
                    <h1 className="mb-1 text-[34px] font-semibold leading-tight text-black">Check-in</h1>
                    <p className="hidden text-[15px] font-medium text-black/40 sm:block">Choose the event you want to check guests into.</p>
                </header>

                {events.length === 0 ? (
                    <div className="max-w-xl border-y border-dashed border-black/10 py-14 text-center">
                        <p className="text-[17px] font-semibold text-black">No events found</p>
                        <p className="mt-2 text-sm font-medium text-black/40">Create or publish an event before using check-in.</p>
                    </div>
                ) : (
                    <div className="max-w-3xl divide-y divide-black/5 border-y border-black/5">
                        {events.map(event => (
                            <button
                                key={event.event_id}
                                type="button"
                                onClick={() => setSelectedEventId(event.event_id)}
                                className="group flex w-full items-center justify-between gap-5 py-5 text-left transition-colors hover:bg-black/[0.02]"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-black/[0.04]">
                                        {event.thumbnail_url ? (
                                            <img
                                                src={event.thumbnail_url}
                                                alt={event.title}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <Ticket className="h-4 w-4 text-black/20" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-[17px] font-semibold text-black">{event.title}</p>
                                        <p className="mt-1 text-sm font-medium text-black/40">
                                            {event.scheduled_for
                                                ? new Date(event.scheduled_for).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                                : 'Date not set'}
                                        </p>
                                    </div>
                                </div>
                                <span className="shrink-0 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-black transition-colors group-hover:bg-black group-hover:text-white">
                                    Start
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full px-4 py-8 md:px-10">
            <div className="max-w-6xl">
                <header className="mb-8 flex w-full flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="mb-1 text-[34px] font-semibold leading-tight text-black">Check-in</h1>
                        <p className="hidden text-[15px] font-medium text-black/40 sm:block">Validate tickets at the entrance with a QR scan or ticket ID.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            stopCamera();
                            setSelectedEventId('');
                            setTickets([]);
                            setManualCode('');
                            setResult(null);
                        }}
                        className="h-11 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-black/5"
                    >
                        Change event
                    </button>
                </header>

                <section className="mb-10 flex flex-col gap-5 border-y border-black/5 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-black/[0.04]">
                            {selectedEvent?.thumbnail_url ? (
                                <img src={selectedEvent.thumbnail_url} alt={selectedEvent.title} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Ticket className="h-5 w-5 text-black/20" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-[18px] font-semibold text-black">{selectedEvent?.title || 'Selected event'}</p>
                            <p className="mt-1 text-sm font-medium text-black/40">
                                {selectedEvent?.scheduled_for
                                    ? new Date(selectedEvent.scheduled_for).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                    : 'Date not set'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
                        {[
                            ['Tickets', tickets.length],
                            ['Checked in', checkedInCount],
                            ['Waiting', Math.max(validCount - checkedInCount, 0)],
                        ].map(([label, value]) => (
                            <div key={label} className="min-w-[74px]">
                                <p className="text-[12px] font-medium text-black/40">{label}</p>
                                <p className="mt-1 text-[24px] font-semibold leading-none text-black">{value}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <main className="min-w-0">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h2 className="text-[21px] font-semibold text-black">Scan ticket</h2>
                                <p className="mt-1 text-sm font-medium text-black/40">Point the camera at the QR code or enter the ticket code.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {ordersLoading && (
                                    <span className="inline-flex items-center gap-2 text-sm font-medium text-black/40">
                                        <AmptiveSpinner className="h-4 w-4 text-black" />
                                        Loading tickets
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={cameraActive ? stopCamera : startCamera}
                                    className="h-10 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-black/5"
                                >
                                    {cameraActive ? 'Stop camera' : 'Open camera'}
                                </button>
                            </div>
                        </div>

                        <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[32px] bg-[#111]">
                            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                            {!cameraActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
                                    <Camera className="mb-3 h-9 w-9" />
                                    <p className="text-sm font-semibold">Camera scanner</p>
                                </div>
                            )}
                            <div className="pointer-events-none absolute inset-8 rounded-[24px] border border-white/10" />
                            <span className="pointer-events-none absolute left-8 top-8 h-8 w-8 rounded-tl-[18px] border-l-2 border-t-2 border-white/45" />
                            <span className="pointer-events-none absolute right-8 top-8 h-8 w-8 rounded-tr-[18px] border-r-2 border-t-2 border-white/45" />
                            <span className="pointer-events-none absolute bottom-8 left-8 h-8 w-8 rounded-bl-[18px] border-b-2 border-l-2 border-white/45" />
                            <span className="pointer-events-none absolute bottom-8 right-8 h-8 w-8 rounded-br-[18px] border-b-2 border-r-2 border-white/45" />
                        </div>

                        <form onSubmit={handleManualSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25" />
                                <input
                                    value={manualCode}
                                    onChange={(event) => setManualCode(event.target.value)}
                                    placeholder="Ticket ID, code, or QR value"
                                    className="h-12 w-full rounded-full border border-black/10 bg-white pl-11 pr-5 text-sm font-medium text-black outline-none transition-colors placeholder:text-black/30 focus:border-black"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!manualCode.trim() || !selectedEventId}
                                className="h-12 rounded-full bg-black px-7 text-sm font-semibold text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Check in
                            </button>
                        </form>
                        {cameraError && <p className="mt-3 text-sm font-medium text-red-600">{cameraError}</p>}
                    </main>

                    <aside className="space-y-9 lg:border-l lg:border-black/5 lg:pl-8">
                        <section>
                            <div className="mb-5 flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-[21px] font-semibold text-black">{result?.title || 'Scan result'}</h2>
                                    <p className="mt-1 text-sm font-medium text-black/40">{result?.message || 'Validated ticket details will appear here.'}</p>
                                </div>
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/50">
                                    {result?.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : result?.type === 'error' ? <XCircle className="h-5 w-5 text-red-600" /> : <Ticket className="h-5 w-5" />}
                                </div>
                            </div>

                            {result?.ticket ? (
                                <div className="border-t border-black/5 pt-4">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-black">{result.ticket.attendeeName || 'Guest'}</p>
                                            <p className="mt-0.5 truncate text-xs text-black/40">{result.ticket.attendeeEmail || 'No email'}</p>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${result.type === 'success' ? 'bg-emerald-50 text-emerald-700' : result.type === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                            {result.type === 'success' ? 'Valid' : result.type === 'warning' ? 'Duplicate' : 'Invalid'}
                                        </span>
                                    </div>
                                    <dl className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <dt className="text-black/35">Ticket</dt>
                                            <dd className="mt-1 truncate font-semibold text-black">{result.ticket.ticketLabel}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-black/35">Code</dt>
                                            <dd className="mt-1 truncate font-mono font-semibold text-black">{result.ticket.code || result.ticket.id}</dd>
                                        </div>
                                    </dl>
                                </div>
                            ) : (
                                <div className="border-y border-dashed border-black/10 py-10 text-center text-sm font-medium text-black/35">
                                    No ticket scanned yet.
                                </div>
                            )}
                        </section>

                        <section>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-[21px] font-semibold text-black">Recent</h2>
                                <UserCheck className="h-5 w-5 text-black/30" />
                            </div>
                            {recentTickets.length === 0 ? (
                                <p className="border-y border-dashed border-black/10 py-10 text-center text-sm font-medium text-black/35">No check-ins yet.</p>
                            ) : (
                                <div className="divide-y divide-black/5">
                                    {recentTickets.map(ticket => (
                                        <div key={ticket.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-black">{ticket.attendeeName || 'Guest'}</p>
                                                <p className="truncate text-xs text-black/40">{ticket.ticketLabel}</p>
                                            </div>
                                            <span className="shrink-0 text-[11px] font-semibold text-black/40">
                                                {new Date(checkedIn[ticket.id]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
}
