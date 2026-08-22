import Link from "next/link";
import { Check } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between">
      {/* Top Header Menu */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-xs" />
            <span className="font-extrabold text-sm tracking-tight">Digital Growth Studio</span>
          </Link>
          <nav className="flex items-center flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-655">
            <Link href="/privacy" className="hover:text-blue-600 transition">Privacy Policy</Link>
            <Link href="/terms" className="text-blue-600 transition">Terms of Service</Link>
            <Link href="/security" className="hover:text-blue-600 transition">Security</Link>
            <Link href="/meta-integration" className="hover:text-blue-600 transition">Meta Integration</Link>
            <Link href="/data-deletion" className="hover:text-blue-600 transition">Data Deletion</Link>
          </nav>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 sm:p-10 space-y-8">
          <div className="border-b border-slate-100 pb-6 text-center sm:text-left">
            <h1 className="text-3xl font-extrabold text-slate-900">Digital Growth Studio — Terms of Service</h1>
            <p className="text-xs text-slate-400 mt-2 font-semibold">Last Updated: August 20, 2026</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">1. Agreement</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of Digital Growth Studio (&quot;Digital Growth Studio&quot;, &quot;DGS&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              By creating an account, accessing, or using Digital Growth Studio, you agree to these Terms. If you do not agree to these Terms, you must not use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">2. Description of the Service</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio is a software platform designed to help businesses, advertisers, marketers, and agencies analyse and optimize advertising campaigns.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              Features may include:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Advertising dashboards</li>
              <li>Campaign analytics</li>
              <li>Performance reporting</li>
              <li>Historical performance analysis</li>
              <li>AI-powered recommendations</li>
              <li>Campaign health scoring</li>
              <li>Creative analysis</li>
              <li>Performance alerts</li>
              <li>Budget recommendations</li>
              <li>Advertising optimization</li>
              <li>Approved campaign modifications</li>
              <li>Account management</li>
              <li>Reporting</li>
              <li>Other marketing optimization features</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600">
              Features may change, be added, or be removed over time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">3. Eligibility</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You must:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Be legally capable of entering into a binding agreement.</li>
              <li>Provide accurate account information.</li>
              <li>Have authority to use the advertising accounts you connect.</li>
              <li>Have authority to authorize Digital Growth Studio to access those accounts.</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600">
              If you use Digital Growth Studio on behalf of a company or client, you represent that you have authority to act on behalf of that company or client.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">4. Account Registration</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Maintaining accurate account information</li>
              <li>Protecting your login credentials</li>
              <li>Maintaining account security</li>
              <li>Restricting unauthorized access</li>
              <li>Informing us of unauthorized account activity</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600">
              You are responsible for activities performed through your account unless caused by our failure to maintain reasonable security measures.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">5. Meta Integration</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio may integrate with Meta advertising services. By connecting your Meta account, you authorize Digital Growth Studio to access the information and functionality permitted by the permissions you grant.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              You represent that:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>You have authorization to connect the advertising account.</li>
              <li>You have authority to grant the requested permissions.</li>
              <li>You will comply with Meta&apos;s applicable terms and policies.</li>
              <li>You will not use Digital Growth Studio to violate Meta&apos;s policies.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">6. Advertising Account Authorization</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Where Digital Growth Studio provides write functionality, you understand that certain actions may modify your advertising account.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              These actions may include, where supported:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Pausing ads</li>
              <li>Activating ads</li>
              <li>Adjusting budgets</li>
              <li>Modifying supported campaign settings</li>
              <li>Modifying supported ad set settings</li>
              <li>Other advertising configuration changes</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600">
              You remain responsible for ensuring that the connected advertising account is used appropriately.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">7. AI Recommendations</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio may use artificial intelligence to analyse advertising performance and generate recommendations.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              AI recommendations may be based on:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Historical performance</li>
              <li>Campaign performance</li>
              <li>Advertising metrics</li>
              <li>Statistical patterns</li>
              <li>Rules</li>
              <li>Machine-learning models</li>
              <li>User configuration</li>
              <li>Industry or account benchmarks where available</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              AI recommendations are decision-support tools. They are not guarantees of advertising performance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">8. No Guarantee of Advertising Results</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio does not guarantee:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Increased sales or leads</li>
              <li>Lower CPL or CPA</li>
              <li>Increased ROAS</li>
              <li>Lower advertising costs</li>
              <li>Increased conversion rates</li>
              <li>Improved campaign performance</li>
              <li>Any particular financial outcome</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              Advertising performance depends on factors outside our control, including market conditions, competition, creative quality, landing pages, product quality, pricing, audience behavior, tracking accuracy, Meta&apos;s delivery systems, auction conditions, and platform changes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">9. User Approval and Automated Actions</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Depending on the plan and configuration, Digital Growth Studio may provide recommendations that users can approve before execution.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Where an action is approved by the user, the user authorizes Digital Growth Studio to attempt to execute the corresponding action through the applicable advertising platform. Users are responsible for reviewing recommendations before approving them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">10. Responsibility for Advertising Decisions</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You are ultimately responsible for your advertising campaigns. Before approving an optimization, you should review the recommendation, supporting evidence, expected impact, budget implications, campaign configuration, targeting, creatives, and business objectives.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              Digital Growth Studio is not responsible for business losses resulting from a user&apos;s decision to accept or reject an AI recommendation, except where liability cannot legally be excluded.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">11. Third-Party Platforms</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio may depend on third-party services including Meta, payment processors, authentication providers, cloud hosting, databases, AI processing interfaces, and infrastructure/analytics engines.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Third-party services may experience downtime, API changes, rate limits, permission updates, or service interruptions. We are not responsible for failures caused solely by third-party services outside our reasonable control.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">12. Meta API Changes</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Meta may modify APIs, permissions, policies, account structures, and data availability. Such changes may cause features to stop working or require modifications to Digital Growth Studio. We will make reasonable efforts to maintain compatibility but cannot guarantee uninterrupted functionality.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">13. Subscription Plans</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Certain Digital Growth Studio features may require a paid subscription. Plans may differ in the number of advertising accounts, sync frequency, AI optimization campaigns, historical data thresholds, team seats, and analytics tools. Plan limits are displayed at the time of purchase.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">14. Trials</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Where a free trial is offered, it begins according to the conditions displayed at signup. Trials may include usage limits and do not guarantee continued access to paid features after the trial ends. If payment information is required for a trial, the billing terms will be disclosed before activation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">15. Billing</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Paid subscriptions are billed monthly, annually, or according to the billing cycle selected at purchase. You authorize our payment provider to charge applicable fees. Unless otherwise stated, subscription fees are non-refundable once the billing period has started, and failed payments may result in suspended access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">16. Cancellation</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You may cancel your subscription at any time within your account settings. Cancellation prevents future renewal. Unless otherwise specified, cancellation does not automatically entitle you to a refund for the current billing period.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">17. Refunds</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Refund eligibility is governed by the refund policy displayed at purchase and applicable law. Nothing in these Terms limits mandatory consumer rights that cannot legally be waived.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">18. User Data</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You retain ownership of information that you provide to Digital Growth Studio. You grant us the limited rights necessary to store, process, and analyse your data to provide the services, generate reports/recommendations, and maintain security. We do not acquire ownership of your advertising account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">19. Meta Data Rules</h2>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              You agree not to use Digital Growth Studio to:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Circumvent Meta restrictions</li>
              <li>Collect unauthorized data</li>
              <li>Access accounts without authorization</li>
              <li>Violate Meta&apos;s terms and policies</li>
              <li>Misuse advertising data</li>
              <li>Share restricted data improperly</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">20. Prohibited Activities</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You may not use Digital Growth Studio to violate applicable law, circumvent security controls, reverse engineer the platform, upload malicious code, abuse APIs, circumvent plan limits, resell the service without authorization, or engage in fraudulent activities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">21. Intellectual Property</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio and its associated software, design, branding, code, interfaces, documentation, algorithms, and technology are owned by or licensed to Digital Growth Studio. Except as expressly permitted, you may not copy, modify, reverse engineer, or redistribute our proprietary assets.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">22. AI and Software Limitations</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio may occasionally produce incorrect recommendations, incomplete analyses, delayed data synchronizations, or false positive warnings. You should not rely exclusively on AI-generated recommendations for material business decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">23. Service Availability</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We aim to provide reliable service but do not guarantee uninterrupted availability. Service may be unavailable due to maintenance, updates, security incidents, infrastructure failures, or third-party outages.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">24. Suspension and Termination</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We may suspend or terminate accounts if you violate these Terms, violate applicable law, attempt unauthorized access, fail to pay subscription charges, or if continued service presents legal or security risks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">25. Effect of Termination</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              After termination, your access to the service will be disabled, connected Meta accounts will be disconnected, billing will stop, and your data will be handled according to our Privacy Policy and Data Deletion Instructions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">26. Disclaimers</h2>
            <p className="text-sm leading-relaxed text-slate-600 italic">
              To the maximum extent permitted by law, Digital Growth Studio is provided on an &quot;as available&quot; and &quot;as is&quot; basis. We do not guarantee that the service will always be available, that AI recommendations will be accurate, or that your advertising results will improve.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">27. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              To the maximum extent permitted by applicable law, Digital Growth Studio will not be liable for indirect, incidental, special, consequential, or punitive damages (including lost profits, lost revenue, lost ad spend, or data loss).
            </p>
            <p className="text-sm leading-relaxed text-slate-650 mt-1">
              For paid subscriptions, our aggregate liability is limited to the subscription amount paid to Digital Growth Studio during the three-month period immediately preceding the event giving rise to liability.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">28. Indemnification</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              To the extent permitted by law, you agree to indemnify and hold Digital Growth Studio harmless from claims arising from your misuse of the service, your violation of these Terms, third-party terms, or your unauthorized access to advertising accounts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">29. Changes to the Service</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We may add or remove features, modify functionality, adjust subscription options, or modify third-party integrations at any time. Material changes will be communicated where required.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">30. Changes to These Terms</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We may update these Terms from time to time. The updated version will be published with a revised &quot;Last Updated&quot; date. Continued use of Digital Growth Studio after the effective date constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">31. Governing Law</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              These Terms shall be governed by the laws of India, and any disputes will be subject to the courts located in Maharashtra, India.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">32. Contact</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              For questions regarding these Terms:
            </p>
            <p className="text-sm leading-relaxed text-slate-800">
              <strong>Digital Growth Studio Email:</strong> <a href="mailto:digitalgrowthstudioteam@gmail.com" className="text-blue-600 hover:underline">digitalgrowthstudioteam@gmail.com</a><br />
              <strong>Website:</strong> <a href="https://www.digitalgrowthstudio.in/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.digitalgrowthstudio.in</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
