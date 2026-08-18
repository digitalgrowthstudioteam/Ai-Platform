import { Image } from "lucide-react";

export default function CreativesPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Creatives</h1>
          <p className="page-subtitle">Compare creative performance across all campaigns</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <Image size={48} />
            <h3>No creatives yet</h3>
            <p>Connect your Meta Ads account to see creative analytics.</p>
            <button className="btn btn-primary">Connect Meta Ads</button>
          </div>
        </div>
      </div>
    </div>
  );
}
