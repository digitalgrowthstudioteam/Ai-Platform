import { Users } from "lucide-react";

export default function AudiencesPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audiences</h1>
          <p className="page-subtitle">Analyze audience segments, demographics, and targeting performance</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <Users size={48} />
            <h3>No audience data yet</h3>
            <p>Connect your Meta Ads account to analyze audience performance.</p>
            <button className="btn btn-primary">Connect Meta Ads</button>
          </div>
        </div>
      </div>
    </div>
  );
}
