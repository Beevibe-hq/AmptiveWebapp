import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  HelpCircle,
  Mail,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';

const supportTopics = [
  {
    title: 'Tickets and Orders',
    description: 'Find purchased tickets, view check-in codes, transfer tickets, or report an order issue.',
    icon: Ticket,
    action: 'View My Tickets',
    to: '/my-tickets',
  },
  {
    title: 'Events and Organizers',
    description: 'Get help creating events, publishing tickets, managing event details, or checking attendees in.',
    icon: CalendarDays,
    action: 'Browse Events',
    to: '/explore',
  },
  {
    title: 'Wallet and Payouts',
    description: 'Set up your wallet, manage balance updates, fund your wallet, or troubleshoot withdrawals.',
    icon: Wallet,
    action: 'Open Finance',
    to: '/dashboard/finance',
  },
  {
    title: 'Creator Support Pages',
    description: 'Create or edit your support page for tips, gifts, subscriptions, and public creator profile details.',
    icon: Sparkles,
    action: 'Manage Support',
    to: '/profile/support-setup',
  },
  {
    title: 'Account and Profile',
    description: 'Update your profile, complete setup, manage login issues, or check profile visibility.',
    icon: UserRound,
    action: 'Open Profile',
    to: '/profile',
  },
  {
    title: 'Communities and Safety',
    description: 'Understand community rules, report harmful behavior, or learn what is allowed on Amptive.',
    icon: Users,
    action: 'Read Guidelines',
    to: '/community-guidelines',
  },
];

const resources = [
  {
    title: 'FAQs',
    description: 'Quick answers for events, tickets, wallets, creator support, and accounts.',
    to: '/faqs',
    icon: HelpCircle,
  },
  {
    title: 'Community Guidelines',
    description: 'The standards for safer events, communities, payments, and content.',
    to: '/community-guidelines',
    icon: ShieldCheck,
  },
  {
    title: 'Terms of Service',
    description: 'The rules governing use of the Amptive platform and related services.',
    to: '/terms-of-service',
    icon: ScrollText,
  },
];

const contactChecklist = [
  'Your Amptive account email',
  'Event name, order ID, ticket name, or support page link',
  'A short description of what happened',
  'Screenshots or error messages if available',
];

const Help = () => {
  const [query, setQuery] = useState('');

  const visibleTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return supportTopics;
    return supportTopics.filter(topic =>
      `${topic.title} ${topic.description} ${topic.action}`.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-16 px-6 sm:px-10 lg:px-14">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
              Help Center
            </h1>
            <p className="text-[15px] text-black/40 font-sans mt-1">
              Support for tickets, events, wallets, creator pages, communities, and accounts.
            </p>
          </div>
          <a
            href="mailto:support@getamptive.com"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
          >
            <Mail className="h-4 w-4" />
            Email Support
          </a>
        </header>

        <div className="relative mt-8">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/20" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for help with tickets, events, wallets…"
            className="w-full rounded-xl border border-black/10 bg-white py-3.5 pl-11 pr-4 text-[15px] text-black shadow-sm transition-colors placeholder:text-black/30 focus:border-black focus:outline-none"
          />
        </div>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35">
            Support areas
          </p>
          {visibleTopics.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTopics.map((topic) => {
                const Icon = topic.icon;

                return (
                  <Link
                    key={topic.title}
                    to={topic.to}
                    className="group flex flex-col rounded-xl border border-black/5 bg-white p-5 shadow-sm transition-colors hover:border-black/10"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-black">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-[16px] font-bold leading-tight text-black">{topic.title}</h2>
                    <p className="mt-2 flex-1 text-[14px] leading-6 text-gray-600">{topic.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-black">
                      {topic.action}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-black/5 bg-white p-8 text-center shadow-sm">
              <p className="text-[15px] font-semibold text-black">No matches for "{query}"</p>
              <p className="mt-2 text-[14px] leading-6 text-gray-600">
                Try the FAQs, or email us and we'll point you in the right direction.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/faqs"
                  className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
                >
                  Browse FAQs
                </Link>
                <a
                  href="mailto:support@getamptive.com"
                  className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-black/5"
                >
                  Email Support
                </a>
              </div>
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-xl border border-black/5 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35">Contact</p>
            <h2 className="mt-3 text-xl font-bold text-black">Need a person?</h2>
            <p className="mt-2 max-w-xl text-[15px] leading-7 text-gray-600">
              Email support with enough details for the team to find your account, order, event, or
              wallet. Including these speeds things up:
            </p>
            <ul className="mt-5 space-y-3">
              {contactChecklist.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-black/60" />
                  <p className="text-[15px] leading-6 text-gray-600">{item}</p>
                </li>
              ))}
            </ul>
            <a
              href="mailto:support@getamptive.com"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
            >
              <Mail className="h-4 w-4" />
              support@getamptive.com
            </a>
          </div>

          <div className="flex flex-col gap-4">
            {resources.map((resource) => {
              const Icon = resource.icon;

              return (
                <Link
                  key={resource.title}
                  to={resource.to}
                  className="group flex flex-1 items-start gap-4 rounded-xl border border-black/5 bg-white p-5 shadow-sm transition-colors hover:border-black/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 text-black">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-black">
                      {resource.title}
                      <ArrowRight className="h-3.5 w-3.5 text-black/30 transition-transform group-hover:translate-x-0.5" />
                    </h3>
                    <p className="mt-1 text-[14px] leading-6 text-gray-600">{resource.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <p className="mt-10 text-center text-[13px] text-black/30">
          Amptive Support · We typically reply within one business day.
        </p>
      </div>
    </div>
  );
};

export default Help;
