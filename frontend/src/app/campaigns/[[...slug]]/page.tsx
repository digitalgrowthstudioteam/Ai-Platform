import CampaignsClient from "./CampaignsClient";

export function generateStaticParams() {
  return [
    { slug: [] }
  ];
}

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function CampaignsPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <CampaignsClient slug={resolvedParams.slug} />;
}
