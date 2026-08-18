import { TrendingUp } from "lucide-react";

export default function InsightsPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Performance Insights</h1>
          <p className="page-subtitle">Discover trends, patterns, and opportunities in your ad performance</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <TrendingUp size={48} />
            <h3>No insights available</h3>
            <p>We need performance data before we can surface meaningful insights. Connect your Meta Ads account to get started.</p>
            <button className="btn btn-primary">Connect Meta Ads</button>
          </div>
        </div>
      </div>
    </div>
  );
}
