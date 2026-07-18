const privacySections = [
  {
    title: '1. Scope and Data Controller',
    body: [
      'Amptive is the Data Controller in respect of personal data processed through the Platform. This Policy applies to Attendees, Organizers, Creators, and other visitors to the Platform.',
    ],
  },
  {
    title: '2. Categories of Personal Data We Collect',
    body: [
      'Identity data: full name, date of birth, government-issued ID for payout and KYC verification of Organizers and Creators.',
      'Contact data: email address, phone number, and billing address.',
      'Payment data: card details or bank account information, processed via licensed payment service providers.',
      'Transaction data: ticket purchases, Content uploads, streaming/listening activity, and payout history.',
      'Technical data: IP address, device identifiers, browser type, and usage data collected via cookies and analytics tools.',
      'Content data: audio files, metadata, and associated rights information uploaded by Creators.',
    ],
  },
  {
    title: '3. Legal Basis for Processing',
    body: [
      'In accordance with section 25 of the NDPA, we process personal data on the following lawful bases:',
      'Performance of a contract - to process ticket purchases, payouts, and account services.',
      'Consent - for marketing communications and optional cookies/tracking.',
      'Legal obligation - for tax, AML, and regulatory reporting.',
      'Legitimate interest - for fraud prevention, Platform security, and service improvement, balanced against your rights.',
    ],
  },
  {
    title: '4. Purpose of Processing',
    body: [
      'We use personal data to create and manage accounts; process ticket sales and Content monetization payouts; verify identity and prevent fraud; provide customer support; send transactional and, where consented, marketing communications; comply with legal and regulatory obligations; and improve Platform functionality through analytics.',
    ],
  },
  {
    title: '5. Disclosure of Personal Data',
    body: [
      'We may share personal data with licensed payment processors and financial institutions; event Organizers, limited to Attendee data reasonably necessary for event administration; cloud hosting and analytics service providers acting as data processors under contract; regulatory or law enforcement authorities where legally required; and professional advisers in connection with a corporate transaction, subject to confidentiality obligations.',
      'Amptive does not sell personal data to third parties.',
    ],
  },
  {
    title: '6. Cross-Border Data Transfer',
    body: [
      'Where personal data is transferred outside Nigeria, for example to a cloud service provider, such transfer will only occur where the recipient jurisdiction has an adequate level of data protection as determined by the NDPC, or where appropriate safeguards, such as standard contractual clauses, and where required, NDPC authorization or notification, have been put in place, in line with sections 41-43 of the NDPA.',
    ],
  },
  {
    title: '7. Data Retention',
    body: [
      'We retain personal data only for as long as reasonably necessary to fulfil the purposes outlined in this Policy, to comply with tax, AML, and other statutory retention obligations under Nigerian law, or to resolve disputes, after which it is securely deleted or anonymized.',
    ],
  },
  {
    title: '8. Your Rights as a Data Subject',
    body: [
      'Under the NDPA, you have the right to be informed of the processing of your personal data; access your personal data; request rectification of inaccurate data; request erasure or restriction of processing, subject to legal exceptions; object to processing based on legitimate interest or for direct marketing; data portability; and lodge a complaint with the NDPC.',
      'Requests may be submitted to our Data Protection contact below and will be addressed within the statutory timeframe.',
    ],
  },
  {
    title: '9. Data Security',
    body: [
      'We implement appropriate technical and organizational measures, including encryption of payment data, access controls, and regular security assessments, to protect personal data against unauthorized access, loss, or misuse, in line with the NDPA\'s data security requirements.',
    ],
  },
  {
    title: '10. Cookies and Similar Technologies',
    body: [
      'The Platform uses cookies and similar technologies for authentication, analytics, and, subject to consent, personalized advertising. You may manage cookie preferences through your browser or in-app settings.',
    ],
  },
  {
    title: '11. Children\'s Privacy',
    body: [
      'The Platform is not directed at children under 18. We do not knowingly collect personal data from children without verifiable parental or guardian consent. Any such data discovered will be deleted promptly.',
    ],
  },
  {
    title: '12. Changes to This Policy',
    body: [
      'We may update this Privacy Policy periodically. Material changes will be communicated via the Platform or by email, and the "Last Updated" date will reflect the most recent revision.',
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-16 px-6 sm:px-10 lg:px-14">
      <div>
        <header className="mb-4 md:mb-5 w-full flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black mb-1 leading-tight">
              Privacy Policy
            </h1>
            <p className="hidden sm:block text-[15px] text-black/40 font-sans mt-1">
              Prepared in accordance with the Nigeria Data Protection Act 2023 and NDPC GAID.
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
              Amptive Technologies Limited (RC 9531457) is committed to protecting the personal data of Users of its e-ticketing, audio content monetization, and event management Platform.
            </p>
          </aside>

          <div className="sm:rounded-xl sm:border sm:border-black/5 sm:bg-white sm:shadow-sm">
            <div className="border-b border-black/10 pb-6 sm:border-gray-100 sm:p-8">
              <h2 className="text-xl font-bold text-black">Overview</h2>
              <p className="mt-3 max-w-4xl text-[15px] leading-7 text-gray-600">
                This Privacy Policy is prepared in accordance with the Nigeria Data Protection Act 2023 (NDPA) and the NDPC General Application and Implementation Directive (GAID). Amptive Technologies Limited ("Amptive", "we", "us") is committed to protecting personal data in compliance with the NDPA and applicable subsidiary regulations issued by the Nigeria Data Protection Commission (NDPC).
              </p>
            </div>

            <div className="divide-y divide-black/10 sm:divide-gray-100">
              {privacySections.map((section) => (
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
