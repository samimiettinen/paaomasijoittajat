import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import { ArrowLeft, Calendar, Clock, MapPin, Download, Edit, Trash2, UserPlus, Users, MessageSquare } from 'lucide-react';
import { useEvent, useEventParticipants, useUpdateEvent, useDeleteEvent, useInviteMembers, useUpdateParticipantStatus } from '@/hooks/useEvents';
import { useMembers } from '@/hooks/useMembers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EventDialog } from '@/components/EventDialog';
import { BulkWhatsAppDialog } from '@/components/BulkWhatsAppDialog';
import { downloadICS } from '@/lib/calendar';
import type { Event, EventFormData, ParticipantStatus } from '@/lib/types';

const statusLabels: Record<ParticipantStatus, string> = {
  invited: 'Kutsuttu',
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
  const { data: participants = [] } = useEventParticipants(id || '');
  const { data: allMembers = [] } = useMembers();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const inviteMembers = useInviteMembers();
  const updateStatus = useUpdateParticipantStatus();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

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
            <Download className="h-4 w-4 mr-2" />Lataa .ics
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
              <Button variant="outline" onClick={() => setWhatsappDialogOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />WhatsApp
              </Button>
            )}
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />Kutsu jäseniä
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
                  <TableHead>Tila</TableHead>
                  <TableHead className="w-[180px]">Muuta tilaa</TableHead>
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
                      <Badge variant={statusVariants[participant.status]}>
                        {statusLabels[participant.status]}
                      </Badge>
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
                          <SelectItem value="invited">Kutsuttu</SelectItem>
                          <SelectItem value="confirmed">Vahvistettu</SelectItem>
                          <SelectItem value="declined">Kieltäytynyt</SelectItem>
                          <SelectItem value="attended">Osallistui</SelectItem>
                          <SelectItem value="no_show">Ei saapunut</SelectItem>
                        </SelectContent>
                      </Select>
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
            <DialogTitle>Kutsu jäseniä</DialogTitle>
            <DialogDescription>
              Valitse jäsenet, jotka haluat kutsua tapahtumaan.
            </DialogDescription>
          </DialogHeader>
          
          {availableMembers.length === 0 ? (
            <p className="text-muted-foreground py-4">Kaikki aktiiviset jäsenet on jo kutsuttu.</p>
          ) : (
            <>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">{availableMembers.length} jäsentä saatavilla</span>
                <Button variant="outline" size="sm" onClick={handleInviteAll}>
                  Kutsu kaikki
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
              Kutsu ({selectedMembers.length})
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
