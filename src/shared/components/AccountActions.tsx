"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function AccountActions() {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <button
      type="button"
      disabled={signingOut}
      onClick={() => {
        setSigningOut(true);
        void signOut({ callbackUrl: "/login" });
      }}
      className="h-9 rounded-control bg-text px-3 text-[13px] font-medium text-ground disabled:opacity-60"
    >
      {signingOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
