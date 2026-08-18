import { BarChart3 } from "lucide-react";

export default function DemographicsPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Demographics</h1>
          <p className="page-subtitle">Understand your audience by age, gender, and geography</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <BarChart3 size={48} />
            <h3>No demographic data yet</h3>
            <p>Connect your Meta Ads account to see demographic breakdowns.</p>
            <button className="btn btn-primary">Connect Meta Ads</button>
          </div>
        </div>
      </div>
    </div>
  );
}
