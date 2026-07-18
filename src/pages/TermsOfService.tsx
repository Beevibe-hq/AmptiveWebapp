const termsSections = [
  {
    title: '1. Definitions',
    body: [
      '"Content" means audio files, recordings, podcasts, images, event listings, and other material uploaded, streamed, or distributed via the Platform.',
      '"Creator" means a User who uploads or monetizes audio Content on the Platform.',
      '"Organizer" means a User who creates and manages an event listing for ticket sales via the Platform.',
      '"Attendee" means a User who purchases a ticket to an event listed on the Platform.',
      '"Fees" means all charges payable to Amptive, including service charges, transaction fees, and commission on ticket sales or Content monetization.',
    ],
  },
  {
    title: '2. Eligibility',
    body: [
      'You must be at least 18 years old, or the age of legal majority in your jurisdiction, and possess the legal capacity to enter into a binding contract to use the Platform. By registering, you represent and warrant that you meet this requirement.',
      'Amptive reserves the right to request identity verification, particularly for Creators and Organizers receiving payouts.',
    ],
  },
  {
    title: '3. Description of Services',
    body: [
      '3.1 E-Ticketing. Amptive enables Organizers to create, list, and sell tickets to events, and enables Attendees to purchase and manage such tickets electronically.',
      '3.2 Audio Content Monetization. Amptive enables Creators to upload, distribute, and monetize audio Content through subscriptions, pay-per-listen, tips, or other monetization models made available on the Platform from time to time.',
      '3.3 Events Ecosystem. Amptive provides supporting tools for event promotion, attendee management, and related entertainment gig services connecting Organizers, Creators, performers, and Attendees.',
      'Amptive acts as an intermediary technology platform and, save as expressly stated, is not the organizer of any event nor the creator of any Content listed by third parties.',
    ],
  },
  {
    title: '4. Account Registration and Security',
    body: [
      'You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must notify Amptive immediately of any unauthorized use. Amptive is not liable for losses arising from your failure to safeguard your account.',
    ],
  },
  {
    title: '5. Tickets, Payments, and Refunds',
    body: [
      '5.1 Ticket Sales. All ticket sales are processed through Amptive\'s designated payment channels. Ticket prices, availability, and terms of entry are set by the Organizer, subject to Amptive\'s platform rules.',
      '5.2 Fees. Amptive charges a service fee on each ticket transaction and/or Content monetization transaction, disclosed to the User prior to checkout.',
      '5.3 Refunds and Cancellations. Refunds are governed by the specific Organizer\'s stated refund policy for each event, subject to applicable Nigerian consumer protection law. Where an event is cancelled or materially altered by the Organizer, Amptive will facilitate refunds in accordance with its refund protocol, less any non-recoverable transaction charges.',
      '5.4 Payouts to Organizers and Creators. Payouts are subject to identity verification, applicable withholding tax, and Amptive\'s payout schedule, and may be suspended where fraud, chargeback risk, or a breach of these Terms is suspected.',
    ],
  },
  {
    title: '6. Content Monetization Terms',
    body: [
      '6.1 License Grant. By uploading Content, Creators grant Amptive a non-exclusive, worldwide, royalty-bearing (as applicable) licence to host, reproduce, distribute, and publicly perform the Content solely for the purpose of operating and promoting the Platform.',
      '6.2 Ownership and Rights Warranty. Creators warrant that they own or have obtained all necessary rights, licences, and consents, including third-party rights, sync rights, and performer consents, in respect of uploaded Content, and that such Content does not infringe any third party\'s intellectual property or other rights.',
      '6.3 Revenue Share. Monetization revenue share arrangements between Amptive and Creators will be set out in a separate Creator Agreement or in-app disclosure and are incorporated into these Terms by reference.',
      '6.4 Takedown. Amptive may remove Content that infringes third-party rights, violates these Terms, or is subject to a valid takedown notice.',
    ],
  },
  {
    title: '7. User Conduct',
    body: [
      'You agree not to upload Content that is unlawful, defamatory, obscene, or infringes intellectual property or privacy rights.',
      'You agree not to use the Platform for fraudulent ticketing, ticket touting/scalping in violation of applicable law, or bot-driven purchasing.',
      'You agree not to circumvent Amptive\'s payment systems to avoid applicable fees.',
      'You agree not to interfere with the security, integrity, or performance of the Platform.',
    ],
  },
  {
    title: '8. Intellectual Property',
    body: [
      'All Platform software, trademarks, logos, and proprietary technology are owned by or licensed to Amptive. Nothing in these Terms transfers any such intellectual property to you, save for the limited licence to use the Platform for its intended purpose.',
    ],
  },
  {
    title: '9. Third-Party Services',
    body: [
      'The Platform may integrate third-party payment processors, venues, or service providers. Amptive is not responsible for the acts, omissions, or policies of such third parties, and your use of third-party services may be subject to their own terms.',
    ],
  },
  {
    title: '10. Disclaimers and Limitation of Liability',
    body: [
      'The Platform is provided on an "as is" and "as available" basis. To the fullest extent permitted under Nigerian law, Amptive disclaims all warranties, whether express or implied, and shall not be liable for indirect, incidental, or consequential losses, including loss of revenue arising from event cancellation, Content removal, or platform downtime, except in cases of gross negligence, wilful misconduct, or fraud.',
    ],
  },
  {
    title: '11. Indemnification',
    body: [
      'You agree to indemnify and hold Amptive, its officers, employees, and agents harmless from any claims, damages, or expenses, including reasonable legal fees, arising from your breach of these Terms, your Content, or your use of the Platform.',
    ],
  },
  {
    title: '12. Suspension and Termination',
    body: [
      'Amptive may suspend or terminate your account, with or without notice, where you breach these Terms, engage in fraudulent activity, or where required by law or regulatory directive. You may close your account at any time, subject to settlement of outstanding obligations.',
    ],
  },
  {
    title: '13. Governing Law and Dispute Resolution',
    body: [
      'These Terms are governed by the laws of the Federal Republic of Nigeria. Any dispute arising from these Terms shall first be referred to good-faith negotiation, failing which it shall be resolved by arbitration in Lagos, Nigeria, under the Arbitration and Mediation Act 2023, or, at Amptive\'s election, before a court of competent jurisdiction in Nigeria.',
    ],
  },
  {
    title: '14. Amendments',
    body: [
      'Amptive may update these Terms from time to time. Material changes will be notified via the Platform or email, and continued use after such notice constitutes acceptance of the revised Terms.',
    ],
  },
  {
    title: '15. Contact',
    body: [
      'Amptive Technologies Limited, RC 9531457.',
      'Email: support@getamptive.com.',
    ],
  },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-16 px-6 sm:px-10 lg:px-14">
      <div>
        <header className="mb-4 md:mb-5 w-full flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
              Terms of Service
            </h1>
            <p className="hidden sm:block text-[15px] text-black/40 font-sans mt-1">
              Governing use of the Amptive platform, mobile applications, and related services.
            </p>
          </div>
        </header>

        <section className="mt-8 grid gap-8 sm:gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit p-0 sm:rounded-xl sm:border sm:border-black/5 sm:bg-white sm:p-6 sm:shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35">
              Last updated
            </p>
            <p className="mt-2 text-lg font-bold text-black">2 June 2026</p>
            <div className="mt-6 h-px bg-black/10 sm:bg-gray-100" />
            <p className="mt-6 text-[15px] leading-7 text-gray-600">
              These Terms constitute a legally binding agreement between you and Amptive Technologies Limited (RC 9531457).
            </p>
          </aside>

          <div className="sm:rounded-xl sm:border sm:border-black/5 sm:bg-white sm:shadow-sm">
            <div className="border-b border-black/10 pb-6 sm:border-gray-100 sm:p-8">
              <h2 className="text-xl font-bold text-black">Overview</h2>
              <p className="mt-3 max-w-4xl text-[15px] leading-7 text-gray-600">
                These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("User", "you") and Amptive Technologies Limited (RC 9531457), a company duly incorporated under the laws of the Federal Republic of Nigeria ("Amptive", "we", "us", "our"), governing your access to and use of the Amptive website, mobile application, e-ticketing services, audio content monetization services, and the broader event management and entertainment ecosystem (collectively, the "Platform" or "Services").
              </p>
              <p className="mt-3 max-w-4xl text-[15px] leading-7 text-gray-600">
                By creating an account, purchasing a ticket, uploading content, or otherwise using the Platform, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, you must not access or use the Platform.
              </p>
            </div>

            <div className="divide-y divide-black/10 sm:divide-gray-100">
              {termsSections.map((section) => (
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
