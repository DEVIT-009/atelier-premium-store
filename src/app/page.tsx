import { CampaignBanner } from "@/components/home/campaign-banner";
import { CollectionGrid } from "@/components/home/collection-grid";
import { EditorialFeature } from "@/components/home/editorial-feature";
import { Hero } from "@/components/home/hero";
import { NewArrivals } from "@/components/home/new-arrivals";
import { Services } from "@/components/home/services";
import { Stories } from "@/components/home/stories";

export default function Home() {
  return (
    <>
      <Hero />
      <NewArrivals />
      <EditorialFeature />
      <CollectionGrid />
      <CampaignBanner />
      <Stories />
      <Services />
    </>
  );
}
