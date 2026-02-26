"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LeftSidebar } from "@/components/left-sidebar";

export function MobileSidebar() {
  return (
    <div className="fixed left-3 top-3 z-40 md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <LeftSidebar />
        </SheetContent>
      </Sheet>
    </div>
  );
}
