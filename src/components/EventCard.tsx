import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Users, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Event } from '@/lib/types';
import { downloadICS } from '@/lib/calendar';

interface EventCardProps {
  event: Event;
  participantCount?: number;
  onClick?: () => void;
}

const statusLabels: Record<Event['status'], string> = {
  draft: 'Luonnos',
  published: 'Julkaistu',
  cancelled: 'Peruttu',
  completed: 'Päättynyt',
};

const statusVariants: Record<Event['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  cancelled: 'destructive',
  completed: 'outline',
};

export function EventCard({ event, participantCount, onClick }: EventCardProps) {
  const eventDate = new Date(event.event_date);
  const isUpcoming = eventDate >= new Date();

  const handleDownloadICS = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadICS(event);
  };

  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-nordic-md cursor-pointer ${
        !isUpcoming ? 'opacity-75' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{event.title}</CardTitle>
          <Badge variant={statusVariants[event.status]}>
            {statusLabels[event.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(eventDate, 'EEEE d.M.yyyy', { locale: fi })}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
          </span>
        </div>
        
        {event.location_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{event.location_name}</span>
          </div>
        )}

        {participantCount !== undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{participantCount} osallistujaa</span>
          </div>
        )}

        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadICS}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Lataa .ics kalenteriisi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
