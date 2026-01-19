import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, UserPlus, Shield, Mail, RefreshCw, CheckCircle2, XCircle, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

// Generate a random secure password
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%&*';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  return password;
};

const vibeCoderSchema = z.object({
  member_id: z.string().min(1, 'Valitse jäsen'),
  admin_level: z.enum(['vibe_coder', 'regular', 'super']),
  send_email: z.boolean().default(true),
  auto_create_account: z.boolean().default(true),
  temp_password: z.string().min(8, 'Salasanan tulee olla vähintään 8 merkkiä').optional().or(z.literal('')),
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
  const [resendingCredentials, setResendingCredentials] = useState<string | null>(null);

  const [sendingEmail, setSendingEmail] = useState(false);
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<VibeCoderFormData>({
    resolver: zodResolver(vibeCoderSchema),
    defaultValues: {
      member_id: '',
      admin_level: 'vibe_coder',
      send_email: true,
      auto_create_account: true,
      temp_password: generatePassword(),
    },
  });

  const selectedMemberId = watch('member_id');
  const selectedAdminLevel = watch('admin_level');
  const sendEmail = watch('send_email');
  const autoCreateAccount = watch('auto_create_account');
  const tempPassword = watch('temp_password');

  const regeneratePassword = () => {
    setValue('temp_password', generatePassword());
  };

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

  // Fetch auth status for all admin emails
  const { data: authStatus = {} } = useQuery({
    queryKey: ['auth-status', admins.map(a => a.member?.email).filter(Boolean)],
    queryFn: async () => {
      const emails = admins
        .map(a => a.member?.email)
        .filter((e): e is string => !!e);
      
      if (emails.length === 0) return {};
      
      const response = await supabase.functions.invoke('check-auth-status', {
        body: { emails },
      });
      
      if (response.error) {
        console.error('Failed to fetch auth status:', response.error);
        return {};
      }
      
      return response.data?.results || {};
    },
    enabled: admins.length > 0,
    staleTime: 30000,
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
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['admins-with-members'] });
      
      // Send welcome email if enabled
      if (data.send_email) {
        setSendingEmail(true);
        try {
          const response = await supabase.functions.invoke('send-vibecoder-welcome', {
            body: {
              memberId: data.member_id,
              adminLevel: data.admin_level,
              tempPassword: data.auto_create_account ? data.temp_password : undefined,
            },
          });
          
          if (response.error) {
            toast.error(`Käyttäjä lisätty, mutta sähköpostin lähetys epäonnistui: ${response.error.message}`);
          } else {
            toast.success('Käyttäjä lisätty ja tervetulosähköposti lähetetty');
            // Refresh auth status
            queryClient.invalidateQueries({ queryKey: ['auth-status'] });
          }
        } catch (emailError: any) {
          toast.error(`Käyttäjä lisätty, mutta sähköpostin lähetys epäonnistui: ${emailError.message}`);
        } finally {
          setSendingEmail(false);
        }
      } else {
        toast.success('Käyttäjä lisätty onnistuneesti');
      }
      
      setDialogOpen(false);
      reset({
        member_id: '',
        admin_level: 'vibe_coder',
        send_email: true,
        auto_create_account: true,
        temp_password: generatePassword(),
      });
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

  // Resend credentials function
  const handleResendCredentials = async (admin: AdminWithMember) => {
    if (!admin.member?.email) {
      toast.error('Käyttäjällä ei ole sähköpostiosoitetta');
      return;
    }

    setResendingCredentials(admin.id);
    const newPassword = generatePassword();

    try {
      const response = await supabase.functions.invoke('send-vibecoder-welcome', {
        body: {
          memberId: admin.member_id,
          adminLevel: admin.admin_level,
          tempPassword: newPassword,
        },
      });

      if (response.error) {
        toast.error(`Tunnusten lähetys epäonnistui: ${response.error.message}`);
      } else {
        toast.success('Uudet tunnukset lähetetty sähköpostiin');
        // Refresh auth status
        queryClient.invalidateQueries({ queryKey: ['auth-status'] });
      }
    } catch (error: any) {
      toast.error(`Tunnusten lähetys epäonnistui: ${error.message}`);
    } finally {
      setResendingCredentials(null);
    }
  };

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

  const getAuthStatusBadge = (email: string | null) => {
    if (!email) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <XCircle className="h-3 w-3" />
                Ei sähköpostia
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Käyttäjällä ei ole sähköpostiosoitetta</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    const hasAuth = authStatus[email.toLowerCase()];
    
    if (hasAuth) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <CheckCircle2 className="h-3 w-3" />
                Tili aktiivinen
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Käyttäjä voi kirjautua sisään</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
              <KeyRound className="h-3 w-3" />
              Ei tiliä
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Käyttäjän täytyy rekisteröityä tai saada tunnukset</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
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
              <TableHead>Tili</TableHead>
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
                <TableCell className="text-muted-foreground">{admin.member?.email || '-'}</TableCell>
                <TableCell>{getAuthStatusBadge(admin.member?.email || null)}</TableCell>
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
                  <div className="flex items-center gap-1">
                    {/* Show resend button for users without auth accounts - allow for ANY admin role */}
                    {admin.member?.email && authStatus[admin.member.email.toLowerCase()] === false && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResendCredentials(admin)}
                              disabled={resendingCredentials === admin.id}
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                            >
                              {resendingCredentials === admin.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Lähetä kirjautumistunnukset</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setAdminToDelete(admin); setDeleteConfirmOpen(true); }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredAdmins.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="send_email"
                checked={sendEmail}
                onChange={(e) => setValue('send_email', e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="send_email" className="text-sm font-normal cursor-pointer">
                Lähetä tervetulosähköposti kirjautumistiedoilla
              </Label>
            </div>

            {sendEmail && (
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="auto_create_account"
                    checked={autoCreateAccount}
                    onChange={(e) => setValue('auto_create_account', e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="auto_create_account" className="text-sm font-normal cursor-pointer">
                    Luo käyttäjätili automaattisesti (suositeltu)
                  </Label>
                </div>

                {autoCreateAccount && (
                  <div className="space-y-2">
                    <Label>Väliaikainen salasana</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        {...register('temp_password')}
                        className="font-mono"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={regeneratePassword}
                        title="Luo uusi salasana"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.temp_password && (
                      <p className="text-sm text-destructive">{errors.temp_password.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Käyttäjälle luodaan tili tällä salasanalla. He saavat ohjeet vaihtaa salasanan ensimmäisellä kirjautumisella.
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Peruuta
              </Button>
              <Button type="submit" disabled={createAdmin.isPending || sendingEmail}>
                {createAdmin.isPending || sendingEmail ? 'Lisätään...' : 'Lisää käyttäjä'}
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