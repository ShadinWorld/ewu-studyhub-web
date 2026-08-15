"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, UserRound } from "lucide-react";
import { signInWithGoogleAction } from "@/app/(auth)/actions";

type AdminAccount = {
  id: string;
  name: string;
  email: string;
};

function SwitchButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
    >
      <UserRound className="h-4 w-4" />
      {pending ? "Switching…" : "Switch to this account"}
    </button>
  );
}

function SwitchAccountForm({
  email,
  next,
}: {
  email: string;
  next: string;
}) {
  const [state, action] = useFormState(signInWithGoogleAction, undefined);

  return (
    <form action={action} className="w-full">
      <input type="hidden" name="switchEmail" value={email} />
      <input type="hidden" name="next" value={next} />

      <SwitchButton />

      {state?.error && (
        <p className="px-2 py-1 text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}

export function AdminAccountSwitcher({
  currentName,
  currentEmail,
  admins,
}: {
  currentName: string;
  currentEmail: string;
  admins: AdminAccount[];
}) {
  const others = admins.filter(
    (account) =>
      account.email &&
      account.email.toLowerCase() !== currentEmail.toLowerCase()
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-w-[220px]"
        >
          <UserRound className="mr-2 h-4 w-4" />
          <span className="truncate">
            {currentName || currentEmail}
          </span>
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Admin accounts</DropdownMenuLabel>

        <DropdownMenuLabel className="pt-0 font-normal">
          <p className="truncate font-medium">{currentName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {currentEmail}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {others.length > 0 ? (
          others.map((account) => (
            <DropdownMenuItem
              key={account.id}
              asChild
              className="p-0"
            >
              <SwitchAccountForm
                email={account.email}
                next="/admin"
              />
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuLabel className="font-normal text-muted-foreground">
            No other admin accounts available.
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}