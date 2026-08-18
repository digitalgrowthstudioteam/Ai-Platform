export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-slate-700 bg-white shadow-sm border border-slate-100 rounded-xl my-8">
      <div className="border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-800">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mt-2">Effective Date: August 17, 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">1. Introduction</h2>
        <p className="text-sm leading-relaxed">
          Welcome to Digital Growth Studio ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy governs our data practices regarding your use of our SaaS web portal, which connects with the Facebook/Meta Graph API to aggregate and optimize marketing campaigns.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">2. Information We Collect</h2>
        <p className="text-sm leading-relaxed">
          When you connect your Meta Ad Account with Digital Growth Studio, we securely access:
        </p>
        <ul className="list-disc pl-6 text-sm space-y-1.5 leading-relaxed">
          <li><strong>Meta OAuth Access Tokens</strong>: Cryptographically encrypted tokens to synchronize performance stats on your behalf.</li>
          <li><strong>Campaign Metadata</strong>: Ad names, spend metrics, clicks, impressions, purchases, ROAS, and creative image/video URLs.</li>
          <li><strong>Profile Data</strong>: Your name and email address provided during user registration.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">3. How We Use Your Information</h2>
        <p className="text-sm leading-relaxed">
          We use the synchronized data solely to:
        </p>
        <ul className="list-disc pl-6 text-sm space-y-1.5 leading-relaxed">
          <li>Aggregate marketing performance metrics and render interactive dashboard charts.</li>
          <li>Calculate AI recommendations (underperforming creative warnings, scaling opportunities).</li>
          <li>We <strong>never</strong> sell, share, or rent your synchronized campaign logs or profile details to third-party providers.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">4. Data Security</h2>
        <p className="text-sm leading-relaxed">
          We implement best-in-class security measures. All synced Facebook Graph API tokens are encrypted using Fernet cryptography prior to being persisted in our PostgreSQL databases.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">5. Data Deletion and Control</h2>
        <p className="text-sm leading-relaxed">
          You retain complete ownership over your data. You can disconnect your Meta Ad Account at any time inside settings, which purges all active access tokens. To request a complete deletion of your account records, please consult our <a href="/data-deletion" className="text-blue-600 font-bold hover:underline">Data Deletion Instructions Page</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">6. Contact Us</h2>
        <p className="text-sm leading-relaxed">
          If you have questions about this Privacy Policy, feel free to contact our data compliance team:
        </p>
        <p className="text-sm font-bold mt-1 text-slate-800">
          Email: support@digitalgrowthstudio.com
        </p>
      </section>
    </div>
  );
}
