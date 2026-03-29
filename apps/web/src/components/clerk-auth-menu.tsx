"use client";

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
            <button
              type="button"
              className="nav-item flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium bg-[var(--accent)] text-white w-full"
            >
              Connexion
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="nav-item flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[13px] text-[var(--text2)] border border-[var(--border)] w-full hover:bg-[var(--surface2)]"
            >
              Créer un compte
            </button>
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
