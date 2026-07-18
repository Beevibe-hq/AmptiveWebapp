const guidelineSections = [
  {
    title: '1. Be Honest and Clear',
    body: [
      'Use accurate names, event details, ticket descriptions, prices, dates, venues, community information, and creator support details.',
      'Do not impersonate another person, organizer, creator, brand, venue, or Amptive representative.',
      'Do not create misleading listings, fake scarcity, false promotions, deceptive giveaways, or fraudulent support pages.',
    ],
  },
  {
    title: '2. Respect People',
    body: [
      'Treat attendees, organizers, creators, supporters, performers, and community members with respect.',
      'Do not post harassment, hate speech, threats, bullying, doxxing, unwanted sexual content, or content that targets people based on protected characteristics.',
      'Do not share someone else\'s personal information, private messages, payment details, ticket details, or identity documents without permission.',
    ],
  },
  {
    title: '3. Keep Events and Tickets Trustworthy',
    body: [
      'Organizers must provide accurate event descriptions, entry requirements, refund information, age restrictions, venue rules, and ticket names.',
      'Do not sell fake tickets, duplicate tickets, manipulated QR codes, or tickets for events you are not authorized to list.',
      'Do not use bots, scraping, scalping behavior, or checkout abuse to manipulate ticket availability or pricing.',
    ],
  },
  {
    title: '4. Protect Payments and Wallets',
    body: [
      'Use Amptive payment and wallet systems for platform transactions. Do not pressure users to bypass Amptive fees, checkout, support, or payout flows.',
      'Keep wallet PINs, security answers, bank information, and account credentials private.',
      'Report suspicious payment activity, wallet access, chargeback abuse, or fraud attempts to Amptive support.',
    ],
  },
  {
    title: '5. Share Content You Have Rights To Use',
    body: [
      'Only upload images, audio, event media, logos, artwork, blog content, and creator content that you own or have permission to use.',
      'Creators are responsible for rights, licences, releases, samples, performer consents, and metadata connected to their uploaded content.',
      'Amptive may remove content that appears to infringe intellectual property rights or violates platform rules.',
    ],
  },
  {
    title: '6. Build Healthy Communities',
    body: [
      'Community spaces should help people discover useful tasks, events, support opportunities, creator content, and shared interests.',
      'Do not spam communities with repeated promotions, unrelated links, scams, malware, phishing, or low-quality engagement bait.',
      'Community owners and organizers should moderate spaces fairly and respond to safety concerns when they arise.',
    ],
  },
  {
    title: '7. Follow the Law',
    body: [
      'Do not use Amptive for unlawful events, prohibited goods or services, money laundering, violence, exploitation, illegal gambling, or activity that violates Nigerian law or applicable local law.',
      'Organizers are responsible for permits, venue permissions, taxes, safety planning, crowd control, and other obligations connected to their events.',
      'Amptive may cooperate with regulators, payment partners, or law enforcement where legally required.',
    ],
  },
  {
    title: '8. Enforcement',
    body: [
      'Amptive may review, hide, remove, restrict, suspend, or terminate accounts, events, communities, tickets, content, support pages, or payouts that violate these guidelines.',
      'Enforcement may depend on severity, user history, legal risk, payment risk, and potential harm to the Amptive community.',
      'If you believe action was taken in error, contact support@getamptive.com with relevant details.',
    ],
  },
];

export default function CommunityGuidelines() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-16 px-6 sm:px-10 lg:px-14">
      <div>
        <header className="mb-4 md:mb-5 w-full flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
              Community Guidelines
            </h1>
            <p className="hidden sm:block text-[15px] text-black/40 font-sans mt-1">
              The standards for safer events, communities, ticketing, content, and support activity.
            </p>
          </div>
        </header>

        <section className="mt-8 grid gap-8 sm:gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit p-0 sm:rounded-xl sm:border sm:border-black/5 sm:bg-white sm:p-6 sm:shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35">
              Community
            </p>
            <p className="mt-2 text-lg font-bold text-black">Shared standards</p>
            <div className="mt-6 h-px bg-black/10 sm:bg-gray-100" />
            <p className="mt-6 text-[15px] leading-7 text-gray-600">
              These guidelines help keep Amptive useful and trustworthy for attendees, organizers, creators, supporters, and community members.
            </p>
          </aside>

          <div className="sm:rounded-xl sm:border sm:border-black/5 sm:bg-white sm:shadow-sm">
            <div className="border-b border-black/10 pb-6 sm:border-gray-100 sm:p-8">
              <h2 className="text-xl font-bold text-black">Overview</h2>
              <p className="mt-3 max-w-4xl text-[15px] leading-7 text-gray-600">
                Amptive is built around trust: real events, clear tickets, safe payments, original content, respectful communities, and transparent creator support. These guidelines explain what we expect from everyone using the platform.
              </p>
            </div>

            <div className="divide-y divide-black/10 sm:divide-gray-100">
              {guidelineSections.map((section) => (
                <article key={section.title} className="py-6 sm:p-8">
                  <h2 className="text-xl font-bold text-black">{section.title}</h2>
                  <div className="mt-3 max-w-4xl space-y-3">
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="text-[15px] leading-7 text-gray-600">
                        {paragraph}
                      </p>
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
