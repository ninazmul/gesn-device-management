"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function ClerkSignOutButton() {
  return (
    <SignOutButton>
      <Button variant="outline" className="w-full">
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </SignOutButton>
  );
}
