export default function DataDeletionPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-slate-700 bg-white shadow-sm border border-slate-100 rounded-xl my-8">
      <div className="border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-800">Data Deletion Instructions</h1>
        <p className="text-sm text-slate-400 mt-2">Compliance Callback Details (Meta App Settings)</p>
      </div>

      <p className="text-sm leading-relaxed">
        Digital Growth Studio respects your right to privacy and provides a transparent way to remove the application's connection permissions and delete all active synchronized data from our database logs.
      </p>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800">How to remove the app from Facebook</h2>
        <p className="text-sm leading-relaxed">
          If you connected your Facebook account to our app and want to remove it, please execute the following steps on your Facebook Profile page:
        </p>
        <ol className="list-decimal pl-6 text-sm space-y-3 leading-relaxed">
          <li>
            Go to your Facebook Account's <strong>Settings & Privacy</strong> settings panel. Click on <strong>Settings</strong>.
          </li>
          <li>
            Scroll down in the left navigation sidebar and click on <strong>Apps and Websites</strong>.
          </li>
          <li>
            Find <strong>Digital Growth Studio</strong> in the list of active apps, then click the <strong>Remove</strong> button.
          </li>
          <li>
            Confirm removal in the confirmation dialog. This terminates our token credentials access permissions immediately.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">How to request total database erasure</h2>
        <p className="text-sm leading-relaxed">
          To request complete erasure of your platform user account, encrypted tokens, and aggregated ad campaign statistics from our PostgreSQL databases, please send a short email to our team:
        </p>
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-xs leading-relaxed space-y-1.5 text-slate-600 font-medium">
          <div><strong>To:</strong> support@digitalgrowthstudio.com</div>
          <div><strong>Subject:</strong> Complete Account and Data Deletion Request</div>
          <div><strong>Body:</strong> Please delete my user account profile associated with my login email address.</div>
        </div>
        <p className="text-sm leading-relaxed">
          Our data privacy team will manually process your deletion request and purge all related SQL tables within **48 hours**, sending you an email receipt upon completion.
        </p>
      </section>
    </div>
  );
}
