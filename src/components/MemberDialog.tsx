import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  isLoading?: boolean;
}

const statusOptions: { value: MembershipStatus; label: string }[] = [
  { value: 'active', label: 'Aktiivinen' },
  { value: 'pending', label: 'Odottava' },
  { value: 'inactive', label: 'Ei-aktiivinen' },
  { value: 'removed', label: 'Poistettu' },
];

export function MemberDialog({ open, onOpenChange, member, onSave, isLoading }: MemberDialogProps) {
  const isEditing = !!member;

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

  const membershipStatus = watch('membership_status');
  const isAdmin = watch('is_admin');

  const onSubmit = (data: MemberFormData) => {
    onSave(data);
    reset();
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Peruuta
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Tallennetaan...' : isEditing ? 'Tallenna' : 'Lisää jäsen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
