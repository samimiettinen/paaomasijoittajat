import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Event, EventFormData, EventStatus } from '@/lib/types';

const eventSchema = z.object({
  title: z.string().min(1, 'Otsikko vaaditaan'),
  description: z.string().optional(),
  event_date: z.string().min(1, 'Päivämäärä vaaditaan'),
  start_time: z.string().min(1, 'Alkamisaika vaaditaan'),
  end_time: z.string().min(1, 'Päättymisaika vaaditaan'),
  location_name: z.string().optional(),
  location_address: z.string().optional(),
  location_city: z.string().optional(),
  status: z.enum(['draft', 'published', 'cancelled', 'completed']),
  invitation_text: z.string().optional(),
  email_signature: z.string().optional(),
});

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  onSave: (data: EventFormData) => void;
  isLoading?: boolean;
}

const statusOptions: { value: EventStatus; label: string }[] = [
  { value: 'draft', label: 'Luonnos' },
  { value: 'published', label: 'Julkaistu' },
  { value: 'cancelled', label: 'Peruttu' },
  { value: 'completed', label: 'Päättynyt' },
];

export function EventDialog({ open, onOpenChange, event, onSave, isLoading }: EventDialogProps) {
  const isEditing = !!event;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: event ? {
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      start_time: event.start_time,
      end_time: event.end_time,
      location_name: event.location_name || '',
      location_address: event.location_address || '',
      location_city: event.location_city || '',
      status: event.status,
      invitation_text: event.invitation_text || '',
      email_signature: event.email_signature || 'Ystävällisin terveisin,\nPääomaomistajien vibe coding society',
    } : {
      title: '',
      description: '',
      event_date: '',
      start_time: '',
      end_time: '',
      location_name: '',
      location_address: '',
      location_city: '',
      status: 'draft',
      invitation_text: '',
      email_signature: 'Ystävällisin terveisin,\nPääomaomistajien vibe coding society',
    },
  });

  const status = watch('status');

  const onSubmit = (data: EventFormData) => {
    onSave(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Muokkaa tapahtumaa' : 'Luo uusi tapahtuma'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Päivitä tapahtuman tiedot alla.'
              : 'Täytä tapahtuman tiedot.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Otsikko *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Tapahtuman nimi"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Kuvaus</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Tapahtuman kuvaus..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="event_date">Päivämäärä *</Label>
              <Input
                id="event_date"
                type="date"
                {...register('event_date')}
              />
              {errors.event_date && (
                <p className="text-sm text-destructive">{errors.event_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_time">Alkaa *</Label>
              <Input
                id="start_time"
                type="time"
                {...register('start_time')}
              />
              {errors.start_time && (
                <p className="text-sm text-destructive">{errors.start_time.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">Päättyy *</Label>
              <Input
                id="end_time"
                type="time"
                {...register('end_time')}
              />
              {errors.end_time && (
                <p className="text-sm text-destructive">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Sijainti</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location_name">Paikan nimi</Label>
                <Input
                  id="location_name"
                  {...register('location_name')}
                  placeholder="Esim. Oodi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_city">Kaupunki</Label>
                <Input
                  id="location_city"
                  {...register('location_city')}
                  placeholder="Esim. Helsinki"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_address">Osoite</Label>
              <Input
                id="location_address"
                {...register('location_address')}
                placeholder="Esim. Töölönlahdenkatu 4"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Tila</Label>
            <Select
              value={status}
              onValueChange={(value) => setValue('status', value as EventStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invitation_text">Kutsuteksti (sähköpostikutsuihin)</Label>
            <Textarea
              id="invitation_text"
              {...register('invitation_text')}
              placeholder="Kirjoita tähän mukautettu viesti, joka näkyy sähköpostikutsuissa..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Tämä teksti lisätään sähköpostikutsuihin tapahtuman tietojen jälkeen.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_signature">Sähköpostin allekirjoitus</Label>
            <Textarea
              id="email_signature"
              {...register('email_signature')}
              placeholder="Ystävällisin terveisin,&#10;Pääomaomistajien vibe coding society"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Allekirjoitus näkyy sähköpostikutsun lopussa. Jätä tyhjäksi jos et halua allekirjoitusta.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Peruuta
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Tallennetaan...' : isEditing ? 'Tallenna' : 'Luo tapahtuma'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
