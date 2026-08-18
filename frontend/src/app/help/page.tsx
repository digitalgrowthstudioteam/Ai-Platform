import { HelpCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Help & Support</h1>
          <p className="page-subtitle">Get help with Digital Growth Studio</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <HelpCircle size={48} />
            <h3>Need help?</h3>
            <p>Our support documentation and contact options will be available here soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
