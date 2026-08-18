import { Type } from "lucide-react";

export default function CopyAnalyzerPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Copy Analyzer</h1>
          <p className="page-subtitle">Analyze headline, primary text, and CTA performance patterns</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <Type size={48} />
            <h3>No copy data yet</h3>
            <p>Connect your Meta Ads account to compare winning vs losing ad copy patterns.</p>
            <button className="btn btn-primary">Connect Meta Ads</button>
          </div>
        </div>
      </div>
    </div>
  );
}
