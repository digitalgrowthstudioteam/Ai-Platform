import { UserPlus } from "lucide-react";

export default function TeamPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">Manage team access and permissions</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <UserPlus size={48} />
            <h3>Team management coming soon</h3>
            <p>You&apos;ll be able to invite team members and manage access roles in a future update.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
