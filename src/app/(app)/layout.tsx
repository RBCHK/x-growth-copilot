import { LeftSidebar } from "@/components/left-sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar trigger — visible only on small screens */}
      <MobileSidebar />

      {/* Left Sidebar — desktop */}
      <aside className="hidden w-72 shrink-0 border-r border-border md:flex md:flex-col">
        <LeftSidebar />
      </aside>

      {/* Center — Main Chat Area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>

      {/* Right Sidebar — will be filled in Sprint 1.5 */}
      <aside className="hidden w-80 shrink-0 border-l border-border lg:flex lg:flex-col">
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Right Sidebar
        </div>
      </aside>
    </div>
  );
}
