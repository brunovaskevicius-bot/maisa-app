import AppShell from "@/ui/componentes/AppShell";
import { StoreProvider } from "@/ui/estado/store";

export default function Page() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
