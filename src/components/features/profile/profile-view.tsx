'use client';

import { useState, useEffect } from 'react';
import type { Profile } from '@/types/profile.types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, MapPin, Package, Users } from 'lucide-react';
import EditProfileModal from '@/components/features/profile/edit-profile-modal';

interface ProfileViewProps {
  profile: Profile;
  email: string;
  providers: string[];
}

export default function ProfileView({ profile, email, providers: _providers }: ProfileViewProps) {
  const [currentProfile, setCurrentProfile] = useState<Profile>(profile);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // ISSUE-#36: Sync state when profile prop changes (e.g., during rerender in tests)
  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setCurrentProfile(updatedProfile);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 min-h-0">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg flex-shrink-0"
              style={{ backgroundColor: currentProfile.avatar_theme || '#8B6914' }}
            >
              {getInitials(currentProfile.full_name)}
            </div>

            {/* Name & Details */}
            <div className="flex-1 space-y-1">
              <h1 className="text-3xl font-serif font-bold text-foreground">
                {currentProfile.full_name || 'No Name Set'}
              </h1>
              <p className="text-muted-foreground text-sm">
                @{currentProfile.username} &middot; {email}
              </p>
              {currentProfile.packing_style && (
                <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-[#4A3728] text-white">
                  {currentProfile.packing_style}
                </span>
              )}
            </div>

            {/* Edit Button */}
            <Button
              variant="outline"
              className="h-10 px-5 border-foreground/50 text-foreground font-semibold gap-2"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>

          <Separator />

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="flex flex-col items-center justify-center p-6 border-border/50">
              <MapPin className="h-5 w-5 text-muted-foreground mb-2" />
              <Skeleton className="h-8 w-10 mb-1" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Trips
              </p>
            </Card>
            <Card className="flex flex-col items-center justify-center p-6 border-border/50">
              <Package className="h-5 w-5 text-muted-foreground mb-2" />
              <Skeleton className="h-8 w-10 mb-1" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Items Packed
              </p>
            </Card>
            <Card className="flex flex-col items-center justify-center p-6 border-border/50">
              <Users className="h-5 w-5 text-muted-foreground mb-2" />
              <Skeleton className="h-8 w-10 mb-1" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Friends
              </p>
            </Card>
          </div>

          {/* Trip History Section - Skeleton */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Trip History
            </h2>
            <Separator />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 border-border/30 bg-card/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        <EditProfileModal
          profile={currentProfile}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onProfileUpdate={handleProfileUpdate}
        />
      </div>
    </div>
  );
}
