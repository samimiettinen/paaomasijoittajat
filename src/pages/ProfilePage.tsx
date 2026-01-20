import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useMember, useUpdateMember } from '@/hooks/useMembers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AvatarUpload } from '@/components/AvatarUpload';

const profileSchema = z.object({
  first_name: z.string().min(1, 'Etunimi vaaditaan'),
  last_name: z.string().min(1, 'Sukunimi vaaditaan'),
  mobile_phone: z.string().min(1, 'Puhelinnumero vaaditaan'),
  email: z.string().email('Virheellinen sähköpostiosoite'),
  secondary_email: z.string().email('Virheellinen sähköpostiosoite').optional().or(z.literal('')),
  organization: z.string().optional(),
  organization_role: z.string().optional(),
  linkedin_url: z.string().url('Virheellinen URL').optional().or(z.literal('')),
  github_url: z.string().url('Virheellinen URL').optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Nykyinen salasana vaaditaan'),
  newPassword: z.string().min(8, 'Salasanan täytyy olla vähintään 8 merkkiä'),
  confirmPassword: z.string().min(1, 'Vahvista salasana'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Salasanat eivät täsmää',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { memberId, user } = useAuth();
  const { data: member, isLoading } = useMember(memberId || '');
  const updateMember = useUpdateMember();
  const [profileSaved, setProfileSaved] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      mobile_phone: '',
      email: '',
      secondary_email: '',
      organization: '',
      organization_role: '',
      linkedin_url: '',
      github_url: '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Update form when member data loads
  useEffect(() => {
    if (member) {
      profileForm.reset({
        first_name: member.first_name,
        last_name: member.last_name,
        mobile_phone: member.mobile_phone,
        email: member.email || '',
        secondary_email: member.secondary_email || '',
        organization: member.organization || '',
        organization_role: member.organization_role || '',
        linkedin_url: member.linkedin_url || '',
        github_url: member.github_url || '',
      });
    }
  }, [member, profileForm]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!memberId) return;
    
    updateMember.mutate(
      { 
        first_name: data.first_name,
        last_name: data.last_name,
        mobile_phone: data.mobile_phone,
        email: data.email,
        secondary_email: data.secondary_email || '',
        organization: data.organization || '',
        organization_role: data.organization_role || '',
        linkedin_url: data.linkedin_url || '',
        github_url: data.github_url || '',
        notes: member?.notes || '',
        id: memberId,
        membership_status: member?.membership_status || 'active',
        is_admin: member?.is_admin || false,
      },
      {
        onSuccess: () => {
          setProfileSaved(true);
          setTimeout(() => setProfileSaved(false), 2000);
        },
      }
    );
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      
      if (error) throw error;
      
      toast.success('Salasana vaihdettu onnistuneesti');
      passwordForm.reset();
    } catch (error: any) {
      toast.error(`Virhe salasanan vaihdossa: ${error.message}`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Ladataan...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Omat tiedot</h1>
        <p className="text-muted-foreground">Hallinnoi profiiliasi ja salasanaasi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profiilitiedot
          </CardTitle>
          <CardDescription>
            Päivitä yhteystietosi ja muut tiedot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
            {/* Avatar Upload */}
            <AvatarUpload
              currentAvatarUrl={member?.avatar_url}
              firstName={member?.first_name}
              lastName={member?.last_name}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Etunimi *</Label>
                <Input id="first_name" {...profileForm.register('first_name')} />
                {profileForm.formState.errors.first_name && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Sukunimi *</Label>
                <Input id="last_name" {...profileForm.register('last_name')} />
                {profileForm.formState.errors.last_name && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile_phone">Puhelinnumero *</Label>
              <Input id="mobile_phone" {...profileForm.register('mobile_phone')} />
              {profileForm.formState.errors.mobile_phone && (
                <p className="text-sm text-destructive">{profileForm.formState.errors.mobile_phone.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Sähköposti *</Label>
                <Input id="email" type="email" {...profileForm.register('email')} />
                {profileForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_email">Toissijainen sähköposti</Label>
                <Input id="secondary_email" type="email" {...profileForm.register('secondary_email')} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="organization">Organisaatio</Label>
                <Input id="organization" {...profileForm.register('organization')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization_role">Rooli</Label>
                <Input id="organization_role" {...profileForm.register('organization_role')} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input id="linkedin_url" {...profileForm.register('linkedin_url')} placeholder="https://linkedin.com/in/username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github_url">GitHub URL</Label>
                <Input id="github_url" {...profileForm.register('github_url')} placeholder="https://github.com/username" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={updateMember.isPending}
                className={profileSaved ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {profileSaved ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Tallennettu!
                  </>
                ) : updateMember.isPending ? (
                  'Tallennetaan...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Tallenna
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Vaihda salasana
          </CardTitle>
          <CardDescription>
            Päivitä kirjautumissalasanasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Nykyinen salasana</Label>
              <Input id="currentPassword" type="password" {...passwordForm.register('currentPassword')} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Uusi salasana</Label>
                <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Vahvista uusi salasana</Label>
                <Input id="confirmPassword" type="password" {...passwordForm.register('confirmPassword')} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? 'Vaihdetaan...' : 'Vaihda salasana'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}