import { Users, Calendar, UserCheck, TrendingUp } from 'lucide-react';
import { useMembers } from '@/hooks/useMembers';
import { useEvents } from '@/hooks/useEvents';
import { StatsCard } from '@/components/StatsCard';
import { EventCard } from '@/components/EventCard';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { data: members = [] } = useMembers();
  const { data: events = [] } = useEvents();
  const navigate = useNavigate();

  const activeMembers = members.filter(m => m.membership_status === 'active').length;
  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date() && e.status === 'published');
  const admins = members.filter(m => m.is_admin).length;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hallintapaneeli</h1>
        <p className="text-muted-foreground mt-1">
          Pääomasijoittajien vibe coding society
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Jäseniä yhteensä"
          value={members.length}
          icon={Users}
        />
        <StatsCard
          title="Aktiivisia jäseniä"
          value={activeMembers}
          icon={UserCheck}
        />
        <StatsCard
          title="Tulevia tapahtumia"
          value={upcomingEvents.length}
          icon={Calendar}
        />
        <StatsCard
          title="Ylläpitäjiä"
          value={admins}
          icon={TrendingUp}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Tulevat tapahtumat</h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-muted-foreground">Ei tulevia tapahtumia.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.slice(0, 3).map((event) => (
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
