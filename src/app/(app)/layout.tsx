import { LeftSidebar } from "@/components/left-sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <MobileSidebar />

      <aside className="hidden w-[22.95rem] shrink-0 border-r border-border bg-[var(--sidebar)] md:flex md:flex-col">
        <LeftSidebar />
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
