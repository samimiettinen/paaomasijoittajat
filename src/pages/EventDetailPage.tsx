import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import { ArrowLeft, Calendar, Clock, MapPin, Download, Edit, Trash2, UserPlus, Users, MessageSquare, Mail, Loader2, Link, Copy, FileText, Eye, Pencil } from 'lucide-react';
import { useEvent, useEventParticipants, useUpdateEvent, useDeleteEvent, useInviteMembers, useUpdateParticipantStatus } from '@/hooks/useEvents';
import { useEmailSends } from '@/hooks/useEmailSends';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EventDialog } from '@/components/EventDialog';
import { BulkWhatsAppDialog } from '@/components/BulkWhatsAppDialog';
import { downloadICS } from '@/lib/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Event, EventFormData, ParticipantStatus } from '@/lib/types';

const statusLabels: Record<ParticipantStatus, string> = {
  invited: 'Listalla',
  confirmed: 'Vahvistettu',
  declined: 'Kieltäytynyt',
  attended: 'Osallistui',
  no_show: 'Ei saapunut',
};

const statusVariants: Record<ParticipantStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  invited: 'secondary',
  confirmed: 'default',
  declined: 'destructive',
  attended: 'default',
  no_show: 'outline',
};

const eventStatusLabels: Record<Event['status'], string> = {
  draft: 'Luonnos',
  published: 'Julkaistu',
  cancelled: 'Peruttu',
  completed: 'Päättynyt',
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading: eventLoading } = useEvent(id || '');
  const { data: participants = [], refetch: refetchParticipants } = useEventParticipants(id || '');
  const { data: allMembers = [] } = useMembers();
  const { data: emailSends = [], refetch: refetchEmailSends } = useEmailSends(id || '');
  const { memberId } = useAuth();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const inviteMembers = useInviteMembers();
  const updateStatus = useUpdateParticipantStatus();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedEmailRecipients, setSelectedEmailRecipients] = useState<string[]>([]);
  const [sendingEmails, setSendingEmails] = useState(false);
  
  // Email editing state
  const [editableInvitationText, setEditableInvitationText] = useState('');
  const [editableEmailSignature, setEditableEmailSignature] = useState('');
  const [emailViewMode, setEmailViewMode] = useState<'preview' | 'edit'>('preview');

  if (eventLoading || !event) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Ladataan...</p>
      </div>
    );
  }

  const eventDate = new Date(event.event_date);
  const participantIds = participants.map(p => p.member_id);
  const availableMembers = allMembers.filter(m => !participantIds.includes(m.id) && m.membership_status === 'active');

  const stats = {
    total: participants.length,
    confirmed: participants.filter(p => p.status === 'confirmed').length,
    declined: participants.filter(p => p.status === 'declined').length,
    attended: participants.filter(p => p.status === 'attended').length,
  };

  const handleUpdateEvent = (data: EventFormData) => {
    updateEvent.mutate({ ...data, id: event.id }, { onSuccess: () => setEditDialogOpen(false) });
  };

  const handleDeleteEvent = () => {
    deleteEvent.mutate(event.id, { onSuccess: () => navigate('/events') });
  };

  const handleInviteMembers = () => {
    if (selectedMembers.length === 0) return;
    inviteMembers.mutate({ eventId: event.id, memberIds: selectedMembers }, {
      onSuccess: () => { setInviteDialogOpen(false); setSelectedMembers([]); }
    });
  };

  const handleInviteAll = () => {
    const allActiveIds = availableMembers.map(m => m.id);
    inviteMembers.mutate({ eventId: event.id, memberIds: allActiveIds }, {
      onSuccess: () => setInviteDialogOpen(false)
    });
  };

  const handleStatusChange = (participantId: string, status: ParticipantStatus) => {
    updateStatus.mutate({ id: participantId, status });
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]);
  };

  const copyInvitationLink = async (invitationToken: string) => {
    const baseUrl = window.location.origin;
    const invitationUrl = `${baseUrl}/rsvp?token=${invitationToken}`;
    await navigator.clipboard.writeText(invitationUrl);
    toast.success('Kutsulinkki kopioitu leikepöydälle');
  };

  const handleSendEmails = async (memberIds: string[]) => {
    if (memberIds.length === 0) return;

    setSendingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-event-invitation', {
        body: { 
          eventId: event.id, 
          memberIds, 
          senderMemberId: memberId,
          customInvitationText: editableInvitationText,
          customEmailSignature: editableEmailSignature
        }
      });

      if (error) throw error;

      toast.success(`Sähköpostit lähetetty: ${data.message}`);
      setSelectedEmailRecipients([]);
      setEmailPreviewOpen(false);
      // Refresh email sends to show updated history
      refetchEmailSends();
    } catch (error: any) {
      console.error('Error sending emails:', error);
      toast.error('Sähköpostien lähetys epäonnistui');
    } finally {
      setSendingEmails(false);
    }
  };

  // Helper to check if member has received email
  const hasReceivedEmail = (memberIdToCheck: string): boolean => {
    return emailSends.some(s => s.member_id === memberIdToCheck);
  };

  // Helper to get last email send date for a member
  const getLastEmailSendDate = (memberIdToCheck: string) => {
    const sends = emailSends.filter(s => s.member_id === memberIdToCheck);
    if (sends.length === 0) return null;
    return new Date(sends[0].sent_at);
  };

  // Get display status based on participant status and email history
  const getDisplayStatus = (participant: { status: ParticipantStatus; member_id: string }) => {
    if (participant.status === 'invited') {
      if (hasReceivedEmail(participant.member_id)) {
        return { label: 'Kutsuttu', variant: 'secondary' as const };
      }
      return { label: 'Listalla', variant: 'outline' as const };
    }
    return { label: statusLabels[participant.status], variant: statusVariants[participant.status] };
  };

  const openEmailPreview = () => {
    // Pre-select all participants with email
    const participantsWithEmail = participants
      .filter(p => p.member?.email)
      .map(p => p.member_id);
    setSelectedEmailRecipients(participantsWithEmail);
    // Initialize editable fields from event data
    setEditableInvitationText(event?.invitation_text || '');
    setEditableEmailSignature(event?.email_signature || 'Ystävällisin terveisin,\nPääomaomistajien vibe coding society');
    setEmailViewMode('preview');
    setEmailPreviewOpen(true);
  };

  const toggleEmailRecipient = (memberId: string) => {
    setSelectedEmailRecipients(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    );
  };

  const selectAllEmailRecipients = () => {
    const allWithEmail = participants
      .filter(p => p.member?.email)
      .map(p => p.member_id);
    setSelectedEmailRecipients(allWithEmail);
  };

  const deselectAllEmailRecipients = () => {
    setSelectedEmailRecipients([]);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <Badge variant={event.status === 'published' ? 'default' : 'secondary'}>
              {eventStatusLabels[event.status]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadICS(event)}>
            <Download className="h-4 w-4 mr-2" />Lataa .ics kalenteriisi
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />Muokkaa
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Event Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tapahtuman tiedot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{format(eventDate, 'EEEE d. MMMM yyyy', { locale: fi })}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>{event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}</span>
            </div>
            {event.location_name && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{event.location_name}</p>
                  {event.location_address && <p className="text-muted-foreground">{event.location_address}</p>}
                  {event.location_city && <p className="text-muted-foreground">{event.location_city}</p>}
                </div>
              </div>
            )}
            {event.description && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
            {event.invitation_text && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Kutsuteksti</span>
                </div>
                <div className="bg-secondary/50 p-4 rounded-lg border-l-4 border-primary">
                  <p className="text-sm whitespace-pre-wrap">{event.invitation_text}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Osallistujat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-muted-foreground">Kutsuttu</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-2xl font-bold text-success">{stats.confirmed}</p>
                <p className="text-muted-foreground">Vahvistettu</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-2xl font-bold">{stats.attended}</p>
                <p className="text-muted-foreground">Osallistui</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-2xl font-bold text-destructive">{stats.declined}</p>
                <p className="text-muted-foreground">Kieltäytyi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participants Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Osallistujalista</CardTitle>
          <div className="flex gap-2">
            {participants.length > 0 && (
              <>
                <Button variant="outline" onClick={openEmailPreview} disabled={sendingEmails}>
                  {sendingEmails ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Sähköposti
                </Button>
                <Button variant="outline" onClick={() => setWhatsappDialogOpen(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />WhatsApp
                </Button>
              </>
            )}
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />Lisää osallistujalistalle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Ei kutsuttuja jäseniä vielä.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nimi</TableHead>
                  <TableHead>Puhelin</TableHead>
                  <TableHead>Organisaatio</TableHead>
                  <TableHead>Aikaisin saapuminen</TableHead>
                  <TableHead>Tila</TableHead>
                  <TableHead className="w-[180px]">Muuta tilaa</TableHead>
                  <TableHead className="w-[100px]">Kutsulinkki</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">
                      {participant.member?.first_name} {participant.member?.last_name}
                    </TableCell>
                    <TableCell>{participant.member?.mobile_phone}</TableCell>
                    <TableCell>{participant.member?.organization || '-'}</TableCell>
                    <TableCell>
                      {participant.early_arrival === true ? (
                        <Badge variant="outline" className="bg-primary/10">Kyllä</Badge>
                      ) : participant.early_arrival === false ? (
                        <span className="text-muted-foreground">Ei</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const displayStatus = getDisplayStatus(participant);
                        return (
                          <Badge variant={displayStatus.variant}>
                            {displayStatus.label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={participant.status}
                        onValueChange={(value) => handleStatusChange(participant.id, value as ParticipantStatus)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="invited">
                            {hasReceivedEmail(participant.member_id) ? 'Kutsuttu' : 'Listalla'}
                          </SelectItem>
                          <SelectItem value="confirmed">Vahvistettu</SelectItem>
                          <SelectItem value="declined">Kieltäytynyt</SelectItem>
                          <SelectItem value="attended">Osallistui</SelectItem>
                          <SelectItem value="no_show">Ei saapunut</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {participant.invitation_token && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyInvitationLink(participant.invitation_token!)}
                          title="Kopioi kutsulinkki"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lisää osallistujalistalle</DialogTitle>
            <DialogDescription>
              Valitse jäsenet, jotka haluat lisätä tapahtuman osallistujalistalle.
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                Huom: Tämä ei lähetä sähköpostia. Käytä "Sähköposti"-painiketta lähettääksesi kutsut.
              </span>
            </DialogDescription>
          </DialogHeader>
          
          {availableMembers.length === 0 ? (
            <p className="text-muted-foreground py-4">Kaikki aktiiviset jäsenet on jo kutsuttu.</p>
          ) : (
            <>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">{availableMembers.length} jäsentä saatavilla</span>
                <Button variant="outline" size="sm" onClick={handleInviteAll}>
                  Lisää kaikki
                </Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {availableMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={() => toggleMemberSelection(member.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{member.first_name} {member.last_name}</p>
                      <p className="text-sm text-muted-foreground">{member.organization || member.mobile_phone}</p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Peruuta</Button>
            <Button onClick={handleInviteMembers} disabled={selectedMembers.length === 0}>
              Lisää ({selectedMembers.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <EventDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        event={event}
        onSave={handleUpdateEvent}
        isLoading={updateEvent.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poista tapahtuma?</AlertDialogTitle>
            <AlertDialogDescription>
              Haluatko varmasti poistaa tapahtuman "{event.title}"? Tätä toimintoa ei voi peruuttaa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Peruuta</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent}>Poista</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Preview Dialog */}
      <Dialog open={emailPreviewOpen} onOpenChange={setEmailPreviewOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Sähköpostikutsut</DialogTitle>
            <DialogDescription>
              Valitse vastaanottajat, muokkaa sisältöä ja esikatsele sähköposti ennen lähettämistä.
            </DialogDescription>
          </DialogHeader>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Recipients Selection */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Vastaanottajat ({selectedEmailRecipients.length}/{participants.filter(p => p.member?.email).length})</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllEmailRecipients}>
                    Valitse kaikki
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllEmailRecipients}>
                    Tyhjennä
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {participants.map((participant) => {
                  const hasEmail = !!participant.member?.email;
                  const lastSendDate = getLastEmailSendDate(participant.member_id);
                  const hasSentEmail = !!lastSendDate;
                  return (
                    <label
                      key={participant.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        hasEmail ? 'hover:bg-secondary' : 'opacity-50 cursor-not-allowed'
                      } ${selectedEmailRecipients.includes(participant.member_id) ? 'bg-secondary border-primary' : ''}`}
                    >
                      <Checkbox
                        checked={selectedEmailRecipients.includes(participant.member_id)}
                        onCheckedChange={() => hasEmail && toggleEmailRecipient(participant.member_id)}
                        disabled={!hasEmail}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {participant.member?.first_name} {participant.member?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {hasEmail ? participant.member?.email : 'Ei sähköpostia'}
                        </p>
                        {hasSentEmail && (
                          <p className="text-xs text-muted-foreground">
                            Lähetetty: {format(lastSendDate, 'd.M.yyyy HH:mm', { locale: fi })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasSentEmail && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">(uudelleenlähetys)</span>
                        )}
                        <Badge variant={statusVariants[participant.status]} className="text-xs">
                          {statusLabels[participant.status]}
                        </Badge>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Email Content Tabs */}
            <Tabs value={emailViewMode} onValueChange={(v) => setEmailViewMode(v as 'preview' | 'edit')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Esikatselu
                </TabsTrigger>
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Muokkaa sisältöä
                </TabsTrigger>
              </TabsList>
              
              {/* Edit Tab */}
              <TabsContent value="edit" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-invitation-text">Kutsuteksti</Label>
                  <Textarea
                    id="edit-invitation-text"
                    value={editableInvitationText}
                    onChange={(e) => setEditableInvitationText(e.target.value)}
                    placeholder="Kirjoita mukautettu kutsuteksti..."
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tämä teksti näkyy sähköpostin kutsutekstiosiossa.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-email-signature">Allekirjoitus</Label>
                  <Textarea
                    id="edit-email-signature"
                    value={editableEmailSignature}
                    onChange={(e) => setEditableEmailSignature(e.target.value)}
                    placeholder="Ystävällisin terveisin,&#10;Pääomaomistajien vibe coding society"
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Allekirjoitus näkyy sähköpostin lopussa.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Muokkaukset vaikuttavat vain tähän lähetykseen, eivätkä muuta tapahtuman tietoja pysyvästi.
                  </p>
                </div>
              </TabsContent>
              
              {/* Preview Tab */}
              <TabsContent value="preview" className="mt-4">
                <div className="border rounded-lg p-6 bg-card space-y-4">
                  <div className="border-b pb-4">
                    <p className="text-sm text-muted-foreground">Aihe:</p>
                    <p className="font-medium">Kutsu: {event.title}</p>
                  </div>
                  
                  {/* Email HTML Preview - matches the actual email template */}
                  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
                    <h1 style={{ color: '#1a365d' }}>Hei [Etunimi]!</h1>
                    
                    <p>Olet saanut kutsun tapahtumaan:</p>
                    
                    <div style={{ backgroundColor: '#f7fafc', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
                      <h2 style={{ color: '#2d3748', marginTop: 0 }}>{event.title}</h2>
                      
                      <p><strong>📅 Päivämäärä:</strong> {format(new Date(event.event_date), 'EEEE d. MMMM yyyy', { locale: fi })}</p>
                      <p><strong>🕐 Aika:</strong> {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}</p>
                      {(event.location_name || event.location_address || event.location_city) && (
                        <p><strong>📍 Paikka:</strong> {[event.location_name, event.location_address, event.location_city].filter(Boolean).join(', ')}</p>
                      )}
                      {event.description && <p><strong>📝 Kuvaus:</strong> {event.description}</p>}
                    </div>
                    
                    {editableInvitationText && (
                      <div style={{ backgroundColor: '#edf2f7', padding: '16px', borderRadius: '8px', margin: '20px 0', borderLeft: '4px solid #2563eb' }}>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{editableInvitationText}</p>
                      </div>
                    )}
                    
                    <div style={{ textAlign: 'center', margin: '30px 0' }}>
                      <span style={{ display: 'inline-block', backgroundColor: '#2563eb', color: 'white', padding: '14px 28px', borderRadius: '8px', fontWeight: 'bold' }}>
                        Ilmoittaudu tapahtumaan
                      </span>
                    </div>
                    
                    <p style={{ textAlign: 'center', color: '#718096', fontSize: '14px' }}>
                      Tai kopioi linkki selaimeen: [Henkilökohtainen RSVP-linkki]
                    </p>
                    
                    {editableEmailSignature && (
                      <p style={{ color: '#718096', fontSize: '14px', marginTop: '40px', whiteSpace: 'pre-wrap' }}>
                        {editableEmailSignature}
                      </p>
                    )}
                  </div>
                </div>
                
                {!editableInvitationText && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mt-4">
                    <FileText className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Vinkki: Siirry "Muokkaa sisältöä" -välilehdelle lisätäksesi kutsutekstin.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          <DialogFooter className="flex-shrink-0 gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEmailPreviewOpen(false)}>
              Peruuta
            </Button>
            <Button 
              onClick={() => handleSendEmails(selectedEmailRecipients)}
              disabled={sendingEmails || selectedEmailRecipients.length === 0}
            >
              {sendingEmails ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Lähetä {selectedEmailRecipients.length} sähköpostia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk WhatsApp Dialog */}
      <BulkWhatsAppDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        members={participants
          .filter(p => p.member)
          .map(p => ({
            first_name: p.member!.first_name,
            last_name: p.member!.last_name,
            mobile_phone: p.member!.mobile_phone,
          }))}
        eventTitle={event.title}
      />
    </div>
  );
}
