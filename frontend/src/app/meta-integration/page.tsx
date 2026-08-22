import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";

export default function MetaIntegrationPage() {
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
            <Link href="/privacy" className="hover:text-blue-600 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-blue-600 transition">Terms of Service</Link>
            <Link href="/security" className="hover:text-blue-600 transition">Security</Link>
            <Link href="/meta-integration" className="text-blue-600 transition">Meta Integration</Link>
            <Link href="/data-deletion" className="hover:text-blue-600 transition">Data Deletion</Link>
          </nav>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 sm:p-10 space-y-8">
          <div className="border-b border-slate-100 pb-6 text-center sm:text-left flex flex-col sm:flex-row items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit">
              <HelpCircle size={36} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Meta Integration</h1>
              <p className="text-xs text-slate-450 mt-1 font-semibold leading-relaxed">
                Connect Your Meta Advertising Accounts With Digital Growth Studio
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">
            Digital Growth Studio integrates with Meta&apos;s advertising platform to help businesses, advertisers, marketers, and agencies understand campaign performance and optimize their advertising activities.
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            Our integration allows you to connect your authorized Meta advertising accounts to Digital Growth Studio and use your advertising data within our analytics and AI optimization platform.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">1. How the Integration Works</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              The integration follows this general process:
            </p>
            <div className="grid grid-cols-1 gap-4 pt-2">
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Step 1 — Connect Meta</h4>
                <p className="text-xs text-slate-500 mt-1">You select &quot;Connect Meta Account&quot; inside Digital Growth Studio and are redirected through Meta&apos;s authorization process.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Step 2 — Authorize Access</h4>
                <p className="text-xs text-slate-500 mt-1">Meta shows you the permissions requested by Digital Growth Studio. You decide whether to authorize the application.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Step 3 — Select Your Ad Account</h4>
                <p className="text-xs text-slate-500 mt-1">After authorization, Digital Growth Studio identifies the advertising accounts available to you. You select the account you want to use.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Step 4 — Synchronize Data</h4>
                <p className="text-xs text-slate-500 mt-1">Digital Growth Studio retrieves authorized advertising information through Meta&apos;s APIs.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Step 5 — Analyse Performance</h4>
                <p className="text-xs text-slate-500 mt-1">Our platform processes the available information to calculate performance metrics, trends, campaign health, creative performance, cost changes, and other optimization insights.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Step 6 — AI Recommendations</h4>
                <p className="text-xs text-slate-500 mt-1">Our AI analyses the available data and may generate recommendations.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Step 7 — Take Action</h4>
                <p className="text-xs text-slate-500 mt-1">Depending on your plan and permissions, you may review and approve recommended actions. Digital Growth Studio can then send the authorized action to Meta through the applicable API.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">2. What Meta Data Do We Access?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Depending on the permissions you authorize and the features available, Digital Growth Studio may access:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-2">
              <li><strong>Ad Account Data</strong>: ID, name, currency, time zone, status, and config.</li>
              <li><strong>Campaign Data</strong>: ID, name, objective, status, budget, and metrics.</li>
              <li><strong>Ad Set Data</strong>: ID, name, status, budget, schedule, optimization settings, bids, and targeting details.</li>
              <li><strong>Ad Data</strong>: ID, name, status, creative identifiers, and delivery logs.</li>
              <li><strong>Performance Data</strong>: Spend, impressions, reach, clicks, link clicks, CTR, CPC, CPM, conversions, leads, CPL, CPA, revenue, ROAS, frequency, and related metrics.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">3. Why Do We Need Meta Permissions?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio requires Meta permissions because the application needs to communicate with your advertising account through Meta&apos;s official APIs. Different permissions support different functionality.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              For example:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-2">
              <li><strong>Read/analytics functionality</strong>: Used to retrieve campaigns, ads, performance data, analyse advertising results, generate reports, and generate AI recommendations.</li>
              <li><strong>Advertising management functionality</strong>: Where enabled and approved, management permissions may allow Digital Growth Studio to execute authorized advertising changes (pausing ads, activating ads, adjusting budgets, modifying settings).</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600">
              We request only the permissions necessary for the functionality provided by the application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">4. Why Does Digital Growth Studio Need ads_management?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Certain Digital Growth Studio features are designed not only to identify optimization opportunities but also to allow users to execute approved recommendations.
            </p>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-150 space-y-2 max-w-lg mx-auto text-xs leading-normal">
              <div><strong>1. Problem:</strong> Ad XYZ has generated significantly higher CPL than comparable ads over the recent performance period.</div>
              <div><strong>2. AI Recommendation:</strong> Consider pausing Ad XYZ.</div>
              <div><strong>3. User Decision:</strong> The advertiser reviews the recommendation and selects <strong>&quot;Approve & Apply&quot;</strong>.</div>
              <div><strong>4. Execution:</strong> Digital Growth Studio sends the authorized request to Meta.</div>
              <div><strong>5. Result:</strong> The applicable advertising object is updated in Meta.</div>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              The <code>ads_management</code> permission is therefore required for functionality that allows Digital Growth Studio to perform authorized advertising management actions on behalf of the connected advertiser.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">5. User Control</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio is designed to keep advertisers involved in important advertising decisions. Where applicable, the platform follows this path:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 py-4 text-[10px] font-bold text-slate-650 bg-slate-50 rounded-xl border border-slate-150 max-w-xl mx-auto">
              <span>Detect</span>
              <ArrowRight size={10} />
              <span>Explain</span>
              <ArrowRight size={10} />
              <span>Recommend</span>
              <ArrowRight size={10} />
              <span>Review</span>
              <ArrowRight size={10} />
              <span>Approve</span>
              <ArrowRight size={10} />
              <span>Execute</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              Users can review information supporting a recommendation (problem identified, evidence, expected impact, confidence, and priority) before taking action.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">6. Does AI Automatically Change My Ads?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Not necessarily. Digital Growth Studio may provide AI recommendations without executing them. Where an action requires user approval, the user must approve the recommendation before Digital Growth Studio attempts to execute the action.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Certain future features may provide configurable automation functionality where the user explicitly enables such functionality. Any automated functionality will operate within the permissions and controls provided by the user and applicable platform requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">7. What Happens When You Disconnect Meta?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You can disconnect your Meta advertising account from Digital Growth Studio. After disconnection:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Digital Growth Studio will stop using the authorization for future API requests.</li>
              <li>Scheduled synchronization will be stopped where technically applicable.</li>
              <li>Future campaign changes through the disconnected authorization will not be attempted.</li>
              <li>Previously synchronized information may remain temporarily according to our retention and deletion policies.</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600">
              You may also revoke the application&apos;s authorization through Meta.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">8. Meta Account Password</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio does not ask you to provide your Meta password to us. Authentication and authorization are handled through Meta&apos;s official authorization mechanisms. Your Meta password remains with Meta.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">9. Does Digital Growth Studio Sell Meta Data?</h2>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              No. Digital Growth Studio does not sell users&apos; Meta advertising data.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              We use authorized advertising data solely to provide analytics, reporting, AI recommendations, campaign optimization, and user-requested ad management.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">10. Who Can Access My Meta Data?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Your advertising data is intended to be accessible only to you, authorized users within your organization/account, Digital Growth Studio systems required to provide the service, and authorized service providers where necessary to operate the service.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              We do not intentionally make one customer&apos;s advertising data available to another customer.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">11. How Is Meta Data Protected?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio uses security controls designed to protect advertising information, including HTTPS/TLS, authentication, access controls, secure database encryption, and monitoring. For additional information, see our <Link href="/security" className="text-blue-600 font-bold hover:underline">Security page</Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">12. How Is Meta Data Used by AI?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio may process authorized advertising information to generate insights and recommendations. For example:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-7 items-center gap-2 py-4 text-[10px] font-bold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-150 max-w-2xl mx-auto text-center">
              <div className="p-2 bg-white rounded border border-slate-200">Spend + CPL data</div>
              <ArrowRight size={14} className="mx-auto text-slate-400 rotate-90 sm:rotate-0" />
              <div className="p-2 bg-blue-50 text-blue-700 rounded border border-blue-100">Performance deterioration detected</div>
              <ArrowRight size={14} className="mx-auto text-slate-400 rotate-90 sm:rotate-0" />
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">AI Recommendation generated</div>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              This allows advertising data to be converted into actionable campaign intelligence.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">13. Can Digital Growth Studio Change My Campaign Without Permission?</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio only performs actions that are supported by the permissions and configuration you have authorized. Where the platform requires explicit approval for an action, the action will not be executed until you approve it. You remain responsible for your advertising account and should review important changes before approving them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">14. Data Retention</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Meta-related information may be retained while you use Digital Growth Studio to provide historical reporting, performance analysis, AI recommendations, campaign comparisons, and account analytics.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              You can request deletion of your information according to our <Link href="/data-deletion" className="text-blue-600 font-bold hover:underline">Data Deletion Instructions</Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">15. Meta Platform Changes</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Meta may change its APIs, permissions, policies, data availability, advertising functionality, rate limits, or technical requirements. As a result, certain Digital Growth Studio functionality may change or become temporarily unavailable. We will make reasonable efforts to maintain compatibility with supported Meta functionality.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">16. Meta Policies</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Your use of Meta services remains subject to Meta&apos;s applicable terms, policies, and requirements. Digital Growth Studio is not a replacement for Meta Ads Manager. Instead, it provides additional analytics, intelligence, recommendations, and authorized optimization functionality around your advertising workflow.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">17. Data Deletion</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You may request deletion of your Digital Growth Studio account and associated information. For detailed instructions, visit our <Link href="/data-deletion" className="text-blue-600 font-bold hover:underline">Data Deletion Instructions</Link> page.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">18. Questions About the Meta Integration</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              If you have questions about how Digital Growth Studio interacts with Meta, or for privacy-related and security-related issues, feel free to contact our team:
            </p>
            <p className="text-sm leading-relaxed text-slate-800">
              <strong>Email Support:</strong> <a href="mailto:digitalgrowthstudioteam@gmail.com" className="text-blue-600 hover:underline">digitalgrowthstudioteam@gmail.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
