import type { Event } from './types';

export function generateICS(event: Event): string {
  const formatDate = (date: string, time: string) => {
    const d = new Date(`${date}T${time}`);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startDateTime = formatDate(event.event_date, event.start_time);
  const endDateTime = formatDate(event.event_date, event.end_time);
  
  const location = [event.location_name, event.location_address, event.location_city]
    .filter(Boolean)
    .join(', ');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pääomasijoittajien vibe coding society//FI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${startDateTime}`,
    `DTEND:${endDateTime}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
    location ? `LOCATION:${location}` : '',
    `UID:${event.id}@paomasijoittajat.fi`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  return icsContent;
}

export function downloadICS(event: Event) {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
