import { AppShell } from "@/components/AppShell";
import { fetchFullClients, fetchUsers } from "@/lib/db";
import { seedIfEmpty } from "@/lib/seed";

export const revalidate = 0;

export default async function Home() {
  seedIfEmpty();
  const clients = fetchFullClients();
  const users = fetchUsers();
  return <AppShell initialClients={clients} initialUsers={users} />;
}
