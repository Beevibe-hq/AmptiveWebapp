const faqSections = [
  {
    title: 'Accounts and Profiles',
    items: [
      {
        question: 'What is Amptive?',
        answer: 'Amptive is a platform for discovering events, buying tickets, managing event pages, creating communities, receiving creator support, and monetizing content or experiences.',
      },
      {
        question: 'Do I need an account to use Amptive?',
        answer: 'You can browse some public pages without an account, but you need an account to buy tickets, create events, manage a profile, join certain communities, set up a wallet, or create a support page.',
      },
      {
        question: 'Can I edit my profile after signing up?',
        answer: 'Yes. You can update your profile details, images, social links, and support page preferences from your profile or dashboard where those options are available.',
      },
    ],
  },
  {
    title: 'Events and Tickets',
    items: [
      {
        question: 'How do I find events?',
        answer: 'Use Explore, Browse Events, or the homepage search to discover public events. Event pages show the event details, ticket options, organizer information, and checkout flow.',
      },
      {
        question: 'Where do my purchased tickets appear?',
        answer: 'Purchased tickets appear on the My Tickets page. You can view upcoming and past tickets, ticket details, and check-in codes from there.',
      },
      {
        question: 'Who controls ticket prices and availability?',
        answer: 'Organizers set ticket prices, ticket names, quantities, event dates, refund rules, and availability, subject to Amptive platform rules.',
      },
      {
        question: 'What happens if an event is cancelled?',
        answer: 'Refund handling depends on the organizer refund policy and Amptive refund process. If an event is cancelled or materially changed, Amptive may help facilitate refunds according to the applicable policy.',
      },
    ],
  },
  {
    title: 'Wallets, Payments, and Payouts',
    items: [
      {
        question: 'Why do I need to set up a wallet?',
        answer: 'A wallet is required for receiving payments from events, gifts, subscriptions, creator support, and other payout-related features.',
      },
      {
        question: 'What do I need to set up my wallet?',
        answer: 'You may be asked to create a secure transaction PIN, choose a security question, and provide a case-sensitive answer used for withdrawal verification.',
      },
      {
        question: 'Can I fund or withdraw from my wallet?',
        answer: 'Where available, wallet funding and withdrawal actions use Amptive payment endpoints and may require verification, wallet PIN confirmation, security question answers, and compliance checks.',
      },
      {
        question: 'Why does my balance show zero?',
        answer: 'If your wallet has not been created yet, the balance endpoint may return a wallet-not-found response. Setting up the wallet allows Amptive to show balance updates correctly.',
      },
    ],
  },
  {
    title: 'Creators and Support Pages',
    items: [
      {
        question: 'What is a support page?',
        answer: 'A support page lets creators receive payments such as tips, gifts, or subscriptions from supporters through a public creator profile.',
      },
      {
        question: 'Why do I need a professional profile?',
        answer: 'A professional profile stores the public and payment-related details needed to publish a creator support page and receive support activity.',
      },
      {
        question: 'Can I edit my support page after creating it?',
        answer: 'Yes. After setup, you can return to edit supported page details, profile information, images, and public links where those settings are available.',
      },
    ],
  },
  {
    title: 'Communities and Safety',
    items: [
      {
        question: 'What are communities for?',
        answer: 'Communities help users discover shared activities, tasks, events, and creator-led spaces around interests or experiences.',
      },
      {
        question: 'What content is not allowed?',
        answer: 'Do not post unlawful, abusive, fraudulent, hateful, misleading, sexually exploitative, privacy-invasive, or intellectual-property-infringing content.',
      },
      {
        question: 'How do I get help?',
        answer: 'Use the Help Center or contact Amptive support at support@getamptive.com for account, payment, ticket, or safety issues.',
      },
    ],
  },
];

export default function FAQs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-16 px-6 sm:px-10 lg:px-14">
      <div>
        <header className="mb-4 md:mb-5 w-full flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
              FAQs
            </h1>
            <p className="hidden sm:block text-[15px] text-black/40 font-sans mt-1">
              Answers for events, tickets, wallets, communities, creators, and support pages.
            </p>
          </div>
        </header>

        <section className="mt-8 grid gap-8 sm:gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit p-0 sm:rounded-xl sm:border sm:border-black/5 sm:bg-white sm:p-6 sm:shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35">
              Help
            </p>
            <p className="mt-2 text-lg font-bold text-black">Quick answers</p>
            <div className="mt-6 h-px bg-black/10 sm:bg-gray-100" />
            <p className="mt-6 text-[15px] leading-7 text-gray-600">
              Start here for common questions about using Amptive as an attendee, organizer, creator, or supporter.
            </p>
          </aside>

          <div className="sm:rounded-xl sm:border sm:border-black/5 sm:bg-white sm:shadow-sm">
            <div className="border-b border-black/10 pb-6 sm:border-gray-100 sm:p-8">
              <h2 className="text-xl font-bold text-black">Overview</h2>
              <p className="mt-3 max-w-4xl text-[15px] leading-7 text-gray-600">
                These FAQs explain the main Amptive workflows across event discovery, ticket checkout, dashboards, wallets, professional profiles, creator support pages, communities, and safety.
              </p>
            </div>

            <div className="divide-y divide-black/10 sm:divide-gray-100">
              {faqSections.map((section) => (
                <article key={section.title} className="py-6 sm:p-8">
                  <h2 className="text-xl font-bold text-black">{section.title}</h2>
                  <div className="mt-5 max-w-4xl space-y-6">
                    {section.items.map((item) => (
                      <div key={item.question}>
                        <h3 className="text-[15px] font-bold text-black">{item.question}</h3>
                        <p className="mt-2 text-[15px] leading-7 text-gray-600">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
