"use client";

import { Button } from "@/components/ui/button";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export function ClerkAuthMenu() {
  return (
    <div className="flex flex-col gap-2 px-1">
      <Show when="signed-out">
        <div className="flex flex-col gap-1.5">
          <SignInButton mode="modal">
            <Button
              type="button"
              className="nav-item w-full justify-center rounded-md px-3 py-2 text-[13px] font-medium"
            >
              Connexion
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button
              type="button"
              variant="outline"
              className="nav-item w-full justify-center rounded-md px-3 py-2 text-[13px]"
            >
              Créer un compte
            </Button>
          </SignUpButton>
        </div>
      </Show>
      <Show when="signed-in">
        <div className="flex items-center justify-center py-1">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-9 h-9 ring-1 ring-[var(--border)]",
              },
            }}
          />
        </div>
      </Show>
    </div>
  );
}
