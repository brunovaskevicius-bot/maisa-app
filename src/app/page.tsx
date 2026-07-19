import MaisaApp from "@/components/MaisaApp";
import { AdminConfigProvider } from "@/lib/adminConfig";

export default function Page() {
  return (
    <AdminConfigProvider>
      <MaisaApp />
    </AdminConfigProvider>
  );
}
