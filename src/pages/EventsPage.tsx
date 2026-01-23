import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEvents, useCreateEvent } from '@/hooks/useEvents';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/EventCard';
import { EventDialog } from '@/components/EventDialog';
import type { EventFormData } from '@/lib/types';

export default function EventsPage() {
  const navigate = useNavigate();
  const { data: events = [] } = useEvents();
  const createEvent = useCreateEvent();
  const [dialogOpen, setDialogOpen] = useState(false);

  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.event_date) < new Date());

  const handleSave = (data: EventFormData) => {
    createEvent.mutate(data, { onSuccess: () => setDialogOpen(false) });
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tapahtumat</h1>
          <p className="text-muted-foreground">{events.length} tapahtumaa</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Luo tapahtuma
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Tulevat tapahtumat</h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-muted-foreground">Ei tulevia tapahtumia.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} onClick={() => navigate(`/events/${event.id}`)} />
            ))}
          </div>
        )}
      </div>

      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Menneet tapahtumat</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} onClick={() => navigate(`/events/${event.id}`)} />
            ))}
          </div>
        </div>
      )}

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} isLoading={createEvent.isPending} />
    </div>
  );
}
