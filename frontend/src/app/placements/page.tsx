import { MapPin } from "lucide-react";

export default function PlacementsPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Placements</h1>
          <p className="page-subtitle">Compare performance across Facebook Feed, Instagram Reels, Stories, and more</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <MapPin size={48} />
            <h3>No placement data yet</h3>
            <p>Connect your Meta Ads account to see placement performance breakdowns.</p>
            <button className="btn btn-primary">Connect Meta Ads</button>
          </div>
        </div>
      </div>
    </div>
  );
}
