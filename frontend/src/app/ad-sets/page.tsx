import { Layers } from "lucide-react";

export default function AdSetsPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ad Sets</h1>
          <p className="page-subtitle">Analyze ad set performance, audiences, and budget allocation</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <Layers size={48} />
            <h3>No ad sets yet</h3>
            <p>Connect your Meta Ads account to view ad set analytics.</p>
            <button className="btn btn-primary">Connect Meta Ads</button>
          </div>
        </div>
      </div>
    </div>
  );
}
