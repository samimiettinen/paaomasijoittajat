import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Upload, Download, MessageCircle, ExternalLink, Eye } from 'lucide-react';
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember, useBulkImportMembers } from '@/hooks/useMembers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MemberDialog } from '@/components/MemberDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Member, MemberFormData } from '@/lib/types';
import { getWhatsAppLink } from '@/lib/whatsapp';
import { exportMembersToCSV, downloadCSV, parseCSV } from '@/lib/csv';

const statusLabels: Record<Member['membership_status'], string> = {
  active: 'Aktiivinen', pending: 'Odottava', inactive: 'Ei-aktiivinen', removed: 'Poistettu',
};

export default function MembersPage() {
  const navigate = useNavigate();
  const { data: members = [], isLoading } = useMembers();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const bulkImport = useBulkImportMembers();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  const filteredMembers = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter(m =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      m.mobile_phone.includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.organization?.toLowerCase().includes(q)
    );
  }, [members, search]);

  const handleSave = (data: MemberFormData) => {
    if (selectedMember) {
      updateMember.mutate({ ...data, id: selectedMember.id }, { onSuccess: () => { setDialogOpen(false); setSelectedMember(null); } });
    } else {
      createMember.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleExport = () => { downloadCSV(exportMembersToCSV(members), 'jasenet.csv'); };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const parsed = parseCSV(content);
      if (parsed.length > 0) bulkImport.mutate(parsed);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jäsenet</h1>
          <p className="text-muted-foreground">{members.length} jäsentä</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Vie CSV</Button>
          <label>
            <Button variant="outline" size="sm" asChild><span><Upload className="h-4 w-4 mr-2" />Tuo CSV</span></Button>
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
          <Button size="sm" onClick={() => { setSelectedMember(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Lisää jäsen</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Hae jäseniä..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nimi</TableHead>
              <TableHead>Puhelin</TableHead>
              <TableHead className="hidden md:table-cell">Sähköposti</TableHead>
              <TableHead className="hidden lg:table-cell">Organisaatio</TableHead>
              <TableHead>Tila</TableHead>
              <TableHead className="w-[100px]">Toiminnot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => (
              <TableRow key={member.id} className="cursor-pointer" onClick={() => { setSelectedMember(member); setDialogOpen(true); }}>
                <TableCell className="font-medium">{member.first_name} {member.last_name}{member.is_admin && <Badge variant="secondary" className="ml-2 text-xs">Admin</Badge>}</TableCell>
                <TableCell>{member.mobile_phone}</TableCell>
                <TableCell className="hidden md:table-cell">{member.email || '-'}</TableCell>
                <TableCell className="hidden lg:table-cell">{member.organization || '-'}</TableCell>
                <TableCell><Badge variant={member.membership_status === 'active' ? 'default' : 'secondary'}>{statusLabels[member.membership_status]}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/members/${member.id}`)} title="Näytä tiedot"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" asChild><a href={getWhatsAppLink(member.mobile_phone)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /></a></Button>
                    {member.linkedin_url && <Button variant="ghost" size="icon" asChild><a href={member.linkedin_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MemberDialog open={dialogOpen} onOpenChange={setDialogOpen} member={selectedMember} onSave={handleSave} isLoading={createMember.isPending || updateMember.isPending} />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poista jäsen?</AlertDialogTitle>
            <AlertDialogDescription>Haluatko varmasti poistaa jäsenen {memberToDelete?.first_name} {memberToDelete?.last_name}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Peruuta</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (memberToDelete) deleteMember.mutate(memberToDelete.id); setDeleteConfirmOpen(false); }}>Poista</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
