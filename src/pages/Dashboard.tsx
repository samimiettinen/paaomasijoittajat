import { Users, Calendar, UserCheck, TrendingUp, LogIn } from 'lucide-react';
import { useMembers } from '@/hooks/useMembers';
import { useEvents } from '@/hooks/useEvents';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/StatsCard';
import { EventCard } from '@/components/EventCard';
import { WhatsAppGroupCard } from '@/components/WhatsAppGroupCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { data: members = [] } = useMembers();
  const { data: events = [] } = useEvents();
  const { isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Fetch total visit count
  const { data: totalVisits = 0 } = useQuery({
    queryKey: ['total-visits'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('member_visits')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const activeMembers = members.filter(m => m.membership_status === 'active').length;
  
  // Fix: Compare dates without time to include today's events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.event_date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today && e.status === 'published';
  });
  
  const admins = members.filter(m => m.is_admin).length;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hallintapaneeli</h1>
        <p className="text-muted-foreground mt-1">
          Pääomaomistajien vibe coding society
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <StatsCard
          title="Kirjautumisia"
          value={totalVisits}
          icon={LogIn}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Tulevat tapahtumat</h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground">Ei tulevia tapahtumia.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingEvents.slice(0, 4).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => navigate(`/events/${event.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Admin tools sidebar */}
        {(isAdmin || isSuperAdmin) && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Hallintatyökalut</h2>
            <WhatsAppGroupCard />
          </div>
        )}
      </div>
    </div>
  );
}
