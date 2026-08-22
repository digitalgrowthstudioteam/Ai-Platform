import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function SecurityPage() {
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
            <Link href="/terms" className="hover:text-blue-600 transition">Terms of Service</Link>
            <Link href="/security" className="text-blue-600 transition">Security</Link>
            <Link href="/meta-integration" className="hover:text-blue-600 transition">Meta Integration</Link>
            <Link href="/data-deletion" className="hover:text-blue-600 transition">Data Deletion</Link>
          </nav>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 sm:p-10 space-y-8">
          <div className="border-b border-slate-100 pb-6 text-center sm:text-left flex flex-col sm:flex-row items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit">
              <ShieldCheck size={36} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Security at Digital Growth Studio</h1>
              <p className="text-xs text-slate-450 mt-1 font-semibold leading-relaxed">
                Protecting your advertising data, account information, and business information is a core part of Digital Growth Studio.
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">
            Digital Growth Studio is an AI-powered advertising optimization platform that connects with advertising platforms such as Meta to help businesses analyse campaign performance and make better advertising decisions. Because our platform can process sensitive business and advertising information, we use technical and organizational safeguards designed to protect your data.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">1. Security by Design</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Security is considered throughout the Digital Growth Studio platform, including:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Authentication and Session management</li>
              <li>API access authorization protocols</li>
              <li>Database encryption and isolated storage structures</li>
              <li>Infrastructure firewall and routing controls</li>
              <li>Real-time application security monitoring</li>
              <li>Compliant data deletion mechanism</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600">
              We follow the principle of providing users and internal services with only the access required to perform their intended functions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">2. Account Security</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio uses secure authentication mechanisms to protect user accounts. Depending on the authentication method available, this may include secure session management, password protection through our authentication provider (Firebase Authentication), OAuth authorization tokens, and protection against unauthorized access.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              We do not intentionally store your Meta account password.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">3. Meta Account Security</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              When you connect a Meta advertising account, Digital Growth Studio uses Meta&apos;s official authorization system to obtain the permissions required for the functionality you choose to use.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              Your Meta credentials are not provided directly to Digital Growth Studio.
            </p>
            <div className="flex items-center justify-center gap-3 py-4 text-xs font-bold text-slate-600 bg-slate-50 rounded-xl border border-slate-150 max-w-md mx-auto">
              <span>You</span>
              <ArrowRight size={14} className="text-slate-400" />
              <span className="text-blue-600">Meta Authorization</span>
              <ArrowRight size={14} className="text-slate-400" />
              <span>Digital Growth Studio</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              This allows Meta to control which permissions are granted to our application. The permissions requested depend on the specific features you choose to use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">4. Access Tokens</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio may receive authorization tokens from Meta that allow our application to perform permitted API operations. These tokens are treated as sensitive credentials.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 font-semibold">
              We take reasonable measures to:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Restrict access to authorization credentials</li>
              <li>Prevent unauthorized exposure</li>
              <li>Store credentials securely using database-level encryption</li>
              <li>Avoid exposing credentials through the user interface</li>
              <li>Use credentials only for authorized application functionality</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600">
              Authorization credentials are not intentionally shared with other users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">5. Data Encryption</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We use encryption and secure communication technologies designed to protect information during transmission. Communication between your browser and Digital Growth Studio is protected using HTTPS/TLS.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Sensitive information stored within our infrastructure is protected using appropriate security controls. The exact encryption mechanisms may vary depending on the infrastructure and service provider used.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">6. Database Security</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio uses controlled database infrastructure to store application and advertising-related information. Security controls may include authentication, access restrictions, network controls, granular database permissions, secure credentials, backup controls, and active system monitoring.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Database access is restricted to authorized services and personnel where necessary.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">7. Infrastructure Security</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio operates using controlled cloud/server infrastructure. Our infrastructure may include application servers, database instances, secure private networking, reverse proxies with SSL termination, firewall controls, monitoring, logging, and automated backup systems.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Infrastructure access is restricted and protected using authentication and authorization controls.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">8. API Security</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio communicates with third-party advertising platforms through authorized APIs. API requests are authenticated, authorized, limited according to granted permissions, associated with the appropriate user/account, and logged where appropriate for operational and security purposes.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              We do not intentionally bypass platform security mechanisms or access advertising accounts without authorization.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">9. Role-Based Access</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio may use role-based access controls to limit what users and administrators can access. For example, access may be restricted according to user organization, ad account configurations, billing subscriptions, and specific application permissions.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              A user should only be able to access advertising accounts that have been authorized and made available to their account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">10. AI Security</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio uses AI to analyse advertising performance and generate recommendations. AI processing is designed around the advertising data necessary to provide the requested functionality.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              AI recommendations may analyse campaign metrics, ad performance, historical trends, spend, conversion information, and account configurations. AI does not receive your Meta account password.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              AI-generated recommendations do not automatically mean that a campaign will be modified. Where user approval is required, the user remains responsible for approving the recommended action.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">11. Write Access Protection</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Certain Digital Growth Studio functionality may allow approved recommendations to make changes to advertising accounts.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-5 items-center gap-2 py-4 text-[10px] font-bold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-150 max-w-2xl mx-auto text-center">
              <div className="p-2 bg-white rounded border border-slate-200">Performance analysis</div>
              <ArrowRight size={14} className="mx-auto text-slate-400 rotate-90 sm:rotate-0" />
              <div className="p-2 bg-blue-50 text-blue-700 rounded border border-blue-100">AI recommendation & User review</div>
              <ArrowRight size={14} className="mx-auto text-slate-400 rotate-90 sm:rotate-0" />
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">User approved API execution</div>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 mt-2">
              This architecture is designed to reduce unintended campaign modifications.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">12. Monitoring and Logging</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We may maintain technical logs to help us detect security issues, investigate errors, troubleshoot API failures, monitor system health, detect suspicious activity, and improve reliability. Logs are subject to appropriate access controls. We aim to avoid unnecessarily storing sensitive information in application logs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">13. Employee and Administrative Access</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Access to production systems and sensitive information is limited to authorized personnel who require access for legitimate business or technical purposes. Where appropriate, administrative access may be protected through secure authentication, role-based permissions, restricted infrastructure access, and audit logging.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">14. Third-Party Service Providers</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Digital Growth Studio may use trusted third-party providers for services such as authentication, cloud hosting, payment processing, email delivery, error monitoring, and AI interface APIs.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Third-party providers may have their own security practices and policies. We aim to select service providers that provide appropriate security controls for the services they provide.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">15. Data Deletion</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Users may request deletion of their Digital Growth Studio data. Depending on the request, this may include account profiles, connected Meta integrations, cached advertising statistics, and dashboards.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              For details, see our <Link href="/data-deletion" className="text-blue-600 font-bold hover:underline">Data Deletion Instructions</Link> page.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">16. Security Incident Response</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              If we become aware of a security incident affecting user information, we will investigate the incident and take reasonable steps to identify the issue, contain the event, assess potential impact, remediate the underlying issue, prevent recurrence, and notify affected users or authorities where required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">17. Responsible Disclosure</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              If you discover a potential security vulnerability in Digital Growth Studio, please contact our team immediately:
            </p>
            <p className="text-sm leading-relaxed text-slate-800">
              <strong>Vulnerability Reports:</strong> <a href="mailto:digitalgrowthstudioteam@gmail.com" className="text-blue-600 hover:underline">digitalgrowthstudioteam@gmail.com</a>
            </p>
            <p className="text-sm leading-relaxed text-slate-650 italic">
              Please provide a description of the vulnerability, steps to reproduce, potential impact, and screenshots where appropriate. Please do not publicly disclose a vulnerability before we have had a reasonable opportunity to investigate and address it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">18. Important Disclaimer</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              No online service can guarantee absolute security. While Digital Growth Studio takes reasonable measures to protect information, no system, network, database, or internet transmission can be guaranteed to be completely secure.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Users should also maintain appropriate security practices, including protecting their login credentials and avoiding unauthorized sharing of account access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">19. Contact</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              For security-related questions or vulnerability reports:
            </p>
            <p className="text-sm leading-relaxed text-slate-800">
              <strong>Security:</strong> <a href="mailto:digitalgrowthstudioteam@gmail.com" className="text-blue-600 hover:underline">digitalgrowthstudioteam@gmail.com</a><br />
              <strong>Privacy:</strong> <a href="mailto:digitalgrowthstudioteam@gmail.com" className="text-blue-600 hover:underline">digitalgrowthstudioteam@gmail.com</a><br />
              <strong>Support:</strong> <a href="mailto:digitalgrowthstudioteam@gmail.com" className="text-blue-600 hover:underline">digitalgrowthstudioteam@gmail.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
