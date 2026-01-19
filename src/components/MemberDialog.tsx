import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2, Mail, Check, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMemberEventInvitations } from '@/hooks/useMembers';
import type { Member, MemberFormData, MembershipStatus } from '@/lib/types';

const memberSchema = z.object({
  first_name: z.string().min(1, 'Etunimi vaaditaan'),
  last_name: z.string().min(1, 'Sukunimi vaaditaan'),
  mobile_phone: z.string().min(1, 'Puhelinnumero vaaditaan'),
  email: z.string().email('Virheellinen sähköpostiosoite').optional().or(z.literal('')),
  secondary_email: z.string().email('Virheellinen sähköpostiosoite').optional().or(z.literal('')),
  organization: z.string().optional(),
  organization_role: z.string().optional(),
  linkedin_url: z.string().url('Virheellinen URL').optional().or(z.literal('')),
  github_url: z.string().url('Virheellinen URL').optional().or(z.literal('')),
  membership_status: z.enum(['active', 'pending', 'inactive', 'removed']),
  is_admin: z.boolean(),
  notes: z.string().optional(),
});

interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member | null;
  onSave: (data: MemberFormData) => void;
  onDelete?: (id: string) => void;
  onInviteToEvent?: (memberId: string) => void;
  isLoading?: boolean;
  isSaved?: boolean;
}

const statusOptions: { value: MembershipStatus; label: string }[] = [
  { value: 'active', label: 'Aktiivinen' },
  { value: 'pending', label: 'Odottava' },
  { value: 'inactive', label: 'Ei-aktiivinen' },
  { value: 'removed', label: 'Poistettu' },
];

export function MemberDialog({ open, onOpenChange, member, onSave, onDelete, onInviteToEvent, isLoading, isSaved }: MemberDialogProps) {
  const isEditing = !!member;
  const [showSavedState, setShowSavedState] = useState(false);
  const { data: invitations = [] } = useMemberEventInvitations(member?.id);

  const statusLabels: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
    invited: { label: 'Kutsuttu', icon: Clock, color: 'text-muted-foreground' },
    confirmed: { label: 'Vahvistettu', icon: CheckCircle, color: 'text-green-600' },
    declined: { label: 'Kieltäytynyt', icon: XCircle, color: 'text-red-600' },
    attended: { label: 'Osallistui', icon: CheckCircle, color: 'text-green-600' },
    no_show: { label: 'Ei saapunut', icon: XCircle, color: 'text-orange-600' },
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: member ? {
      first_name: member.first_name,
      last_name: member.last_name,
      mobile_phone: member.mobile_phone,
      email: member.email || '',
      secondary_email: member.secondary_email || '',
      organization: member.organization || '',
      organization_role: member.organization_role || '',
      linkedin_url: member.linkedin_url || '',
      github_url: member.github_url || '',
      membership_status: member.membership_status,
      is_admin: member.is_admin,
      notes: member.notes || '',
    } : {
      first_name: '',
      last_name: '',
      mobile_phone: '',
      email: '',
      secondary_email: '',
      organization: '',
      organization_role: '',
      linkedin_url: '',
      github_url: '',
      membership_status: 'active',
      is_admin: false,
      notes: '',
    },
  });

  // Show saved state when isSaved becomes true
  useEffect(() => {
    if (isSaved) {
      setShowSavedState(true);
      const timer = setTimeout(() => setShowSavedState(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  // Reset saved state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowSavedState(false);
    }
  }, [open]);

  const membershipStatus = watch('membership_status');
  const isAdmin = watch('is_admin');

  const onSubmit = (data: MemberFormData) => {
    onSave(data);
    if (!isEditing) {
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Muokkaa jäsentä' : 'Lisää uusi jäsen'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Päivitä jäsenen tiedot alla.'
              : 'Täytä uuden jäsenen tiedot.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">Etunimi *</Label>
              <Input
                id="first_name"
                {...register('first_name')}
                placeholder="Matti"
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Sukunimi *</Label>
              <Input
                id="last_name"
                {...register('last_name')}
                placeholder="Meikäläinen"
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile_phone">Puhelinnumero *</Label>
            <Input
              id="mobile_phone"
              {...register('mobile_phone')}
              placeholder="+358 40 123 4567"
            />
            {errors.mobile_phone && (
              <p className="text-sm text-destructive">{errors.mobile_phone.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Sähköposti</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="matti@example.fi"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_email">Toissijainen sähköposti</Label>
              <Input
                id="secondary_email"
                type="email"
                {...register('secondary_email')}
                placeholder="matti.työ@example.fi"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organization">Organisaatio</Label>
              <Input
                id="organization"
                {...register('organization')}
                placeholder="Yritys Oy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization_role">Rooli</Label>
              <Input
                id="organization_role"
                {...register('organization_role')}
                placeholder="Toimitusjohtaja"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                {...register('linkedin_url')}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github_url">GitHub URL</Label>
              <Input
                id="github_url"
                {...register('github_url')}
                placeholder="https://github.com/username"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="membership_status">Jäsenyystila</Label>
              <Select
                value={membershipStatus}
                onValueChange={(value) => setValue('membership_status', value as MembershipStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="is_admin"
                checked={isAdmin}
                onCheckedChange={(checked) => setValue('is_admin', checked)}
              />
              <Label htmlFor="is_admin" className="cursor-pointer">
                Admin-oikeudet
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Muistiinpanot</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Lisätietoja jäsenestä..."
              rows={3}
            />
          </div>

          {isEditing && invitations.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Tapahtumakutsut ({invitations.length})
              </Label>
              <ScrollArea className="h-32 rounded-md border p-3">
                <div className="space-y-2">
                  {invitations.map((inv: any) => {
                    const statusInfo = statusLabels[inv.status] || statusLabels.invited;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div key={inv.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                          <span>{inv.events?.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {new Date(inv.events?.event_date).toLocaleDateString('fi-FI')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 mr-auto">
              {isEditing && onDelete && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onDelete(member.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Poista
                </Button>
              )}
              {isEditing && onInviteToEvent && member.email && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => onInviteToEvent(member.id)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Kutsu tapahtumaan
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Peruuta
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className={showSavedState ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {showSavedState ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Tallennettu!
                  </>
                ) : isLoading ? (
                  'Tallennetaan...'
                ) : isEditing ? (
                  'Tallenna'
                ) : (
                  'Lisää jäsen'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
