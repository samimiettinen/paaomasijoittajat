import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fi } from 'date-fns/locale';
import { ArrowLeft, MessageCircle, ExternalLink, Mail, Phone, Building2, Briefcase, Calendar, TrendingUp, UserCheck, UserX, Clock } from 'lucide-react';
import { useMember } from '@/hooks/useMembers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getWhatsAppLink } from '@/lib/whatsapp';
import type { Event, ParticipantStatus } from '@/lib/types';

const statusLabels: Record<string, string> = {
  active: 'Aktiivinen', pending: 'Odottava', inactive: 'Ei-aktiivinen', removed: 'Poistettu',
};

const participantStatusLabels: Record<ParticipantStatus, string> = {
  invited: 'Kutsuttu', confirmed: 'Vahvistettu', declined: 'Kieltäytynyt', attended: 'Osallistunut', no_show: 'Ei saapunut',
};

const participantStatusVariants: Record<ParticipantStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  invited: 'outline', confirmed: 'default', declined: 'destructive', attended: 'default', no_show: 'secondary',
};

interface EventWithParticipation extends Event {
  status_at_event: ParticipantStatus;
  invited_at: string;
}

function useMemberEvents(memberId: string) {
  return useQuery({
    queryKey: ['member-events', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          status,
          invited_at,
          events (*)
        `)
        .eq('member_id', memberId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(p => ({
        ...(p.events as Event),
        status_at_event: p.status as ParticipantStatus,
        invited_at: p.invited_at,
      })) as EventWithParticipation[];
    },
    enabled: !!memberId,
  });
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: member, isLoading: memberLoading } = useMember(id || '');
  const { data: events = [], isLoading: eventsLoading } = useMemberEvents(id || '');

  const stats = useMemo(() => {
    const total = events.length;
    const attended = events.filter(e => e.status_at_event === 'attended').length;
    const confirmed = events.filter(e => e.status_at_event === 'confirmed').length;
    const declined = events.filter(e => e.status_at_event === 'declined').length;
    const noShow = events.filter(e => e.status_at_event === 'no_show').length;
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

    return { total, attended, confirmed, declined, noShow, attendanceRate };
  }, [events]);

  if (memberLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Jäsentä ei löytynyt.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/members')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Takaisin jäsenlistaan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/members')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {member.first_name} {member.last_name}
            {member.is_admin && <Badge variant="secondary" className="ml-3">Admin</Badge>}
          </h1>
          <Badge variant={member.membership_status === 'active' ? 'default' : 'secondary'}>
            {statusLabels[member.membership_status]}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={getWhatsAppLink(member.mobile_phone)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </a>
          </Button>
          {member.linkedin_url && (
            <Button variant="outline" asChild>
              <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                LinkedIn
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Yhteystiedot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{member.mobile_phone}</span>
            </div>
            {member.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${member.email}`} className="text-primary hover:underline">{member.email}</a>
              </div>
            )}
            {member.secondary_email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${member.secondary_email}`} className="text-primary hover:underline">{member.secondary_email}</a>
              </div>
            )}
            {member.organization && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{member.organization}</span>
              </div>
            )}
            {member.organization_role && (
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{member.organization_role}</span>
              </div>
            )}
            {member.github_url && (
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Stats */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Osallistumistilastot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
                <div className="text-xs text-muted-foreground">Osallistumisaste</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Tapahtumia yht.</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <UserCheck className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <div className="text-2xl font-bold">{stats.attended}</div>
                <div className="text-xs text-muted-foreground">Osallistunut</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <UserX className="h-5 w-5 mx-auto mb-1 text-destructive" />
                <div className="text-2xl font-bold">{stats.noShow}</div>
                <div className="text-xs text-muted-foreground">Ei saapunut</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {member.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Muistiinpanot</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{member.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Event History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tapahtumahistoria</CardTitle>
          <CardDescription>Kaikki tapahtumat joihin jäsen on kutsuttu</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">Ei tapahtumia.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tapahtuma</TableHead>
                  <TableHead>Päivämäärä</TableHead>
                  <TableHead>Kutsuttu</TableHead>
                  <TableHead>Osallistuminen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Link to={`/events/${event.id}`} className="font-medium text-primary hover:underline">
                        {event.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(event.event_date), 'd.M.yyyy', { locale: fi })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(event.invited_at), 'd.M.yyyy', { locale: fi })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={participantStatusVariants[event.status_at_event]}>
                        {participantStatusLabels[event.status_at_event]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Member Info Footer */}
      <div className="text-xs text-muted-foreground">
        Jäsen lisätty: {format(parseISO(member.created_at), 'd.M.yyyy', { locale: fi })}
      </div>
    </div>
  );
}
