import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CheckCircle2, Search, Ticket, UserCheck, XCircle } from 'lucide-react';
import { getEventsByUser, getEventOrders, StandaloneEvent } from '@/lib/api/events';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';
import { $tickets } from '@/lib/api/services';
import { TICKET_THEMES } from '@/lib/constants';

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
    colorTheme: string;
    orderId: string;
    checkedAt?: string;
};

type ScanResult = {
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    ticket?: CheckInTicket;
};

type ScanFeedback = 'success' | 'error' | null;

type CaptureAnimation = {
    id: number;
    code: string;
    imageUrl: string;
    ticket?: CheckInTicket;
} | null;

const CHECK_IN_STORAGE_KEY = 'amptive.dashboard.checkins';

const readStoredCheckIns = (): Record<string, string> => {
    try {
        const stored = localStorage.getItem(CHECK_IN_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

const captureQrFromVideo = (video: HTMLVideoElement, detection?: any) => {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (!videoWidth || !videoHeight) return '';

    const box = detection?.boundingBox;
    const fallbackSize = Math.min(videoWidth, videoHeight) * 0.42;
    const rawX = Number(box?.x ?? (videoWidth - fallbackSize) / 2);
    const rawY = Number(box?.y ?? (videoHeight - fallbackSize) / 2);
    const rawWidth = Number(box?.width ?? fallbackSize);
    const rawHeight = Number(box?.height ?? fallbackSize);
    const padding = Math.max(rawWidth, rawHeight) * 0.28;

    const sourceX = Math.max(0, rawX - padding);
    const sourceY = Math.max(0, rawY - padding);
    const sourceWidth = Math.min(videoWidth - sourceX, rawWidth + padding * 2);
    const sourceHeight = Math.min(videoHeight - sourceY, rawHeight + padding * 2);
    const canvas = document.createElement('canvas');
    const size = 320;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return '';

    context.fillStyle = '#fff';
    context.fillRect(0, 0, size, size);
    context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);
    return canvas.toDataURL('image/png');
};

const isDetectionInsideGuide = (video: HTMLVideoElement, detection?: any) => {
    const box = detection?.boundingBox;
    if (!box) return true;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (!videoWidth || !videoHeight) return true;

    const guideSize = Math.min(videoWidth * 0.44, 230 * (videoWidth / Math.max(video.clientWidth || videoWidth, 1)));
    const guideLeft = (videoWidth - guideSize) / 2;
    const guideTop = (videoHeight - guideSize) / 2;
    const guideRight = guideLeft + guideSize;
    const guideBottom = guideTop + guideSize;
    const centerX = Number(box.x || 0) + Number(box.width || 0) / 2;
    const centerY = Number(box.y || 0) + Number(box.height || 0) / 2;

    return centerX >= guideLeft && centerX <= guideRight && centerY >= guideTop && centerY <= guideBottom;
};

const detectQrWithCanvas = (video: HTMLVideoElement) => {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (!videoWidth || !videoHeight) return null;

    const guideSize = Math.min(videoWidth * 0.48, videoHeight * 0.64);
    const sourceX = Math.max(0, (videoWidth - guideSize) / 2);
    const sourceY = Math.max(0, (videoHeight - guideSize) / 2);
    const sourceSize = Math.min(guideSize, videoWidth - sourceX, videoHeight - sourceY);
    const canvas = document.createElement('canvas');
    const outputSize = 900;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.imageSmoothingEnabled = false;
    context.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
    const imageData = context.getImageData(0, 0, outputSize, outputSize);
    const qr = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    if (!qr?.data) return null;

    const points = [
        qr.location.topLeftCorner,
        qr.location.topRightCorner,
        qr.location.bottomRightCorner,
        qr.location.bottomLeftCorner,
    ];
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
        rawValue: qr.data,
        boundingBox: {
            x: sourceX + (minX / outputSize) * sourceSize,
            y: sourceY + (minY / outputSize) * sourceSize,
            width: ((maxX - minX) / outputSize) * sourceSize,
            height: ((maxY - minY) / outputSize) * sourceSize,
        },
    };
};

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const getNested = (source: any, path: string) => {
    return path.split('.').reduce((value, key) => value?.[key], source);
};

const firstValue = (...values: unknown[]) => {
    const value = values.find(item => String(item || '').trim());
    return value == null ? '' : String(value);
};

const collectTicketValues = (ticket: CheckInTicket) => {
    return [ticket.id, ticket.code, ticket.qr]
        .flatMap(value => extractTicketTokens(value))
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

const extractTicketTokens = (value: unknown) => {
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
                'access_code',
                'accessCode',
            ].forEach(key => {
                const parsedValue = (parsed as Record<string, unknown>)[key];
                if (parsedValue) tokens.add(String(parsedValue));
            });
        }
    } catch {
        raw.split(/[?&/#:=,\s]+/).forEach(part => {
            if (part) tokens.add(part);
        });
    }

    return Array.from(tokens);
};

const getTicketStatus = (ticket: CheckInTicket) => {
    const raw = normalize(ticket.status);
    if (['used', 'scanned', 'attended', 'checked-in', 'checked_in', 'check-in', 'check_in', 'validated', 'redeemed'].includes(raw)) return 'checked-in';
    if (raw === 'cancelled' || raw === 'refunded') return raw;
    return 'valid';
};

const getTicketCheckedAt = (ticket: any, order: any) => firstValue(
    ticket.checked_in_at,
    ticket.checkedInAt,
    ticket.scanned_at,
    ticket.scannedAt,
    ticket.used_at,
    ticket.usedAt,
    ticket.validated_at,
    ticket.validatedAt,
    ticket.redeemed_at,
    ticket.redeemedAt,
    order.checked_in_at,
    order.checkedInAt,
    order.scanned_at,
    order.scannedAt,
    order.used_at,
    order.usedAt,
    order.validated_at,
    order.validatedAt,
);

const getTicketStorageKeys = (ticket: CheckInTicket) => {
    const eventId = ticket.eventId || 'event';
    return [ticket.id, ticket.code, ticket.qr]
        .flatMap(value => extractTicketTokens(value))
        .map(normalize)
        .filter(Boolean)
        .map(value => `${eventId}:${value}`);
};

const getStoredCheckInTime = (checkedIn: Record<string, string>, ticket: CheckInTicket) => {
    if (ticket.checkedAt) return ticket.checkedAt;
    const keys = getTicketStorageKeys(ticket);
    const timestamp = keys.map(key => checkedIn[key]).find(Boolean);
    return timestamp || checkedIn[ticket.id] || '';
};

const flattenOrders = (orders: any[], fallbackEvent?: StandaloneEvent): CheckInTicket[] => {
    return orders.flatMap((order) => {
        const eventTitle = order.event_title || order.events?.title || fallbackEvent?.title || 'Untitled event';
        const eventId = order.event_id || fallbackEvent?.event_id || '';
        const buyerName = order.buyer_name || order.profiles?.display_name || order.attendee_name || 'Guest';
        const buyerEmail = order.buyer_email || order.profiles?.email || order.attendee_email || '';
        const orderTickets = Array.isArray(order.tickets) && order.tickets.length > 0 ? order.tickets : [order];

        return orderTickets.map((ticket: any, index: number) => {
            const ticketId = firstValue(
                ticket.id,
                ticket.ticket_id,
                ticket.ticketId,
                ticket.purchase_ticket_id,
                ticket.purchaseTicketId
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
                ticketId,
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
                ticketId,
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
            const id = firstValue(ticketId, code, qr, orderId ? `${orderId}:${index}` : `ticket:${index}`);
            const checkedAt = getTicketCheckedAt(ticket, order);

            return {
                id,
                code,
                qr,
                status: ticket.checked_in || ticket.checkedIn || ticket.is_checked_in || ticket.isCheckedIn || checkedAt
                    ? 'checked-in'
                    : ticket.ticket_status || ticket.status || order.ticket_status || order.status || 'valid',
                eventId,
                eventTitle,
                attendeeName: ticket.attendee_name || order.attendee_name || buyerName,
                attendeeEmail: ticket.attendee_email || order.attendee_email || buyerEmail,
                ticketLabel: firstValue(
                    getNested(ticket, 'event_tickets.label'),
                    ticket.label,
                    ticket.ticket_label,
                    ticket.ticketLabel,
                    ticket.type_label,
                    ticket.typeLabel,
                    ticket.name,
                    order.ticket_label,
                    order.ticketLabel,
                    order.label,
                    getNested(order, 'event_tickets.label'),
                    'Ticket'
                ),
                colorTheme: firstValue(
                    getNested(ticket, 'event_tickets.color_theme'),
                    ticket.color_theme,
                    ticket.colorTheme,
                    order.color_theme,
                    'silver'
                ),
                orderId,
                checkedAt,
            };
        });
    }).filter((ticket) => ticket.id || ticket.code || ticket.qr);
};

export default function DashboardCheckIn() {
    const [events, setEvents] = useState<StandaloneEvent[]>([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [tickets, setTickets] = useState<CheckInTicket[]>([]);
    const [checkedIn, setCheckedIn] = useState<Record<string, string>>(() => readStoredCheckIns());
    const [manualCode, setManualCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [scanFeedback, setScanFeedback] = useState<ScanFeedback>(null);
    const [captureAnimation, setCaptureAnimation] = useState<CaptureAnimation>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<any>(null);
    const scanIntervalRef = useRef<number | null>(null);
    const validatingRef = useRef(false);
    const feedbackTimerRef = useRef<number | null>(null);
    const captureTimerRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

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
                const nextTickets = flattenOrders(orders, selectedEvent);
                setTickets(nextTickets);
                const backendCheckedIn = nextTickets.filter(ticket => getTicketStatus(ticket) === 'checked-in');
                if (backendCheckedIn.length > 0) {
                    setCheckedIn(prev => {
                        const next = { ...prev };
                        backendCheckedIn.forEach(ticket => {
                            const timestamp = ticket.checkedAt || next[ticket.id];
                            if (!timestamp) return;
                            getTicketStorageKeys(ticket).forEach(key => {
                                next[key] = timestamp;
                            });
                            next[ticket.id] = timestamp;
                        });
                        return next;
                    });
                }
            } catch {
                setTickets([]);
            } finally {
                setOrdersLoading(false);
            }
        };

        fetchOrders();
    }, [selectedEventId, events]);

    useEffect(() => {
        return () => {
            stopCamera();
            if (feedbackTimerRef.current) {
                window.clearTimeout(feedbackTimerRef.current);
            }
            if (captureTimerRef.current) {
                window.clearTimeout(captureTimerRef.current);
            }
        };
    }, []);

    const triggerCaptureAnimation = (code: string, detection?: any, ticket?: CheckInTicket | null) => {
        const imageUrl = videoRef.current ? captureQrFromVideo(videoRef.current, detection) : '';
        setCaptureAnimation({ id: Date.now(), code, imageUrl, ticket: ticket || undefined });
        if (captureTimerRef.current) {
            window.clearTimeout(captureTimerRef.current);
        }
        captureTimerRef.current = window.setTimeout(() => setCaptureAnimation(null), 1050);
    };

    const playScanSound = (type: Exclude<ScanFeedback, null>) => {
        try {
            const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextCtor) return;

            const audioContext = audioContextRef.current || new AudioContextCtor();
            audioContextRef.current = audioContext;
            if (audioContext.state === 'suspended') {
                void audioContext.resume();
            }

            const now = audioContext.currentTime;
            const gain = audioContext.createGain();
            gain.connect(audioContext.destination);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(type === 'success' ? 0.22 : 0.1, now + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === 'success' ? 0.42 : 0.22));

            const playTone = (frequency: number, start: number, duration: number) => {
                const oscillator = audioContext.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequency, now + start);
                oscillator.connect(gain);
                oscillator.start(now + start);
                oscillator.stop(now + start + duration);
            };

            if (type === 'success') {
                playTone(523, 0, 0.09);
                playTone(784, 0.08, 0.12);
                playTone(1047, 0.2, 0.2);
            } else {
                playTone(260, 0, 0.1);
                playTone(170, 0.1, 0.12);
            }
        } catch {
            // Audio feedback is a nice-to-have and should never block check-in.
        }
    };

    const triggerScanFeedback = (type: Exclude<ScanFeedback, null>) => {
        playScanSound(type);
        setScanFeedback(type);
        if (feedbackTimerRef.current) {
            window.clearTimeout(feedbackTimerRef.current);
        }
        feedbackTimerRef.current = window.setTimeout(() => setScanFeedback(null), 850);
    };

    const selectedEvent = events.find(event => event.event_id === selectedEventId);
    const checkedInCount = tickets.filter(ticket => getStoredCheckInTime(checkedIn, ticket) || getTicketStatus(ticket) === 'checked-in').length;
    const waitingCount = tickets.filter(ticket => getTicketStatus(ticket) === 'valid' && !getStoredCheckInTime(checkedIn, ticket)).length;

    const recentTickets = useMemo(() => {
        return tickets
            .filter(ticket => getStoredCheckInTime(checkedIn, ticket))
            .sort((a, b) => new Date(getStoredCheckInTime(checkedIn, b)).getTime() - new Date(getStoredCheckInTime(checkedIn, a)).getTime())
            .slice(0, 6);
    }, [tickets, checkedIn]);

    const findTicket = (code: string) => {
        const queries = extractScanTokens(code).map(normalize).filter(Boolean);
        if (queries.length === 0) return null;

        return tickets.find(ticket => {
            const values = collectTicketValues(ticket);
            return values.some(value => queries.includes(value));
        }) || null;
    };

    const markTicketCheckedIn = (ticket: CheckInTicket, timestamp = new Date().toISOString()) => {
        setCheckedIn(prev => {
            const next = { ...prev, [ticket.id]: timestamp };
            getTicketStorageKeys(ticket).forEach(key => {
                next[key] = timestamp;
            });
            return next;
        });
        setTickets(prev => prev.map(item => (
            item.id === ticket.id ? { ...item, status: 'checked-in' } : item
        )));
    };

    const checkInCode = async (code: string) => {
        if (validatingRef.current) return;

        const ticket = findTicket(code);

        if (!ticket) {
            triggerScanFeedback('error');
            setResult({
                type: 'error',
                title: 'Ticket not found',
                message: 'This QR code or ticket ID does not match this event.',
            });
            return;
        }

        const status = getTicketStatus(ticket);
        if (status === 'cancelled' || status === 'refunded') {
            triggerScanFeedback('error');
            setResult({
                type: 'error',
                title: 'Ticket not valid',
                message: `This ticket is ${status} and should not be admitted.`,
                ticket,
            });
            return;
        }

        if (getStoredCheckInTime(checkedIn, ticket) || status === 'checked-in') {
            triggerScanFeedback('error');
            setResult({
                type: 'warning',
                title: 'Already checked in',
                message: `${ticket.attendeeName || 'This attendee'} has already used this ticket.`,
                ticket,
            });
            return;
        }

        validatingRef.current = true;
        setValidating(true);
        try {
            await $tickets.validateForCheckIn(ticket.eventId || selectedEventId, ticket.code || ticket.id);
            markTicketCheckedIn(ticket);
            triggerScanFeedback('success');
            setResult({
                type: 'success',
                title: 'Check-in approved',
                message: `${ticket.attendeeName || 'Attendee'} can enter.`,
                ticket: { ...ticket, status: 'checked-in' },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (/already|duplicate|used|checked/i.test(message)) {
                markTicketCheckedIn(ticket);
                triggerScanFeedback('error');
                setResult({
                    type: 'warning',
                    title: 'Already checked in',
                    message: `${ticket.attendeeName || 'This attendee'} has already used this ticket.`,
                    ticket: { ...ticket, status: 'checked-in' },
                });
                return;
            }

            triggerScanFeedback('error');
            setResult({
                type: 'error',
                title: 'Check-in failed',
                message: message || 'Unable to validate this ticket right now. Please try again.',
                ticket,
            });
        } finally {
            validatingRef.current = false;
            setValidating(false);
        }
    };

    const handleManualSubmit = async (event: FormEvent) => {
        event.preventDefault();
        await checkInCode(manualCode);
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

        try {
            detectorRef.current = BarcodeDetector ? new BarcodeDetector({ formats: ['qr_code'] }) : null;
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    advanced: [
                        { focusMode: 'continuous' } as MediaTrackConstraintSet,
                    ],
                },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setCameraActive(true);

            scanIntervalRef.current = window.setInterval(async () => {
                if (!videoRef.current) return;
                const detections = detectorRef.current
                    ? await detectorRef.current.detect(videoRef.current).catch(() => [])
                    : [detectQrWithCanvas(videoRef.current)].filter(Boolean);
                const firstDetection = detections?.find((code: any) => isDetectionInsideGuide(videoRef.current as HTMLVideoElement, code));
                const first = firstDetection?.rawValue;
                if (first) {
                    triggerCaptureAnimation(first, firstDetection, findTicket(first));
                    stopCamera();
                    await checkInCode(first);
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
            <style>{`
                @keyframes qrExtract {
                    0% {
                        opacity: 0;
                        transform: translateY(34px) scale(0.62) rotateX(18deg) rotateY(-18deg);
                        filter: blur(8px);
                    }
                    35% {
                        opacity: 1;
                        transform: translateY(0) scale(1) rotateX(0deg) rotateY(0deg);
                        filter: blur(0);
                    }
                    72% {
                        opacity: 1;
                        transform: translateY(-6px) scale(1.06) rotateY(7deg);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-30px) scale(0.9) rotateY(12deg);
                        filter: blur(5px);
                    }
                }

                @keyframes qrScanBeam {
                    0% {
                        transform: translateY(0);
                    }
                    100% {
                        transform: translateY(72px);
                    }
                }
            `}</style>
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
                            ['Waiting', waitingCount],
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
                            {captureAnimation && (
                                <div
                                    key={captureAnimation.id}
                                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/20"
                                >
                                    <div className="absolute inset-0 animate-[pulse_900ms_ease-out_1] bg-white/5" />
                                    {(() => {
                                        const theme = TICKET_THEMES[captureAnimation.ticket?.colorTheme || 'silver'] || TICKET_THEMES.silver;

                                        return (
                                            <div className={`relative h-[164px] w-[288px] animate-[qrExtract_1050ms_cubic-bezier(0.2,0.9,0.2,1)_1_forwards] overflow-visible rounded-[2rem] border ${theme.border} ${theme.gradient} px-5 py-5 shadow-xl`}>
                                                <span className={`pointer-events-none absolute inset-y-6 -right-3 z-0 h-10 w-10 rounded-full border ${theme.border} bg-white/50`} aria-hidden="true" />
                                                <span className={`pointer-events-none absolute left-1/2 top-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />
                                                <span className={`pointer-events-none absolute left-1/2 bottom-0 z-0 h-[18%] w-px -translate-x-1/2 border-l border-dashed ${theme.border}`} aria-hidden="true" />

                                                <div className="relative z-10 flex h-full flex-col justify-between">
                                                    <div className="min-w-0 pr-20">
                                                        <p className={`text-[9px] uppercase tracking-[0.28em] ${theme.text} opacity-60`}>{captureAnimation.ticket?.eventTitle || selectedEvent?.title || 'Event'}</p>
                                                        <p className={`mt-1 line-clamp-2 text-[18px] font-semibold leading-tight ${theme.text}`}>
                                                            {captureAnimation.ticket?.ticketLabel || 'Ticket'}
                                                        </p>
                                                    </div>

                                                    <div className="min-w-0 pr-20">
                                                        <p className={`truncate text-[12px] font-semibold ${theme.text}`}>
                                                            {captureAnimation.ticket?.attendeeName || 'Scanning guest'}
                                                        </p>
                                                        <span className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${theme.badge} ${theme.badgeText} opacity-80`}>
                                                            Verifying
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className={`absolute bottom-4 right-4 z-20 flex flex-col items-end gap-1 ${theme.text}`}>
                                                    <div className="relative h-[72px] w-[72px] overflow-hidden bg-transparent">
                                                        {captureAnimation.imageUrl ? (
                                                            <img
                                                                src={captureAnimation.imageUrl}
                                                                alt=""
                                                                className="h-full w-full object-cover mix-blend-multiply"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em] opacity-45">
                                                                QR
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="max-w-[72px] truncate text-[8px] font-mono opacity-60">{captureAnimation.ticket?.code || captureAnimation.code}</p>
                                                </div>

                                                <div className="absolute bottom-4 right-4 z-30 h-[72px] w-[72px] overflow-hidden">
                                                    <div className="absolute left-0 right-0 top-0 h-1 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.95)] animate-[qrScanBeam_720ms_ease-in-out_1_150ms_forwards]" />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                            {scanFeedback && (
                                <div
                                    key={scanFeedback}
                                    className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center ${
                                        scanFeedback === 'success' ? 'bg-emerald-500/15' : 'bg-red-500/15'
                                    } animate-[pulse_850ms_ease-out_1]`}
                                >
                                    <div className={`absolute inset-8 rounded-[24px] border-2 ${scanFeedback === 'success' ? 'border-emerald-400/80' : 'border-red-400/80'} animate-ping`} />
                                    <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg ${scanFeedback === 'success' ? 'text-emerald-600' : 'text-red-600'} animate-[bounce_650ms_ease-out_1]`}>
                                        {scanFeedback === 'success' ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
                                    </div>
                                </div>
                            )}
                            {!cameraActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
                                    <Camera className="mb-3 h-9 w-9" />
                                    <p className="text-sm font-semibold">Camera scanner</p>
                                </div>
                            )}
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_27%,rgba(0,0,0,0.38)_28%,rgba(0,0,0,0.56)_100%)]" />
                            <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[44%] max-w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-white/20" />
                            <span className="pointer-events-none absolute left-[28%] top-[25%] h-8 w-8 rounded-tl-[16px] border-l-2 border-t-2 border-white/75" />
                            <span className="pointer-events-none absolute right-[28%] top-[25%] h-8 w-8 rounded-tr-[16px] border-r-2 border-t-2 border-white/75" />
                            <span className="pointer-events-none absolute bottom-[25%] left-[28%] h-8 w-8 rounded-bl-[16px] border-b-2 border-l-2 border-white/75" />
                            <span className="pointer-events-none absolute bottom-[25%] right-[28%] h-8 w-8 rounded-br-[16px] border-b-2 border-r-2 border-white/75" />
                            {cameraActive && (
                                <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1.5 text-[12px] font-semibold text-white/80">
                                    Fill the square with the QR
                                </p>
                            )}
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
                                disabled={!manualCode.trim() || !selectedEventId || validating}
                                className="h-12 rounded-full bg-black px-7 text-sm font-semibold text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {validating ? 'Validating...' : 'Check in'}
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
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/50 ${scanFeedback ? 'animate-[bounce_650ms_ease-out_1]' : ''}`}>
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
                                            {result.type === 'success' ? 'Valid' : result.type === 'warning' ? 'Already checked in' : 'Invalid'}
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
                                                {new Date(getStoredCheckInTime(checkedIn, ticket)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
