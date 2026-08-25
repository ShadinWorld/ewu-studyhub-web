"use client";

import Link from "next/link";
import { Bell, CircleDollarSign, LayoutDashboard, LogOut, ShieldCheck, Store, User as UserIcon, Settings2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/(auth)/actions";
import type { UserRole } from "@/types/database.types";

type Role = UserRole;

interface UserMenuProps {
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: Role;
  isSeller: boolean;
}

function roleLabel(role: Role, isSeller: boolean): { label: string; icon: React.ReactNode } {
  if (role === "admin" || role === "super_admin") {
    return { label: "Admin", icon: <ShieldCheck className="h-3 w-3" /> };
  }
  if (isSeller || role === "seller") {
    return { label: "Seller", icon: <Store className="h-3 w-3" /> };
  }
  return { label: "Student", icon: <UserIcon className="h-3 w-3" /> };
}

function initials(name: string | null, email: string | null) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (email ?? "?")[0]?.toUpperCase() ?? "?";
}

export function UserMenu({ fullName, email, avatarUrl, role, isSeller }: UserMenuProps) {
  const { label, icon } = roleLabel(role, isSeller);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Avatar className="h-9 w-9 border">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? "Profile"} />}
          <AvatarFallback>{initials(fullName, email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium leading-none">{fullName || "Unnamed user"}</p>
            <p className="text-xs leading-none text-muted-foreground break-all">{email}</p>
            <Badge variant="secondary" className="mt-2 w-fit gap-1">
              {icon}
              {label}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/history" className="cursor-pointer">
            Activity history
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="cursor-pointer">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </Link>
        </DropdownMenuItem>
        {(isSeller || role === "seller") && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard/sales" className="cursor-pointer">
              <CircleDollarSign className="mr-2 h-4 w-4" />
              Sales & earnings
            </Link>
          </DropdownMenuItem>
        )}
        {!isSeller && role !== "seller" && role !== "admin" && role !== "super_admin" && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard/become-seller" className="cursor-pointer">
              <Store className="mr-2 h-4 w-4" />
              Become a seller
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/account" className="cursor-pointer"><Settings2 className="mr-2 h-4 w-4" />Account</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer text-destructive focus:text-destructive">
          <form action={logoutAction} className="w-full">
            <button type="submit" className="flex w-full items-center">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
