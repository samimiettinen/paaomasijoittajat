import { Calendar } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/EventCard';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function InsiderDashboard() {
  const { data: events = [], isLoading } = useEvents();
  const navigate = useNavigate();

  // Filter for upcoming published events (today or later)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.event_date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today && e.status === 'published';
  });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tervetuloa</h1>
        <p className="text-muted-foreground mt-1">
          Pääomaomistajien vibe coding society
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Tulevat tapahtumat</h2>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-muted-foreground">Ei tulevia tapahtumia.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => navigate(`/events/${event.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
