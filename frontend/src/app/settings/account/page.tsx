import { Settings } from "lucide-react";

export default function AccountSettingsPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">Manage your profile, preferences, and security settings</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <Settings size={48} />
            <h3>Account settings coming soon</h3>
            <p>Profile management, notification preferences, and security settings will be available here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
