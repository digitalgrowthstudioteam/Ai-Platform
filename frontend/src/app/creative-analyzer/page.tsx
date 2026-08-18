import { Palette } from "lucide-react";

export default function CreativeAnalyzerPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Creative Analyzer</h1>
          <p className="page-subtitle">Compare creative formats, identify fatigue, and discover winning visuals</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <Palette size={48} />
            <h3>No creative data yet</h3>
            <p>Connect your Meta Ads account to analyze creative performance across video, image, carousel, and more.</p>
            <button className="btn btn-primary">Connect Meta Ads</button>
          </div>
        </div>
      </div>
    </div>
  );
}
