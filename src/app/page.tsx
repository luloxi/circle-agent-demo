import { DemoApp } from "@/components/demo-app";
import { presetCards } from "@/lib/composer";
import { searchServicesSafe } from "@/lib/discovery";
import { filterMockServices } from "@/lib/mock-data";
import { NETWORKS } from "@/lib/networks";

const DEFAULT_QUERY = "";
const DEFAULT_DEMO = process.env.NEXT_PUBLIC_DEFAULT_DEMO_MODE !== "false";

export default async function Home() {
  let items = filterMockServices({ query: DEFAULT_QUERY }).items;
  let total = items.length;
  let source = "demo";
  let note: string | undefined;

  if (!DEFAULT_DEMO) {
    const live = await searchServicesSafe({
      query: DEFAULT_QUERY,
      network: NETWORKS["ARC-TESTNET"].discoveryNetwork,
      limit: 24,
    });
    items = live.data.items;
    total = live.data.pagination.total;
    source = live.source;
    note = live.note;
  }

  return (
    <DemoApp
      initialCatalog={{
        items,
        total,
        source,
        note,
        query: DEFAULT_QUERY,
      }}
      initialPresets={presetCards()}
    />
  );
}
