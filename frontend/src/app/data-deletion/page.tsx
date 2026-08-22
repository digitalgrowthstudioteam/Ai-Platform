import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function DataDeletionPage() {
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
            <Link href="/security" className="hover:text-blue-600 transition">Security</Link>
            <Link href="/meta-integration" className="hover:text-blue-600 transition">Meta Integration</Link>
            <Link href="/data-deletion" className="text-blue-600 transition">Data Deletion</Link>
          </nav>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 sm:p-10 space-y-8">
          <div className="border-b border-slate-100 pb-6 text-center sm:text-left flex flex-col sm:flex-row items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit">
              <AlertCircle size={36} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Digital Growth Studio — Data Deletion Instructions</h1>
              <p className="text-xs text-slate-400 mt-2 font-semibold">Last Updated: August 20, 2026</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">
            Digital Growth Studio respects your right to request deletion of your account and personal information. You may request deletion of information associated with your Digital Growth Studio account, including information obtained from connected advertising accounts, subject to applicable legal and security requirements.
          </p>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">How to Delete Your Data</h2>
            
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Option 1 — From Digital Growth Studio (In-App)</h3>
                <p className="text-xs text-slate-500 font-medium">If your account provides a deletion option:</p>
                <ol className="list-decimal pl-6 text-xs text-slate-655 space-y-2">
                  <li>Log in to Digital Growth Studio.</li>
                  <li>Open <strong>Settings</strong>.</li>
                  <li>Open <strong>Account & Privacy</strong>.</li>
                  <li>Select <strong>Delete Account</strong>.</li>
                  <li>Review the information that will be deleted.</li>
                  <li>Confirm the deletion request.</li>
                  <li>Complete any required verification.</li>
                </ol>
                <p className="text-xs text-slate-550 italic">Once confirmed, your account will be scheduled for deletion.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Option 2 — Request Deletion by Email</h3>
                <p className="text-xs text-slate-500 font-medium">
                  If the in-app deletion functionality is currently unavailable or you wish to request deletion manually, please send an email:
                </p>
                <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs space-y-2 text-slate-600">
                  <div><strong>To:</strong> <a href="mailto:digitalgrowthstudioteam@gmail.com" className="text-blue-600 hover:underline">digitalgrowthstudioteam@gmail.com</a></div>
                  <div><strong>Subject:</strong> Data Deletion Request</div>
                  <div>
                    <strong>Include the following details:</strong>
                    <ul className="list-disc pl-6 space-y-1 mt-1 text-slate-500">
                      <li>Your Digital Growth Studio account email</li>
                      <li>Your name</li>
                      <li>Connected Meta Ad Account ID, if applicable</li>
                      <li>The type of deletion requested</li>
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-normal">
                  For security reasons, we may request verification that you own the account before processing the request.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">What We Delete</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Depending on your request, deletion may include:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-2 leading-relaxed">
              <li><strong>Account information</strong>: Name, email, phone number, profile details, and account preferences.</li>
              <li><strong>Meta-related information</strong>: Meta Ad Account IDs, Campaign metadata, Ad Set configurations, Ads definitions, performance metrics, and stored Meta configs.</li>
              <li><strong>AI Recommendations</strong>: All recommendations generated by our processing engines associated with the account.</li>
              <li><strong>Application information</strong>: Saved reports, custom dashboards, user settings, and application logs/activity records.</li>
              <li><strong>Authorization details</strong>: Where applicable, we will revoke or remove stored authorization credentials and tokens associated with the connected Meta account.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">What May Be Retained</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Certain information may need to be retained for a limited period where required by:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1.5">
              <li>Applicing law</li>
              <li>Tax/accounting requirements</li>
              <li>Fraud prevention and security monitoring</li>
              <li>Legal claims and dispute resolution</li>
              <li>Enforcement of contractual obligations</li>
            </ul>
            <p className="text-sm leading-relaxed text-slate-600">
              Any retained information will be limited to what is reasonably necessary.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Meta Account Access</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Deleting your Digital Growth Studio account does not necessarily delete information held by Meta. If you want to revoke Digital Growth Studio&apos;s access to your Meta account, you may also remove the application from your Meta account settings page.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Processing Time</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We aim to process verified deletion requests within a reasonable period. Where technically feasible, deletion will begin promptly after verification.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Some backups may remain temporarily until they are automatically overwritten according to our backup-retention process. Such backup copies will not normally be used for ordinary application operations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Confirmation</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Once the deletion process has been completed, we may send a confirmation email to the verified account email address.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
