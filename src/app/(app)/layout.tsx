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

      <aside className="hidden w-[420px] shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <LeftSidebar />
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
