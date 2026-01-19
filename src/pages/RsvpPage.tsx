import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface InvitationData {
  id: string;
  status: string;
  early_arrival: boolean | null;
  event: {
    id: string;
    title: string;
    event_date: string;
    start_time: string;
    end_time: string;
    description: string | null;
    location_name: string | null;
    location_address: string | null;
    location_city: string | null;
  };
  member: {
    first_name: string;
    last_name: string;
  };
}

export default function RsvpPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [earlyArrival, setEarlyArrival] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responseType, setResponseType] = useState<'confirmed' | 'declined' | null>(null);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          id,
          status,
          early_arrival,
          event:events(id, title, event_date, start_time, end_time, description, location_name, location_address, location_city),
          member:members(first_name, last_name)
        `)
        .eq('invitation_token', token)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setInvitation(data as unknown as InvitationData);
        setEarlyArrival(data.early_arrival ?? false);
        if (data.status === 'confirmed' || data.status === 'declined') {
          setSubmitted(true);
          setResponseType(data.status as 'confirmed' | 'declined');
        }
      }
    } catch (error) {
      console.error('Error fetching invitation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async (response: 'confirmed' | 'declined') => {
    if (!invitation) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('event_participants')
        .update({
          status: response,
          early_arrival: response === 'confirmed' ? earlyArrival : null,
        })
        .eq('invitation_token', token);

      if (error) throw error;

      setSubmitted(true);
      setResponseType(response);
      toast.success(response === 'confirmed' ? 'Kiitos ilmoittautumisestasi!' : 'Ilmoittautumisesi on peruttu.');
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      toast.error('Vastauksen lähetys epäonnistui. Yritä uudelleen.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!token || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Virheellinen kutsu</CardTitle>
            <CardDescription>
              Kutsulinkki on virheellinen tai vanhentunut. Ota yhteyttä tapahtuman järjestäjään.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const eventDate = new Date(invitation.event.event_date);

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              responseType === 'confirmed' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
            }`}>
              {responseType === 'confirmed' ? (
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              ) : (
                <X className="h-8 w-8 text-red-600 dark:text-red-400" />
              )}
            </div>
            <CardTitle>
              {responseType === 'confirmed' ? 'Ilmoittautuminen vahvistettu!' : 'Ilmoittautuminen peruttu'}
            </CardTitle>
            <CardDescription>
              {responseType === 'confirmed' 
                ? `Kiitos ${invitation.member.first_name}! Nähdään tapahtumassa.`
                : 'Kiitos ilmoituksestasi. Toivottavasti näemme seuraavalla kerralla!'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <h3 className="font-semibold mb-2">{invitation.event.title}</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(eventDate, 'EEEE d. MMMM yyyy', { locale: fi })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{invitation.event.start_time.slice(0, 5)} - {invitation.event.end_time.slice(0, 5)}</span>
                </div>
                {invitation.event.location_name && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{invitation.event.location_name}</span>
                  </div>
                )}
              </div>
              {responseType === 'confirmed' && earlyArrival && (
                <div className="mt-3 pt-3 border-t text-sm">
                  <span className="text-primary font-medium">✓ Saavut open door -vaiheeseen (12:30-13:30)</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Kutsu tapahtumaan</CardTitle>
          <CardDescription>
            Hei {invitation.member.first_name}! Olet saanut kutsun tapahtumaan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Details */}
          <div className="p-4 rounded-lg bg-muted space-y-3">
            <h3 className="text-lg font-semibold">{invitation.event.title}</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{format(eventDate, 'EEEE d. MMMM yyyy', { locale: fi })}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>{invitation.event.start_time.slice(0, 5)} - {invitation.event.end_time.slice(0, 5)}</span>
              </div>
              {invitation.event.location_name && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{invitation.event.location_name}</p>
                    {invitation.event.location_address && (
                      <p className="text-muted-foreground">{invitation.event.location_address}</p>
                    )}
                    {invitation.event.location_city && (
                      <p className="text-muted-foreground">{invitation.event.location_city}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {invitation.event.description && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invitation.event.description}</p>
              </div>
            )}
          </div>

          {/* Early Arrival Option */}
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <Checkbox
                id="early-arrival"
                checked={earlyArrival}
                onCheckedChange={(checked) => setEarlyArrival(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="early-arrival" className="font-medium cursor-pointer">
                  Saavun open door -vaiheeseen
                </Label>
                <p className="text-sm text-muted-foreground">
                  Vapaa verkostoituminen klo 12:30-13:30 ennen varsinaista ohjelmaa
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleRsvp('declined')}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
              En pääse
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleRsvp('confirmed')}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Osallistun
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
