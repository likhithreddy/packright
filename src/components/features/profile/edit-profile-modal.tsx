'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Profile } from '@/types/profile.types';
import { AVATAR_COLORS, PACKING_STYLES } from '@/types/profile.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, User, AtSign, Palette, Backpack, Lock } from 'lucide-react';

import { getInitials } from '@/lib/profile-utils';
import { editProfileSchema, type EditProfileFormValues } from '@/types/edit-profile.schema';

interface EditProfileModalProps {
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdate: (updated: Profile) => void;
}

export default function EditProfileModal({
  profile,
  open,
  onOpenChange,
  onProfileUpdate,
}: EditProfileModalProps) {
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      full_name: profile.full_name || '',
      avatar_theme: profile.avatar_theme || AVATAR_COLORS[0].value,
      packing_style: profile.packing_style || PACKING_STYLES[0],
    },
  });

  const handleSubmit = async (values: EditProfileFormValues) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          avatar_theme: values.avatar_theme,
          packing_style: values.packing_style,
        })
        .eq('id', profile.id);

      if (error) {
        toast.error('Failed to update profile. Please try again.');
        return;
      }

      const updatedProfile: Profile = {
        ...profile,
        full_name: values.full_name,
        avatar_theme: values.avatar_theme,
        packing_style: values.packing_style,
      };

      onProfileUpdate(updatedProfile);
      toast.success('Profile updated successfully!');
      onOpenChange(false);
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedName = form.watch('full_name');
  const watchedColor = form.watch('avatar_theme');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile details. Your handle cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Avatar Preview */}
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-all duration-300"
                style={{ backgroundColor: watchedColor }}
              >
                {getInitials(watchedName)}
              </div>
            </div>

            {/* Handle (Locked) */}
            <TooltipProvider>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                  <AtSign className="h-4 w-4" />
                  Handle
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Your handle is permanently locked and cannot be changed.</p>
                    </TooltipContent>
                  </Tooltip>
                </label>
                <Input
                  value={`@${profile.username}`}
                  disabled
                  className="h-12 bg-muted/50 text-muted-foreground cursor-not-allowed"
                />
              </div>
            </TooltipProvider>

            {/* Full Name */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-foreground/80">
                    <User className="h-4 w-4" />
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your full name"
                      className="h-12 bg-secondary/30 border-border/50 focus-visible:ring-0 focus:ring-0 focus:border-primary/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Avatar Color Picker */}
            <FormField
              control={form.control}
              name="avatar_theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-foreground/80">
                    <Palette className="h-4 w-4" />
                    Avatar Color
                  </FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-3">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => field.onChange(color.value)}
                          className={`w-9 h-9 rounded-full transition-all duration-200 border-2 ${
                            field.value === color.value
                              ? 'border-foreground scale-110 shadow-md'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                          aria-label={`Select ${color.name} avatar color`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Packing Style */}
            <FormField
              control={form.control}
              name="packing_style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-foreground/80">
                    <Backpack className="h-4 w-4" />
                    Packing Style
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-2">
                      {PACKING_STYLES.map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => field.onChange(style)}
                          className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 border ${
                            field.value === style
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-secondary/30 text-foreground/70 border-border/50 hover:bg-secondary/50'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 text-sm font-semibold"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-11 text-sm font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
