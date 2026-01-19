import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, UserPlus, Shield, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useMembers } from '@/hooks/useMembers';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AdminLevel = Database['public']['Enums']['admin_level'];

const vibeCoderSchema = z.object({
  member_id: z.string().min(1, 'Valitse jäsen'),
  admin_level: z.enum(['vibe_coder', 'regular', 'super']),
});

type VibeCoderFormData = z.infer<typeof vibeCoderSchema>;

interface AdminWithMember {
  id: string;
  member_id: string;
  admin_level: AdminLevel;
  created_at: string;
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  };
}

export default function VibeCodersPage() {
  const queryClient = useQueryClient();
  const { data: members = [] } = useMembers();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminWithMember | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<VibeCoderFormData>({
    resolver: zodResolver(vibeCoderSchema),
    defaultValues: {
      member_id: '',
      admin_level: 'vibe_coder',
    },
  });

  const selectedMemberId = watch('member_id');
  const selectedAdminLevel = watch('admin_level');

  // Fetch all admins with member info
  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admins-with-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admins')
        .select(`
          id,
          member_id,
          admin_level,
          created_at,
          members (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(admin => ({
        ...admin,
        member: admin.members as unknown as AdminWithMember['member']
      })) as AdminWithMember[];
    },
  });

  // Members who are not yet admins
  const availableMembers = useMemo(() => {
    const adminMemberIds = new Set(admins.map(a => a.member_id));
    return members.filter(m => !adminMemberIds.has(m.id));
  }, [members, admins]);

  // Filtered admins by search
  const filteredAdmins = useMemo(() => {
    if (!search) return admins;
    const q = search.toLowerCase();
    return admins.filter(a => 
      `${a.member?.first_name} ${a.member?.last_name}`.toLowerCase().includes(q) ||
      a.member?.email?.toLowerCase().includes(q)
    );
  }, [admins, search]);

  // Create admin mutation
  const createAdmin = useMutation({
    mutationFn: async (data: VibeCoderFormData) => {
      const { error } = await supabase
        .from('admins')
        .insert({
          member_id: data.member_id,
          admin_level: data.admin_level,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-with-members'] });
      toast.success('Käyttäjä lisätty onnistuneesti');
      setDialogOpen(false);
      reset();
    },
    onError: (error: Error) => {
      toast.error(`Virhe: ${error.message}`);
    },
  });

  // Delete admin mutation
  const deleteAdmin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-with-members'] });
      toast.success('Käyttäjä poistettu');
      setDeleteConfirmOpen(false);
      setAdminToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`Virhe: ${error.message}`);
    },
  });

  // Update admin level mutation
  const updateAdminLevel = useMutation({
    mutationFn: async ({ id, admin_level }: { id: string; admin_level: AdminLevel }) => {
      const { error } = await supabase
        .from('admins')
        .update({ admin_level })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-with-members'] });
      toast.success('Rooli päivitetty');
    },
    onError: (error: Error) => {
      toast.error(`Virhe: ${error.message}`);
    },
  });

  const onSubmit = (data: VibeCoderFormData) => {
    createAdmin.mutate(data);
  };

  const getLevelBadge = (level: AdminLevel) => {
    switch (level) {
      case 'super':
        return <Badge className="bg-purple-600">Super Admin</Badge>;
      case 'regular':
        return <Badge className="bg-blue-600">Admin</Badge>;
      case 'vibe_coder':
        return <Badge variant="secondary">Vibe Coder</Badge>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Käyttäjähallinta
          </h1>
          <p className="text-muted-foreground">Hallinnoi järjestelmän käyttäjiä ja oikeuksia</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Lisää käyttäjä
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Super Adminit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{admins.filter(a => a.admin_level === 'super').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Adminit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{admins.filter(a => a.admin_level === 'regular').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vibe Coderit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{admins.filter(a => a.admin_level === 'vibe_coder').length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Hae käyttäjiä..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="pl-10" 
        />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nimi</TableHead>
              <TableHead>Sähköposti</TableHead>
              <TableHead>Rooli</TableHead>
              <TableHead>Lisätty</TableHead>
              <TableHead className="w-[100px]">Toiminnot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdmins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">
                  {admin.member?.first_name} {admin.member?.last_name}
                </TableCell>
                <TableCell>{admin.member?.email || '-'}</TableCell>
                <TableCell>
                  <Select
                    value={admin.admin_level}
                    onValueChange={(value) => updateAdminLevel.mutate({ id: admin.id, admin_level: value as AdminLevel })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super">Super Admin</SelectItem>
                      <SelectItem value="regular">Admin</SelectItem>
                      <SelectItem value="vibe_coder">Vibe Coder</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(admin.created_at).toLocaleDateString('fi-FI')}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setAdminToDelete(admin); setDeleteConfirmOpen(true); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredAdmins.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {isLoading ? 'Ladataan...' : 'Ei käyttäjiä'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lisää käyttäjä</DialogTitle>
            <DialogDescription>
              Valitse jäsen ja määritä käyttöoikeudet
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Jäsen *</Label>
              <Select
                value={selectedMemberId}
                onValueChange={(value) => setValue('member_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Valitse jäsen..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name} {member.email ? `(${member.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.member_id && (
                <p className="text-sm text-destructive">{errors.member_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Rooli *</Label>
              <Select
                value={selectedAdminLevel}
                onValueChange={(value) => setValue('admin_level', value as 'vibe_coder' | 'regular' | 'super')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vibe_coder">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Vibe Coder</Badge>
                      <span className="text-muted-foreground text-xs">- Voi muokata omia tietoja</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="regular">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 text-xs">Admin</Badge>
                      <span className="text-muted-foreground text-xs">- Täydet hallintaoikeudet</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="super">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600 text-xs">Super Admin</Badge>
                      <span className="text-muted-foreground text-xs">- Kaikki oikeudet</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Peruuta
              </Button>
              <Button type="submit" disabled={createAdmin.isPending}>
                {createAdmin.isPending ? 'Lisätään...' : 'Lisää käyttäjä'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poista käyttäjä?</AlertDialogTitle>
            <AlertDialogDescription>
              Haluatko varmasti poistaa käyttäjän {adminToDelete?.member?.first_name} {adminToDelete?.member?.last_name} käyttöoikeudet? Tämä ei poista jäsentä jäsenrekisteristä.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Peruuta</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => adminToDelete && deleteAdmin.mutate(adminToDelete.id)}
            >
              Poista oikeudet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}