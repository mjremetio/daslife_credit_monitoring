import sampleData from "@/data/clients.sample.json";
import { Dashboard } from "@/components/Dashboard";
import { normalizeFromAny } from "@/lib/transform";

export const revalidate = 0;

export default function Home() {
  const initialData = sampleData.map((row, idx) => normalizeFromAny(row as Record<string, unknown>, idx));
  return <Dashboard initialData={initialData} />;
}
