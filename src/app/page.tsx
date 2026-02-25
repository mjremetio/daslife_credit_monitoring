import { Dashboard } from "@/components/Dashboard";
import { fetchFullClients } from "@/lib/db";

export const revalidate = 0;

export default async function Home() {
  const data = fetchFullClients();
  return <Dashboard initialData={data} />;
}
