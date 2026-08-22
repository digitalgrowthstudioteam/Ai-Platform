import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between">
      {/* Top Header Menu */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-xs" />
            <span className="font-extrabold text-sm tracking-tight">Digital Growth Studio</span>
          </Link>
          <nav className="flex items-center flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-650">
            <Link href="/privacy" className="text-blue-600 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-blue-600 transition">Terms of Service</Link>
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
            <h1 className="text-3xl font-extrabold text-slate-900">Digital Growth Studio — Privacy Policy</h1>
            <p className="text-xs text-slate-400 mt-2 font-semibold">Last Updated: August 20, 2026</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">1. Introduction</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio (&quot;Digital Growth Studio&quot;, &quot;DGS&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides software and AI-powered advertising optimization tools that help businesses, advertisers, marketers, and agencies analyse and optimize their digital advertising campaigns.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              This Privacy Policy explains how we collect, use, store, process, disclose, and protect information when you:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Visit our website</li>
              <li>Create a Digital Growth Studio account</li>
              <li>Use our application</li>
              <li>Connect a Meta advertising account</li>
              <li>Use our campaign analytics and AI optimization features</li>
              <li>Authorize Digital Growth Studio to access or modify advertising data</li>
              <li>Contact our support team</li>
              <li>Subscribe to or purchase our services</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600">
              By using Digital Growth Studio, you acknowledge the practices described in this Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">2. Information We Collect</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We collect information necessary to provide and improve our services.
            </p>

            <h3 className="text-sm font-bold text-slate-800 mt-4">2.1 Account Information</h3>
            <p className="text-sm leading-relaxed text-slate-600">
              When you create an account, we may collect:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number, where provided</li>
              <li>Password or authentication information</li>
              <li>Company/business name</li>
              <li>Account role</li>
              <li>Profile information</li>
              <li>Billing information</li>
              <li>Subscription information</li>
              <li>Account preferences</li>
              <li>Communication preferences</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              If authentication is provided through a third-party authentication provider, such as Firebase Authentication, authentication information may be processed by that provider according to its applicable terms and privacy policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">3. Meta Advertising Data</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio allows users to connect Meta advertising accounts. When you authorize access to your Meta account, we may receive information made available through Meta&apos;s APIs and based on the permissions you authorize.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Depending on the permissions approved for your application, this may include:
            </p>

            <div className="space-y-4 pl-4 pt-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Advertising account information</h4>
                <ul className="list-disc pl-6 text-xs text-slate-500 space-y-1 mt-1">
                  <li>Meta Ad Account ID</li>
                  <li>Ad Account name</li>
                  <li>Account status</li>
                  <li>Currency</li>
                  <li>Time zone</li>
                  <li>Account-level configuration information</li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Campaign information</h4>
                <ul className="list-disc pl-6 text-xs text-slate-500 space-y-1 mt-1">
                  <li>Campaign ID</li>
                  <li>Campaign name</li>
                  <li>Campaign status</li>
                  <li>Campaign objective</li>
                  <li>Campaign budget</li>
                  <li>Campaign configuration</li>
                  <li>Campaign performance metrics</li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ad Set information</h4>
                <ul className="list-disc pl-6 text-xs text-slate-500 space-y-1 mt-1">
                  <li>Ad Set ID</li>
                  <li>Ad Set name</li>
                  <li>Ad Set status</li>
                  <li>Budget</li>
                  <li>Schedule</li>
                  <li>Optimization settings</li>
                  <li>Bid-related information</li>
                  <li>Targeting-related information where made available and authorized</li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ad information</h4>
                <ul className="list-disc pl-6 text-xs text-slate-500 space-y-1 mt-1">
                  <li>Ad ID</li>
                  <li>Ad name</li>
                  <li>Ad status</li>
                  <li>Creative identifiers</li>
                  <li>Performance information</li>
                  <li>Delivery information</li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Performance information</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Depending on available API permissions and configuration, this may include:
                </p>
                <ul className="list-disc pl-6 text-xs text-slate-500 space-y-1 mt-1">
                  <li>Impressions</li>
                  <li>Reach</li>
                  <li>Clicks</li>
                  <li>Link clicks</li>
                  <li>Spend</li>
                  <li>CPM</li>
                  <li>CPC</li>
                  <li>CTR</li>
                  <li>Conversions</li>
                  <li>Cost per conversion</li>
                  <li>Leads</li>
                  <li>Cost per lead</li>
                  <li>Revenue</li>
                  <li>ROAS</li>
                  <li>Frequency</li>
                  <li>Other advertising performance metrics</li>
                </ul>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-slate-650 mt-4">
              We only request and process the Meta data necessary to provide the functionality of Digital Growth Studio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">4. Meta Permissions</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio may request permissions from Meta that are necessary to provide advertising management functionality. For example, where applicable, we may request permissions that allow the application to:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Access advertising account information</li>
              <li>Read advertising campaign information</li>
              <li>Analyse advertising performance</li>
              <li>Create or modify advertising objects</li>
              <li>Pause or activate advertising objects</li>
              <li>Modify supported advertising settings</li>
              <li>Execute optimization actions approved by the user</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600">
              The specific permissions requested by the application may change as Digital Growth Studio develops. We do not request access to a user&apos;s Meta account beyond the permissions necessary for the functionality being provided.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">5. How We Use Information</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We use information to:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Provide the service</li>
              <li>Create and maintain user accounts</li>
              <li>Connect advertising accounts</li>
              <li>Synchronize advertising data</li>
              <li>Display campaign dashboards</li>
              <li>Calculate advertising metrics</li>
              <li>Generate reports</li>
              <li>Generate AI recommendations</li>
              <li>Execute user-approved optimization actions</li>
              <li>Manage subscriptions and billing</li>
              <li>Provide customer support</li>
              <li>Improve the service</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              We may use aggregated and appropriately protected information to improve system performance, identify technical problems, improve analytics, improve recommendation quality, detect errors, improve user experience, and develop new features.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              We do not use individual users&apos; advertising data for unrelated commercial purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">6. AI Processing</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio uses automated systems and artificial intelligence to analyse advertising performance. AI may analyse information such as campaign performance, ad performance, spend, conversion data, cost metrics, historical performance, campaign trends, performance changes, and account-level advertising metrics.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              The purpose of this processing is to generate recommendations such as:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Pause an underperforming ad</li>
              <li>Increase or decrease a budget</li>
              <li>Identify high-performing creatives</li>
              <li>Identify performance deterioration</li>
              <li>Recommend campaign actions</li>
              <li>Identify opportunities for optimization</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              AI recommendations are intended to assist users with advertising decisions. Unless specifically enabled and authorized by the user, AI recommendations do not automatically execute changes to the user&apos;s advertising account. Where an optimization action requires write access, Digital Growth Studio may execute the action only through the permissions and authorization provided by the user.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">7. User Control Over AI Actions</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio is designed to provide users with control over advertising changes. Where applicable, recommendations may include details on the problem, supporting evidence, recommendation, expected impact, confidence, priority, and status.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Users may review and accept or reject recommendations. If a user approves an action, Digital Growth Studio may send the corresponding request to Meta&apos;s API. Digital Growth Studio does not guarantee that a recommendation will produce a particular advertising result.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">8. How We Store Information</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We use appropriate technical and organizational measures to protect information. Depending on the specific service architecture, information may be stored using PostgreSQL databases, cloud infrastructure, authentication services, secure application servers, third-party infrastructure providers, and logging/monitoring services.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Sensitive credentials and access tokens are protected using appropriate security controls. We do not intentionally store a user&apos;s Meta password.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">9. Meta Access Tokens</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              When a user connects a Meta advertising account, Digital Growth Studio may receive access tokens or other authorization credentials required to communicate with Meta&apos;s APIs. We use these credentials solely to provide the authorized functionality.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              We do not sell Meta access tokens. We do not intentionally expose access tokens to other users.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Where technically possible, credentials are encrypted or protected using appropriate security mechanisms. If a user disconnects their Meta account, we will stop using the authorization for future API requests, subject to technical and legal requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">10. Data Sharing</h2>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              We do not sell users&apos; personal information or Meta advertising data.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              We may share information with service providers that help us operate Digital Growth Studio. These providers may include:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Cloud hosting providers</li>
              <li>Database providers</li>
              <li>Authentication providers</li>
              <li>Payment processors</li>
              <li>Email providers</li>
              <li>Analytics providers</li>
              <li>Error monitoring providers</li>
              <li>Security providers</li>
              <li>Customer support providers</li>
              <li>AI/technology providers where required to provide an explicitly requested feature</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              Service providers are expected to process information only for legitimate business purposes and according to applicable contractual and legal requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">11. Meta</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              When you connect your Meta account, information may be exchanged between Digital Growth Studio and Meta&apos;s services through Meta&apos;s APIs. Your use of Meta services remains subject to Meta&apos;s applicable terms, policies, and privacy practices. Digital Growth Studio does not control how Meta processes information within Meta&apos;s own services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">12. Payment Information</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              If you purchase a Digital Growth Studio subscription, payment information may be processed by our payment provider. We may receive information such as payment status, transaction ID, subscription plan, billing date, payment amount, and invoice information.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              We generally do not store complete payment card details on our own servers when payment processing is handled by a third-party payment processor.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">13. Cookies</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio may use cookies and similar technologies for authentication, session management, security, preferences, analytics, and performance monitoring. You may be able to control cookies through your browser settings. Disabling certain cookies may affect application functionality.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">14. Log and Technical Information</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We may automatically collect technical details such as IP address, browser type, device information, operating system, application activity, login information, error logs, request logs, approximate location derived from technical information, and security events. This information is used primarily for security, debugging, fraud prevention, and service improvement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">15. Data Retention</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We retain information only for as long as reasonably necessary for providing the service, maintaining your account, providing historical analytics, meeting contractual and legal obligations, resolving disputes, preventing fraud, maintaining security, and enforcing our agreements.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              When information is no longer required, we may delete, anonymize, or securely dispose of it. Specific retention periods may vary depending on the type of information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">16. Disconnecting Meta</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You may disconnect your Meta advertising account from Digital Growth Studio at any time through the application, where the functionality is available. You may also revoke the application&apos;s access through your Meta account settings.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              After disconnection:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>We will stop using the authorization for future Meta API requests.</li>
              <li>Scheduled synchronization associated with that authorization will be stopped where technically applicable.</li>
              <li>Previously synchronized data may remain in our systems for a limited period unless you request deletion or deletion is otherwise required.</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              We may retain certain records where required for legal, security, accounting, or fraud-prevention purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">17. Data Deletion</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You may request deletion of your Digital Growth Studio account and associated data. Please see our <Link href="/data-deletion" className="text-blue-600 font-bold hover:underline">Data Deletion Instructions</Link> page for details.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              Deletion may include:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Account information</li>
              <li>Connected advertising account information</li>
              <li>Stored Meta advertising data</li>
              <li>AI recommendations</li>
              <li>Application activity associated with your account</li>
              <li>Other information associated with your account, subject to legal retention requirements</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              Some information may need to be retained where required by law or necessary for legitimate security or accounting purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">18. Security</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We use reasonable security measures designed to protect information from unauthorized access, unauthorized modification, accidental loss, unauthorized disclosure, or destruction.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              However, no internet-based service can guarantee absolute security. Users are responsible for protecting their account credentials and notifying us of suspected unauthorized access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">19. Children&apos;s Privacy</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio is intended for businesses, professionals, advertisers, agencies, and other users capable of entering into legally binding agreements. Our services are not intended for children. We do not knowingly collect personal information from children in violation of applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">20. International Data Processing</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio may use service providers and infrastructure located in countries other than the country where you live. By using the service, you understand that information may be processed internationally, subject to applicable legal requirements and appropriate safeguards.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">21. Your Privacy Rights</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Depending on your location and applicable law, you may have rights to access your personal information, correct inaccurate information, request deletion, request restriction of processing, object to certain processing, request data portability, withdraw certain permissions, and disconnect third-party integrations. To exercise applicable rights, contact us using the details provided below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">22. Changes to This Privacy Policy</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We may update this Privacy Policy from time to time. When we make material changes, we may update the &quot;Last Updated&quot; date and provide additional notice where required. Your continued use of Digital Growth Studio after an updated Privacy Policy becomes effective constitutes acceptance of the updated policy to the extent permitted by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">23. Contact</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              For privacy-related questions or requests:
            </p>
            <p className="text-sm leading-relaxed text-slate-800">
              <strong>Digital Growth Studio Email:</strong> <a href="mailto:digitalgrowthstudioteam@gmail.com" className="text-blue-600 hover:underline">digitalgrowthstudioteam@gmail.com</a><br />
              <strong>Website:</strong> <a href="https://www.digitalgrowthstudio.in/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://www.digitalgrowthstudio.in/</a>
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              For Meta-related data deletion requests, please refer to our <Link href="/data-deletion" className="text-blue-600 font-bold hover:underline">Data Deletion Instructions</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
