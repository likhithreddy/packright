'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/profile.types';
import { getInitials } from '@/lib/profile-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserCircle, Settings, LogOut } from 'lucide-react';

interface NavbarProps {
  profile: Profile;
}

export default function Navbar({ profile }: NavbarProps) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (!mounted) {
    return (
      <nav className="h-16 w-full bg-[#4A3728] shadow-md flex items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center">
          <span className="text-2xl font-serif text-white italic tracking-wide">
            Pack<span className="text-[#C49B6C]">Right</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-8 h-4 bg-white/10 rounded animate-pulse hidden sm:block" />
          <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
        </div>
      </nav>
    );
  }

  return (
    <nav className="h-16 w-full bg-[#4A3728] shadow-md flex items-center justify-between px-6">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center">
        <span className="text-2xl font-serif text-white italic tracking-wide">
          Pack<span className="text-[#C49B6C]">Right</span>
        </span>
      </Link>

      {/* Right side: Username + Avatar Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className="flex items-center gap-3 hover:opacity-90 transition-opacity focus:outline-none"
              aria-label="User menu"
            />
          }
        >
          <span className="text-sm text-white/80 font-medium hidden sm:inline">
            {profile.username}
          </span>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm cursor-pointer"
            style={{ backgroundColor: profile.avatar_theme || '#8B6914' }}
          >
            {getInitials(profile.full_name)}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">@{profile.username}</p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/dashboard/profile" className="cursor-pointer" />}>
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Your Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/dashboard/settings" className="cursor-pointer" />}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Account Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
