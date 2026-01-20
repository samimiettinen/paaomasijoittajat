import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Check, X, Users, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useMyEvents, useUpdateMyRsvp } from '@/hooks/useMyEvents';
import { downloadICS } from '@/lib/calendar';
import type { Event } from '@/lib/types';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  invited: { label: 'Kutsuttu', variant: 'outline' },
  confirmed: { label: 'Vahvistettu', variant: 'default' },
  declined: { label: 'Peruttu', variant: 'destructive' },
  attended: { label: 'Osallistui', variant: 'default' },
  no_show: { label: 'Ei saapunut', variant: 'secondary' },
};

export default function MyEventsPage() {
  const { data: participations, isLoading } = useMyEvents();
  const updateRsvp = useUpdateMyRsvp();

  const handleRsvp = (participationId: string, status: 'confirmed' | 'declined', earlyArrival?: boolean) => {
    updateRsvp.mutate({ participationId, status, earlyArrival });
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Ladataan tapahtumia...</p>
      </div>
    );
  }

  const upcomingEvents = participations?.filter(
    (p) => p.events && new Date(p.events.event_date) >= new Date()
  ) || [];

  const pastEvents = participations?.filter(
    (p) => p.events && new Date(p.events.event_date) < new Date()
  ) || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Omat tapahtumat</h1>
        <p className="text-muted-foreground">Tapahtumat joihin sinut on kutsuttu</p>
      </div>

      {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ei kutsuja tapahtumiin vielä</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcomingEvents.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Tulevat tapahtumat</h2>
              {upcomingEvents.map((participation) => {
                const event = participation.events!;
                const statusInfo = statusLabels[participation.status] || statusLabels.invited;
                const canRespond = participation.status === 'invited' || participation.status === 'confirmed' || participation.status === 'declined';

                return (
                  <Card key={participation.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(event.event_date), 'EEEE d.M.yyyy', { locale: fi })}
                          </CardDescription>
                        </div>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {event.start_time?.slice(0, 5)} - {event.end_time?.slice(0, 5)}
                        </div>
                        {event.location_name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location_name}
                            {event.location_city && `, ${event.location_city}`}
                          </div>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-sm">{event.description}</p>
                      )}

                      {canRespond && (
                        <div className="pt-2 border-t space-y-3">
                          <p className="text-sm font-medium">Ilmoittaudu tapahtumaan:</p>
                          
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`early-${participation.id}`}
                              checked={participation.early_arrival || false}
                              onCheckedChange={(checked) => {
                                if (participation.status === 'confirmed') {
                                  updateRsvp.mutate({
                                    participationId: participation.id,
                                    status: 'confirmed',
                                    earlyArrival: !!checked,
                                  });
                                }
                              }}
                              disabled={participation.status !== 'confirmed'}
                            />
                            <label htmlFor={`early-${participation.id}`} className="text-sm">
                              Saavun aikaisemmin (12:30-13:30)
                            </label>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleRsvp(participation.id, 'confirmed', participation.early_arrival || false)}
                              disabled={updateRsvp.isPending || participation.status === 'confirmed'}
                              variant={participation.status === 'confirmed' ? 'default' : 'outline'}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Osallistun
                            </Button>
                            <Button
                              size="sm"
                              variant={participation.status === 'declined' ? 'destructive' : 'outline'}
                              onClick={() => handleRsvp(participation.id, 'declined')}
                              disabled={updateRsvp.isPending || participation.status === 'declined'}
                            >
                              <X className="h-4 w-4 mr-1" />
                              En osallistu
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadICS(event as Event)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Lataa .ics kalenteriisi
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          )}

          {pastEvents.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Menneet tapahtumat</h2>
              {pastEvents.map((participation) => {
                const event = participation.events!;
                const statusInfo = statusLabels[participation.status] || statusLabels.invited;

                return (
                  <Card key={participation.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-base">{event.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(event.event_date), 'd.M.yyyy', { locale: fi })}
                          </CardDescription>
                        </div>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
