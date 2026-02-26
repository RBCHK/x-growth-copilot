export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar — will be filled in Sprint 1.3 */}
      <aside className="hidden w-72 shrink-0 border-r border-border md:flex md:flex-col">
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Left Sidebar
        </div>
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
