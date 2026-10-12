import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function HomePage() {
  const user = await requireUser();
  return <PageHeader title={`Hi, ${user.name.split(" ")[0]}`} subtitle="Phase 1 placeholder" />;
}
