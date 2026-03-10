import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    Wallet,
    ShoppingCart,
    LineChart,
    Settings,
    LogOut,
    ChevronRight,
    Menu,
    X,
    RefreshCw,
    FileText,
    Star,
    Users,
    Eye,
    ChevronDown,
    Clock,
    MapPin,
    Plus,
    Copy,
    Ticket,
    Share2,
    Download,
    ArrowLeft,
    Play,
    Pause
} from 'lucide-react';
import { getCurrentUser, signOut } from '@/lib/supabase/auth';
import { getProfileById } from '@/lib/supabase/profiles';
import { createClient } from '@/lib/supabase/client';
import DashboardEvents from './DashboardEvents';
import DashboardFinance from './DashboardFinance';
import DashboardOrders from './DashboardOrders';
import CreateEvent from './CreateEvent';

const AnimatedCounter = ({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;
        const duration = 1500;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // easeOutQuart
            const easeOut = 1 - Math.pow(1 - percentage, 4);

            setCount(Math.floor(value * easeOut));

            if (percentage < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(value);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [value]);

    return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

const SalesCircularProgress = ({ sold, total }: { sold: number; total: number }) => {
    const percentage = total > 0 ? Math.min((sold / total) * 100, 100) : 0;
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-12 h-12">
            <svg viewBox="0 0 100 100" aria-hidden="true" className="w-full h-full -rotate-90">
                {/* Background track */}
                <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-black/5"
                />

                {/* Progress stroke with rounded caps using a dasharray trick */}
                <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r={radius}
                    stroke="#22C55E"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center rotate-0">
                <span className="text-[11px] font-black text-black">{Math.round(percentage)}%</span>
            </div>
        </div>
    );
};

function DashboardHome({ displayName }: { displayName: string }) {
    const getCurrentMonthLabel = () => {
        const now = new Date();
        const month = now.toLocaleString('default', { month: 'short' });
        const year = now.getFullYear().toString().slice(-2);
        return `${month} '${year}`;
    };

    const [activeMonth, setActiveMonth] = useState(getCurrentMonthLabel());
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshCount, setRefreshCount] = useState(0);

    const [isPaused, setIsPaused] = useState(false);
    const [currentStatIndex, setCurrentStatIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);
    const CAROUSEL_DURATION = 5000;

    const stats = [
        {
            title: "Total Sales",
            subtitle: "Revenue",
            value: 245,
            prefix: "₦",
            suffix: "k",
            change: "+12%",
            icon: Wallet,
            bgColor: "bg-blue-50",
            textColor: "text-blue-600"
        },
        {
            title: "Orders",
            subtitle: "Purchases",
            value: 156,
            change: "+8%",
            icon: ShoppingCart,
            bgColor: "bg-purple-50",
            textColor: "text-purple-600"
        },
        {
            title: "Upcoming Events",
            subtitle: "Upcoming",
            value: 12,
            change: "+5%",
            icon: Calendar,
            bgColor: "bg-red-50",
            textColor: "text-red-600"
        },
        {
            title: "Attendees",
            subtitle: "Total Attendees",
            value: 285,
            change: "+18%",
            icon: Users,
            bgColor: "bg-green-50",
            textColor: "text-green-600"
        }
    ];

    // Auto-paging logic
    useEffect(() => {
        if (isPaused) return;

        const interval = 50;
        const step = (interval / CAROUSEL_DURATION) * 100;

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    const nextIndex = (currentStatIndex + 1) % stats.length;
                    setCurrentStatIndex(nextIndex);

                    // Programmatically scroll the carousel
                    if (carouselRef.current) {
                        const cardWidth = carouselRef.current.offsetWidth;
                        carouselRef.current.scrollTo({
                            left: nextIndex * cardWidth,
                            behavior: 'smooth'
                        });
                    }
                    return 0;
                }
                return prev + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [isPaused, currentStatIndex, stats.length]);

    // Handle manual scroll to sync progress bars
    const handleCarouselScroll = () => {
        if (!carouselRef.current) return;

        const scrollPosition = carouselRef.current.scrollLeft;
        const cardWidth = carouselRef.current.offsetWidth;
        const newIndex = Math.round(scrollPosition / cardWidth);

        if (newIndex !== currentStatIndex) {
            setCurrentStatIndex(newIndex);
            setProgress(0); // Reset progress on manual swipe
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setEventsLoading(true);
        setRefreshCount(prev => prev + 1);
        // Mock a data fetch delay
        setTimeout(() => {
            setEventsLoading(false);
            setIsRefreshing(false);
        }, 1500);
    };

    useEffect(() => {
        const timer = setTimeout(() => setEventsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    const monthlyData: Record<string, { total: string; points: { cx: number; cy: number; label: string; amount: string }[] }> = {
        "Mar '26": {
            total: "₦425k",
            points: [
                { cx: 0, cy: 190, label: 'Wk 1', amount: '₦245k' },
                { cx: 133.33, cy: 140, label: 'Wk 2', amount: '₦180k' },
            ]
        },
        "Feb '26": {
            total: "₦180k",
            points: [
                { cx: 0, cy: 195, label: 'Wk 1', amount: '₦50k' },
                { cx: 133.33, cy: 160, label: 'Wk 2', amount: '₦90k' },
                { cx: 266.66, cy: 110, label: 'Wk 3', amount: '₦15k' },
                { cx: 400, cy: 75, label: 'Wk 4', amount: '₦25k' },
            ]
        },
        "Jan '26": {
            total: "₦120k",
            points: [
                { cx: 0, cy: 190, label: 'Wk 1', amount: '₦10k' },
                { cx: 133.33, cy: 170, label: 'Wk 2', amount: '₦40k' },
                { cx: 266.66, cy: 150, label: 'Wk 3', amount: '₦55k' },
                { cx: 400, cy: 120, label: 'Wk 4', amount: '₦15k' },
            ]
        },
        "Dec '25": {
            total: "₦290k",
            points: [
                { cx: 0, cy: 170, label: 'Wk 1', amount: '₦15k' },
                { cx: 133.33, cy: 110, label: 'Wk 2', amount: '₦140k' },
                { cx: 266.66, cy: 60, label: 'Wk 3', amount: '₦100k' },
                { cx: 400, cy: 15, label: 'Wk 4', amount: '₦35k' },
            ]
        }
    };

    const activeData = monthlyData[activeMonth] || monthlyData["Mar '26"];

    const maxK = Math.max(...activeData.points.map(p => parseInt(p.amount.replace(/\D/g, '')) || 0));
    const minK = Math.min(...activeData.points.map(p => parseInt(p.amount.replace(/\D/g, '')) || 0));

    // Dynamic Floor and Ceiling
    const axisMin = minK;
    let axisMax = Math.ceil(maxK / 10) * 10;
    if (axisMax <= axisMin) {
        axisMax = axisMin + 20; // Ensure there is always a range to draw, e.g., if min=20, max=40
    }
    const range = axisMax - axisMin;

    const dynamicPoints = activeData.points.map(p => {
        const val = parseInt(p.amount.replace(/\D/g, '')) || 0;
        return {
            ...p,
            cy: 200 - ((val - axisMin) / range) * 200
        };
    });

    return (
        <div className="content-area">
            <style>
                {`
                    @keyframes drawCurve {
                        from { stroke-dashoffset: 1500; }
                        to { stroke-dashoffset: 0; }
                    }
                    @keyframes shimmer {
                        0% { background-position: -400px 0; }
                        100% { background-position: 400px 0; }
                    }
                    .skeleton-shimmer {
                        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                        background-size: 400px 100%;
                        animation: shimmer 1.4s ease infinite;
                    }
                    @keyframes fadeArea {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .animate-draw-line {
                        stroke-dasharray: 1500;
                        stroke-dashoffset: 1500;
                        animation: drawCurve 1.5s ease-out forwards;
                    }
                    .animate-fade-area {
                        opacity: 0;
                        animation: fadeArea 1.5s ease-out forwards;
                    }
                `}
            </style>
            <div className="px-4 md:px-8 pt-6 pb-8 md:pt-8 md:pb-12 flex flex-col items-center">

                <header className="mb-4 md:mb-5 flex items-center justify-between w-full">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
                            Hello, {displayName} 👋
                        </h1>
                        <p className="hidden sm:block text-[15px] text-black/40 font-sans mt-1">Here's what's happening with your events today.</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2 md:p-3 bg-black rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        title="Refresh Dashboard"
                    >
                        <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="md:hidden text-white text-sm font-medium">Refresh</span>
                    </button>
                </header>

                {/* KPI Section */}
                <div className="w-full mb-8">
                    {/* Desktop Grid (Hidden on LG and below is not what we want, we want shown on LG and up) */}
                    <div className="hidden lg:grid lg:grid-cols-4 gap-6">
                        {stats.map((stat, i) => (
                            <div key={i} className="group bg-white border border-black/5 py-5 px-6 rounded-2xl shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col gap-5">
                                        <span className="text-base font-semibold text-black">{stat.title}</span>
                                        <div className={`p-3 my-2 rounded-full ${stat.bgColor} ${stat.textColor} transition-transform group-hover:scale-110 duration-200 w-fit`}>
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-green-700 bg-green-50/80 border border-green-200/60 px-2.5 py-1 rounded-full">
                                        {stat.change}
                                    </span>
                                </div>
                                <h3 className="text-[13px] font-semibold text-black mb-1">{stat.subtitle}</h3>
                                <div className="text-4xl font-bold tracking-tight text-black mt-1">
                                    <AnimatedCounter key={`stat-desktop-${i}-${refreshCount}`} value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mobile/Tablet Carousel (Hidden on LG and up) */}
                    <div className="lg:hidden flex flex-col">
                        <div className="relative rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                            <div
                                ref={carouselRef}
                                onScroll={handleCarouselScroll}
                                onTouchStart={() => setIsPaused(true)}
                                onTouchEnd={() => setIsPaused(false)}
                                className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
                            >
                                {stats.map((stat, i) => (
                                    <div key={i} className="w-full shrink-0 py-5 px-6 snap-center snap-always">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col gap-5">
                                                <span className="text-base font-semibold text-black">{stat.title}</span>
                                                <div className={`p-3 my-2 rounded-full ${stat.bgColor} ${stat.textColor} w-fit`}>
                                                    <stat.icon className="w-5 h-5" />
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold text-green-700 bg-green-50/80 border border-green-200/60 px-2.5 py-1 rounded-full">
                                                {stat.change}
                                            </span>
                                        </div>
                                        <h3 className="text-[13px] font-semibold text-black mb-1">{stat.subtitle}</h3>
                                        <div className="text-4xl font-bold tracking-tight text-black mt-1">
                                            <AnimatedCounter key={`stat-mobile-${i}-${refreshCount}`} value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Carousel Controls */}
                        <div className="mt-4 flex items-center justify-center">
                            <div className="flex items-center space-x-2">
                                {stats.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setCurrentStatIndex(i);
                                            setProgress(0);
                                            if (carouselRef.current) {
                                                carouselRef.current.scrollTo({
                                                    left: i * carouselRef.current.offsetWidth,
                                                    behavior: 'smooth'
                                                });
                                            }
                                        }}
                                        className="relative h-1 w-10 overflow-hidden rounded-full bg-gray-200"
                                        aria-label={`Go to slide ${i + 1}`}
                                    >
                                        <div className="relative h-full w-full overflow-hidden">
                                            <div
                                                className="absolute top-0 left-0 h-full transition-all duration-100 ease-linear"
                                                style={{
                                                    backgroundColor: 'black',
                                                    width: i === currentStatIndex ? `${progress}%` : (i < currentStatIndex ? '100%' : '0%'),
                                                    opacity: i === currentStatIndex ? 1 : 0.5
                                                }}
                                            ></div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mb-8 items-start">
                    {/* Left Column: Stacked Live Feed & Chart */}
                    <div className="flex flex-col gap-8 w-full">
                        {/* Chart */}
                        <div className="bg-white border border-black/5 py-5 px-6 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-black">
                                    <span className="sm:hidden">Overview</span>
                                    <span className="hidden sm:inline">Revenue Overview</span>
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="flex items-center gap-1.5 text-[15px] font-semibold text-black/60 hover:text-black transition-colors outline-none"
                                        >
                                            <span>{activeMonth.replace(/'/, '20')}</span>
                                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isDropdownOpen && (
                                            <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                                        )}
                                        <div className={`absolute right-0 top-full mt-2 w-40 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-black-[0.05] overflow-hidden z-20 py-1 origin-top-right transition-all duration-200 ease-out ${isDropdownOpen ? 'opacity-100 scale-100 translate-y-0 visible pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 invisible pointer-events-none'}`}>
                                            {Object.keys(monthlyData).map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => {
                                                        setActiveMonth(m);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-5 py-2.5 text-[14px] font-semibold transition-colors flex items-center justify-between group/option ${activeMonth === m
                                                        ? 'bg-blue-50/80 text-[#2563eb]'
                                                        : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                                                        }`}
                                                >
                                                    <span>{m.replace(/'/, '20')}</span>
                                                    {activeMonth === m && <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></div>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-[#2563eb] bg-blue-50/50 border border-blue-100 px-2.5 py-1 rounded-full">
                                        {activeData.total}
                                    </span>
                                </div>
                            </div>
                            <div className="h-48 sm:h-64 lg:h-72 w-full mt-4">
                                <svg key={activeMonth} className="w-full h-full overflow-visible" viewBox="-40 -20 460 250">
                                    <defs>
                                        <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>

                                    {/* Y-Axis Labels - Inside SVG for perfect alignment */}
                                    {[
                                        { val: axisMax, label: `₦${axisMax}k`, y: 0 },
                                        { val: axisMin + range * 0.66, label: `₦${Math.round(axisMin + range * 0.66)}k`, y: 66.66 },
                                        { val: axisMin + range * 0.33, label: `₦${Math.round(axisMin + range * 0.33)}k`, y: 133.33 },
                                        { val: axisMin, label: `₦${axisMin}k`, y: 200 }
                                    ].map((item, i) => (
                                        <g key={i}>
                                            <text
                                                x="-10"
                                                y={item.y}
                                                textAnchor="end"
                                                alignmentBaseline="middle"
                                                className="fill-black/40 text-[10px] font-sans font-medium"
                                                style={{ fontSize: '10px' }}
                                            >
                                                {item.label}
                                            </text>
                                            {/* Grid Lines */}
                                            {i > 0 && i < 3 && (
                                                <line x1="0" y1={item.y} x2="400" y2={item.y} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 4" />
                                            )}
                                        </g>
                                    ))}

                                    {/* Dynamic Graph Rendering */}
                                    {(() => {
                                        const generatePath = (data: typeof dynamicPoints) => {
                                            if (data.length === 0) return '';
                                            if (data.length === 1) return `M ${data[0].cx} ${data[0].cy}`;
                                            let path = `M ${data[0].cx} ${data[0].cy}`;
                                            for (let i = 1; i < data.length; i++) {
                                                const prev = data[i - 1];
                                                const curr = data[i];
                                                const cpX = prev.cx + (curr.cx - prev.cx) / 2;
                                                path += ` C ${cpX} ${prev.cy}, ${cpX} ${curr.cy}, ${curr.cx} ${curr.cy}`;
                                            }
                                            return path;
                                        };

                                        const linePath = generatePath(dynamicPoints);
                                        const areaPath = dynamicPoints.length > 1
                                            ? `${linePath} L ${dynamicPoints[dynamicPoints.length - 1].cx} 200 L 0 200 Z`
                                            : '';

                                        return (
                                            <>
                                                {/* Gradient Area Fill */}
                                                {dynamicPoints.length > 1 && (
                                                    <path
                                                        d={areaPath}
                                                        fill="url(#revenue-gradient)"
                                                        className="transition-all duration-500 ease-in-out animate-fade-area"
                                                    />
                                                )}

                                                {/* Smooth Line */}
                                                {linePath && (
                                                    <path
                                                        d={linePath}
                                                        fill="none"
                                                        stroke="#2563eb"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        className="transition-all duration-500 ease-in-out animate-draw-line"
                                                    />
                                                )}

                                                {/* Permanent Final Point */}
                                                {dynamicPoints.length > 0 && (
                                                    <circle
                                                        cx={dynamicPoints[dynamicPoints.length - 1].cx}
                                                        cy={dynamicPoints[dynamicPoints.length - 1].cy}
                                                        r="4"
                                                        className="fill-white stroke-[#2563eb] stroke-[3px] transition-all duration-500 ease-in-out animate-fade-area"
                                                    />
                                                )}
                                            </>
                                        );
                                    })()}

                                    {/* Interactive Data Hover Slices */}
                                    {dynamicPoints.map((point, i) => {
                                        const sliceWidth = (i === 0 || i === dynamicPoints.length - 1) ? 66.66 : 133.33;
                                        const startX = Math.max(0, point.cx - 66.66);
                                        return (
                                            <g key={i} className="group/slice cursor-crosshair">
                                                {/* Invisible vertical slice for full-height hover */}
                                                <rect x={startX} y="0" width={sliceWidth} height="200" fill="transparent" />

                                                {/* Hover Point */}
                                                <circle
                                                    cx={point.cx}
                                                    cy={point.cy}
                                                    r="5"
                                                    className="fill-white stroke-[#2563eb] stroke-[3px] opacity-0 scale-90 group-hover/slice:scale-100 group-hover/slice:opacity-100 transition-all duration-300 ease-out shadow-lg origin-center"
                                                    style={{ transformOrigin: `${point.cx}px ${point.cy}px` }}
                                                />

                                                {/* Tooltip */}
                                                <g className="opacity-0 translate-y-2 group-hover/slice:translate-y-0 group-hover/slice:opacity-100 transition-all duration-300 ease-out pointer-events-none">
                                                    <rect
                                                        x={Math.min(Math.max(point.cx - 25, 0), 350)}
                                                        y={point.cy - 34}
                                                        width="50"
                                                        height="22"
                                                        rx="11"
                                                        fill="#2563eb"
                                                    />
                                                    <polygon
                                                        points={`${point.cx - 4},${point.cy - 12} ${point.cx + 4},${point.cy - 12} ${point.cx},${point.cy - 8}`}
                                                        fill="#2563eb"
                                                    />
                                                    <text
                                                        x={Math.min(Math.max(point.cx - 25, 0), 350) + 25}
                                                        y={point.cy - 19}
                                                        textAnchor="middle"
                                                        fill="white"
                                                        fontSize="10"
                                                        fontWeight="700"
                                                        fontFamily="system-ui, sans-serif"
                                                    >
                                                        {point.amount}
                                                    </text>
                                                </g>
                                            </g>
                                        );
                                    })}

                                    {/* X-Axis Labels - Inside SVG */}
                                    {['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'].map((label, index) => {
                                        const x = index * 133.33;
                                        const isActive = index === activeData.points.length - 1;
                                        return (
                                            <text
                                                key={label}
                                                x={x}
                                                y={235}
                                                textAnchor="middle"
                                                className={`text-[10px] font-sans font-medium transition-colors duration-300 ${isActive ? 'fill-black' : 'fill-black/40'}`}
                                                style={{ fontSize: '10px' }}
                                            >
                                                {label}
                                            </text>
                                        );
                                    })}
                                </svg>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white border border-black/5 py-5 px-6 rounded-2xl shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-black">Recent Activity</h3>
                                <button className="text-[13px] font-semibold text-black/40 hover:text-black transition-colors tracking-wide">
                                    View All
                                </button>
                            </div>

                            <div className="flex flex-col">
                                {eventsLoading ? (
                                    [1, 2, 3, 4, 5, 6].map((i, idx, arr) => (
                                        <React.Fragment key={i}>
                                            <div className="flex items-center gap-2 py-1.5">
                                                <div className="skeleton-shimmer w-5 h-5 rounded-full shrink-0" />
                                                <div className="skeleton-shimmer h-3 rounded-full w-full max-w-[280px]" />
                                            </div>
                                            {idx !== arr.length - 1 && <div className="h-px bg-black/5 my-2.5"></div>}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    [
                                        {
                                            subject: 'Adaeze Okafor',
                                            action: 'purchased a ticket for',
                                            target: 'Summer Music Festival',
                                            time: '2min ago',
                                            icon: <img src="https://i.pravatar.cc/150?u=adaeze" alt="Adaeze" className="w-5 h-5 rounded-full object-cover" />
                                        },
                                        {
                                            subject: 'Emeka Nwosu',
                                            action: 'purchased a ticket for',
                                            target: 'Tech Innovation Summit',
                                            time: '1h ago',
                                            icon: <img src="https://i.pravatar.cc/150?u=emeka" alt="Emeka" className="w-5 h-5 rounded-full object-cover" />
                                        },
                                        {
                                            subject: 'Funke Balogun',
                                            action: 'checked into',
                                            target: 'Local Art Exhibition',
                                            time: '3h ago',
                                            icon: <img src="https://i.pravatar.cc/150?u=funke" alt="Funke" className="w-5 h-5 rounded-full object-cover" />
                                        },
                                        {
                                            subject: 'Chidera Eze',
                                            action: 'purchased a ticket for',
                                            target: 'Summer Music Festival',
                                            time: '5h ago',
                                            icon: <img src="https://i.pravatar.cc/150?u=chidera" alt="Chidera" className="w-5 h-5 rounded-full object-cover" />
                                        },
                                        {
                                            subject: 'Folake Abiola',
                                            action: 'registered for',
                                            target: 'Local Art Exhibition',
                                            time: '6h ago',
                                            icon: <img src="https://i.pravatar.cc/150?u=folake" alt="Folake" className="w-5 h-5 rounded-full object-cover" />
                                        },
                                        {
                                            subject: 'Babatunde Aliyu',
                                            action: 'purchased a VIP ticket for',
                                            target: 'Tech Innovation Summit',
                                            time: '12h ago',
                                            icon: <img src="https://i.pravatar.cc/150?u=babatunde" alt="Babatunde" className="w-5 h-5 rounded-full object-cover" />
                                        }
                                    ].map((feed, i, arr) => (
                                        <React.Fragment key={i}>
                                            <div className="flex items-center gap-2 py-1.5 text-[13px] text-black/60 tracking-tight">
                                                <div className="flex shrink-0 items-center justify-center mr-[1px]">
                                                    {feed.icon}
                                                </div>
                                                <span>
                                                    <span className="font-semibold text-black">{feed.subject}</span> {feed.action} <span className="font-semibold text-black">{feed.target}</span> · {feed.time}
                                                </span>
                                            </div>
                                            {i !== arr.length - 1 && <div className="h-px bg-black/5 my-2.5"></div>}
                                        </React.Fragment>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col gap-8 w-full">
                        {/* Upcoming Events */}
                        <div className="bg-white border border-black/5 py-5 px-6 rounded-2xl shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-black">Upcoming Events</h3>
                                <button className="text-[13px] font-semibold text-black/40 hover:text-black transition-colors tracking-wide">
                                    View More
                                </button>
                            </div>

                            <div className="space-y-4">
                                {eventsLoading ? (
                                    // Skeleton cards
                                    [1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center justify-between p-4 border border-black/5 rounded-xl">
                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                {/* Date box skeleton */}
                                                <div className="skeleton-shimmer rounded-lg min-w-[64px] h-[56px] shrink-0" />
                                                {/* Info skeleton */}
                                                <div className="flex flex-col gap-2 flex-1">
                                                    <div className="skeleton-shimmer h-4 rounded-full w-3/4" />
                                                    <div className="skeleton-shimmer h-3 rounded-full w-1/2" />
                                                </div>
                                            </div>
                                            {/* Sales sidebar skeleton */}
                                            <div className="hidden sm:flex items-center gap-4 pl-6 border-l border-black/5 shrink-0">
                                                <div className="flex flex-col gap-2 items-end">
                                                    <div className="skeleton-shimmer h-4 rounded-full w-16" />
                                                    <div className="skeleton-shimmer h-3 rounded-full w-10" />
                                                </div>
                                                <div className="skeleton-shimmer rounded-full w-12 h-12" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    // Real event cards
                                    [
                                        { id: 1, title: 'Summer Music Festival', date: 'Aug 24', time: '4:00 PM', location: 'Central Park, NY', status: 'Published', sold: 450, total: 500 },
                                        { id: 2, title: 'Tech Innovation Summit', date: 'Sep 12', time: '9:00 AM', location: 'Convention Center', status: 'Published', sold: 120, total: 300 },
                                        { id: 3, title: 'Local Art Exhibition', date: 'Oct 05', time: '6:00 PM', location: 'Downtown Gallery', status: 'Draft', sold: 0, total: 100 },
                                    ].map((event) => (
                                        <div key={event.id} className="flex items-center justify-between p-4 border border-black/5 rounded-xl hover:border-black/10 transition-colors group/card">
                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                {/* Date Box */}
                                                <div className="bg-red-50 rounded-lg p-3 text-center min-w-[64px] shrink-0">
                                                    <p className="text-[10px] font-bold uppercase text-red-600/50 mb-0.5">{event.date.split(' ')[0]}</p>
                                                    <p className="text-xl font-bold text-red-600 leading-none">{event.date.split(' ')[1]}</p>
                                                </div>

                                                {/* Info */}
                                                <div className="min-w-0 flex-1 pr-4">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <h4 className="font-bold text-[15px] text-black truncate">{event.title}</h4>
                                                        <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${event.status === 'Published' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                                            {event.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-black/40">
                                                        <div className="flex items-center gap-1 text-[11px] font-medium tracking-tight">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 256 256">
                                                                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm56,112H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48a8,8,0,0,1,0,16Z"></path>
                                                            </svg>
                                                            <span>{event.time}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[11px] font-medium truncate">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 256 256">
                                                                <path d="M200,224H150.54A266.56,266.56,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25a88,88,0,0,0-176,0c0,31.4,14.51,64.68,42,96.25A266.56,266.56,0,0,0,105.46,224H56a8,8,0,0,0,0,16H200a8,8,0,0,0,0-16ZM128,72a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z"></path>
                                                            </svg>
                                                            <span className="truncate">{event.location}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sales Sidebar */}
                                            <div className="hidden sm:flex items-center gap-4 pl-6 border-l border-black/5 shrink-0">
                                                <div className="flex flex-col items-end leading-tight">
                                                    <span className="text-[15px] font-black text-black">{event.sold} sold</span>
                                                    <span className="text-[10px] font-bold text-black/30 whitespace-nowrap">of {event.total}</span>
                                                </div>
                                                <SalesCircularProgress sold={event.sold} total={event.total} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col items-center sm:items-start gap-4 mt-6">
                            <h3 className="text-[15px] font-bold text-black text-center sm:text-left">Quick Links</h3>

                            <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                                <button className="flex items-center gap-2 bg-black/5 hover:bg-black text-black/80 hover:text-white px-3 py-2 rounded-full transition-colors group">
                                    <Plus className="w-4 h-4" />
                                    <span className="text-[13px] font-semibold">Create event</span>
                                </button>
                                <button className="flex items-center gap-2 bg-black/5 hover:bg-black text-black/80 hover:text-white px-3 py-2 rounded-full transition-colors group">
                                    <Copy className="w-4 h-4" />
                                    <span className="text-[13px] font-semibold">Duplicate event</span>
                                </button>
                                <button className="flex items-center gap-2 bg-black/5 hover:bg-black text-black/80 hover:text-white px-3 py-2 rounded-full transition-colors group">
                                    <Ticket className="w-4 h-4" />
                                    <span className="text-[13px] font-semibold">New ticket type</span>
                                </button>
                                <button className="flex items-center gap-2 bg-black/5 hover:bg-black text-black/80 hover:text-white px-3 py-2 rounded-full transition-colors group">
                                    <Share2 className="w-4 h-4" />
                                    <span className="text-[13px] font-semibold">Share link</span>
                                </button>
                                <button className="flex items-center gap-2 bg-black/5 hover:bg-black text-black/80 hover:text-white px-3 py-2 rounded-full transition-colors group">
                                    <Download className="w-4 h-4" />
                                    <span className="text-[13px] font-semibold">Download attendees</span>
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [editingEventTitle, setEditingEventTitle] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
                const profileData = await getProfileById(currentUser.id);
                setProfile(profileData);
            } else {
                navigate('/login');
            }
        };
        fetchUserData();
    }, [navigate]);

    // Fetch editing event title if in edit mode
    useEffect(() => {
        const fetchEventTitle = async () => {
            const match = location.pathname.match(/\/dashboard\/events\/([^\/]+)\/edit/);
            if (match && match[1]) {
                const eventId = match[1];
                const supabase = createClient();
                const { data } = await supabase.from('events').select('title').eq('id', eventId).single();
                if (data) {
                    setEditingEventTitle(data.title);
                }
            } else {
                setEditingEventTitle(null);
            }
        };
        fetchEventTitle();
    }, [location.pathname]);

    const navItems = [
        { name: 'Overview', path: '/dashboard', icon: null as any, customIcon: true },
        { name: 'Events', path: '/dashboard/events', icon: null as any, customIcon: 'events' },
        { name: 'Orders', path: '/dashboard/orders', icon: null as any, customIcon: 'orders' },
        { name: 'Finance', path: '/dashboard/finance', icon: null as any, customIcon: 'finance' },
        { name: 'Help Center', path: '/help', icon: null as any, customIcon: 'help' },
        { name: 'Settings', path: '/dashboard/settings', icon: null as any, customIcon: 'settings' },
    ];

    const displayName = profile?.display_name || profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Organizer';

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <div className="flex h-screen bg-[#FDFDFD]">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 w-full bg-white border-b border-black/5 z-50 px-4 h-16 flex items-center justify-between">
                <a className="flex items-center space-x-1.5" href="/">
                    <img src="/amptivelogo.svg" alt="Amptive Logo" className="h-8 w-8 text-current" style={{ filter: 'invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%)', color: 'currentcolor' }} />
                    <img src="/amptextlogo.svg" alt="Amptive" className="h-5 w-auto" style={{ filter: 'invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%)', color: 'currentcolor' }} />
                </a>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -mr-2 text-black/60 hover:text-black">
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed lg:static top-16 lg:top-0 left-0 h-[calc(100vh-4rem)] lg:h-screen w-64 bg-white border-r border-black/5 z-40
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="hidden lg:block p-5">
                    <div className="flex items-center gap-2">
                        <a className="flex items-center space-x-1.5" href="/">
                            <div className="relative h-9 w-9 flex items-center justify-center hidden md:block">
                                <img src="/amptivelogo.svg" alt="Amptive Logo" className="h-full w-auto text-current" style={{ filter: 'invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%)', color: 'currentcolor' }} />
                            </div>
                            <div className="h-5 w-auto">
                                <img src="/amptextlogo.svg" alt="Amptive" className="h-full w-auto" style={{ filter: 'invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%)', color: 'currentcolor' }} />
                            </div>
                        </a>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isEventEdit = location.pathname.startsWith('/dashboard/events/') && location.pathname.endsWith('/edit');
                        {/* Only set Events as active if we are on the main events page, not the edit page */ }
                        const isActive = item.name === 'Events' ? location.pathname === '/dashboard/events' : location.pathname === item.path;

                        return (
                            <div key={item.name} className="space-y-1">
                                <Link
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm font-semibold
                                        ${isActive
                                            ? 'bg-[#F2F2F2] text-black'
                                            : 'text-black hover:bg-black/5'
                                        }
                                    `}
                                >
                                    {(item as any).customIcon === true ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#6b6b6b" viewBox="0 0 256 256" className="w-5 h-5 shrink-0">
                                            <path d="M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z" />
                                        </svg>
                                    ) : (item as any).customIcon === 'events' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#6b6b6b" viewBox="0 0 256 256" className="w-5 h-5 shrink-0">
                                            <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-68-76a12,12,0,1,1-12-12A12,12,0,0,1,140,132Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,132ZM96,172a12,12,0,1,1-12-12A12,12,0,0,1,96,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,140,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,172Z" />
                                        </svg>
                                    ) : (item as any).customIcon === 'finance' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#6b6b6b" viewBox="0 0 256 256" className="w-5 h-5 shrink-0">
                                            <path d="M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z" />
                                        </svg>
                                    ) : (item as any).customIcon === 'settings' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#6b6b6b" viewBox="0 0 256 256" className="w-5 h-5 shrink-0">
                                            <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm109.94-52.79a8,8,0,0,0-3.89-5.4l-29.83-17-.12-33.62a8,8,0,0,0-2.83-6.08,111.91,111.91,0,0,0-36.72-20.67,8,8,0,0,0-6.46.59L128,41.85,97.88,25a8,8,0,0,0-6.47-.6A112.1,112.1,0,0,0,54.73,45.15a8,8,0,0,0-2.83,6.07l-.15,33.65-29.83,17a8,8,0,0,0-3.89,5.4,106.47,106.47,0,0,0,0,41.56,8,8,0,0,0,3.89,5.4l29.83,17,.12,33.62a8,8,0,0,0,2.83,6.08,111.91,111.91,0,0,0,36.72,20.67,8,8,0,0,0,6.46-.59L128,214.15,158.12,231a7.91,7.91,0,0,0,3.9,1,8.09,8.09,0,0,0,2.57-.42,112.1,112.1,0,0,0,36.68-20.73,8,8,0,0,0,2.83-6.07l.15-33.65,29.83-17a8,8,0,0,0,3.89-5.4A106.47,106.47,0,0,0,237.94,107.21Zm-15,34.91-28.57,16.25a8,8,0,0,0-3,3c-.58,1-1.19,2.06-1.81,3.06a7.94,7.94,0,0,0-1.22,4.21l-.15,32.25a95.89,95.89,0,0,1-25.37,14.3L134,199.13a8,8,0,0,0-3.91-1h-.19c-1.21,0-2.43,0-3.64,0a8.08,8.08,0,0,0-4.1,1l-28.84,16.1A96,96,0,0,1,67.88,201l-.11-32.2a8,8,0,0,0-1.22-4.22c-.62-1-1.23-2-1.8-3.06a8.09,8.09,0,0,0-3-3.06l-28.6-16.29a90.49,90.49,0,0,1,0-28.26L61.67,97.63a8,8,0,0,0,3-3c.58-1,1.19-2.06,1.81-3.06a7.94,7.94,0,0,0,1.22-4.21l.15-32.25a95.89,95.89,0,0,1,25.37-14.3L122,56.87a8,8,0,0,0,4.1,1c1.21,0,2.43,0,3.64,0a8.08,8.08,0,0,0,4.1-1l28.84-16.1A96,96,0,0,1,188.12,55l.11,32.2a8,8,0,0,0,1.22,4.22c.62,1,1.23,2,1.8,3.06a8.09,8.09,0,0,0,3,3.06l28.6,16.29A90.49,90.49,0,0,1,222.9,142.12Z" />
                                        </svg>
                                    ) : (item as any).customIcon === 'orders' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#6b6b6b" viewBox="0 0 256 256" className="w-5 h-5 shrink-0">
                                            <path d="M27.2,126.4a8,8,0,0,0,11.2-1.6,52,52,0,0,1,83.2,0,8,8,0,0,0,11.2,1.59,7.73,7.73,0,0,0,1.59-1.59h0a52,52,0,0,1,83.2,0,8,8,0,0,0,12.8-9.61A67.85,67.85,0,0,0,203,93.51a40,40,0,1,0-53.94,0,67.27,67.27,0,0,0-21,14.31,67.27,67.27,0,0,0-21-14.31,40,40,0,1,0-53.94,0A67.88,67.88,0,0,0,25.6,115.2,8,8,0,0,0,27.2,126.4ZM176,40a24,24,0,1,1-24,24A24,24,0,0,1,176,40ZM80,40A24,24,0,1,1,56,64,24,24,0,0,1,80,40ZM203,197.51a40,40,0,1,0-53.94,0,67.27,67.27,0,0,0-21,14.31,67.27,67.27,0,0,0-21-14.31,40,40,0,1,0-53.94,0A67.88,67.88,0,0,0,25.6,219.2a8,8,0,1,0,12.8,9.6,52,52,0,0,1,83.2,0,8,8,0,0,0,11.2,1.59,7.73,7.73,0,0,0,1.59-1.59h0a52,52,0,0,1,83.2,0,8,8,0,0,0,12.8-9.61A67.85,67.85,0,0,0,203,197.51ZM80,144a24,24,0,1,1-24,24A24,24,0,0,1,80,144Zm96,0a24,24,0,1,1-24,24A24,24,0,0,1,176,144Z" />
                                        </svg>
                                    ) : (item as any).customIcon === 'help' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#6b6b6b" viewBox="0 0 256 256" className="w-5 h-5 shrink-0">
                                            <path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180Zm88-52A100,100,0,1,1,128,28,100.11,100.11,0,0,1,228,128Zm-16,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Zm-84-56c-23.16,0-42,17.91-42,40v4a8,8,0,0,0,16,0v-4c0-13.23,11.7-24,26-24s26,10.77,26,24-11.7,24-26,24a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,89.91,149.16,72,128,72Z" />
                                        </svg>
                                    ) : (
                                        <Icon style={{ color: '#6b6b6b' }} className="w-[18px] h-[18px]" />
                                    )}
                                    {item.name}
                                </Link>

                                {/* Sub-menu for Events */}
                                {item.name === 'Events' && isEventEdit && (
                                    <div className="ml-[22px] mt-1 relative flex flex-col gap-1 animate-in slide-in-from-top-2 fade-in duration-200">
                                        <div className="relative flex items-center pl-5 py-1">
                                            {/* Curved L-shape connector */}
                                            <div className="absolute left-0 top-[-2px] bottom-1/2 w-[11px] border-l-[1.5px] border-b-[1.5px] border-gray-200 rounded-bl-[10px]" />
                                            {/* Dot at the end of the line */}
                                            <div className="absolute left-[11px] top-1/2 -mt-[2px] w-1 h-1 shrink-0 bg-gray-300 rounded-full" />

                                            <div className="flex-1 min-w-0 flex items-center px-3 py-2 rounded-lg bg-[#F2F2F2] text-sm font-semibold text-black transition-all">
                                                <span className="truncate flex-1">{editingEventTitle || 'Loading...'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <div className="p-4">
                    <div className="flex items-center gap-2 bg-black/[0.04] rounded-full px-3 py-2">
                        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                <Users className="w-3.5 h-3.5 text-black/40" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-black truncate leading-tight">{displayName}</p>
                            <p className="text-[9px] text-black/60 font-sans truncate">@{displayName.toLowerCase().replace(/\s+/g, '')}</p>
                        </div>
                        <button
                            onClick={handleSignOut}
                            title="Sign Out"
                            className="shrink-0 text-black/30 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 ml-auto"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-[#FDFDFD] pt-16 lg:pt-0">
                <Routes>
                    <Route path="/" element={<DashboardHome displayName={displayName} />} />
                    <Route path="/events" element={<DashboardEvents />} />
                    <Route path="/events/:id/edit" element={<CreateEvent />} />
                    <Route path="/finance" element={<DashboardFinance />} />
                    <Route path="/orders" element={<DashboardOrders />} />
                </Routes>
            </main>
        </div>
    );
};
