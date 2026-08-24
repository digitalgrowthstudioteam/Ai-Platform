import CampaignPlanClient from "./CampaignPlanClient";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function CampaignPlanDetailPage() {
  return <CampaignPlanClient />;
}
