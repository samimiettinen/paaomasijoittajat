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

interface RsvpData {
  participant_id: string;
  participant_status: string;
  early_arrival: boolean | null;
  event_id: string;
  event_title: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  event_description: string | null;
  event_location_name: string | null;
  event_location_address: string | null;
  event_location_city: string | null;
  member_first_name: string;
  member_last_name: string;
}

export default function RsvpPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rsvpData, setRsvpData] = useState<RsvpData | null>(null);
  const [earlyArrival, setEarlyArrival] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responseType, setResponseType] = useState<'confirmed' | 'declined' | null>(null);

  useEffect(() => {
    if (token) {
      fetchRsvpData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchRsvpData = async () => {
    try {
      // Use the secure RPC function instead of direct table query
      const { data, error } = await supabase
        .rpc('get_rsvp_by_token', { token_value: token });

      if (error) throw error;
      
      // RPC returns an array, get the first result
      const result = Array.isArray(data) ? data[0] : data;
      
      if (result) {
        setRsvpData(result as RsvpData);
        setEarlyArrival(result.early_arrival ?? false);
        if (result.participant_status === 'confirmed' || result.participant_status === 'declined') {
          setSubmitted(true);
          setResponseType(result.participant_status as 'confirmed' | 'declined');
        }
      }
    } catch (error) {
      console.error('Error fetching RSVP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async (response: 'confirmed' | 'declined') => {
    if (!rsvpData || !token) return;
    
    setSubmitting(true);
    try {
      // Use the secure RPC function instead of direct table update
      const { data, error } = await supabase
        .rpc('update_rsvp_by_token', { 
          token_value: token,
          new_status: response,
          new_early_arrival: response === 'confirmed' ? earlyArrival : null
        });

      if (error) throw error;

      if (!data) {
        throw new Error('RSVP update failed');
      }

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

  if (!token || !rsvpData) {
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

  const eventDate = new Date(rsvpData.event_date);

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
                ? `Kiitos ${rsvpData.member_first_name}! Nähdään tapahtumassa.`
                : 'Kiitos ilmoituksestasi. Toivottavasti näemme seuraavalla kerralla!'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <h3 className="font-semibold mb-2">{rsvpData.event_title}</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(eventDate, 'EEEE d. MMMM yyyy', { locale: fi })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{rsvpData.event_start_time.slice(0, 5)} - {rsvpData.event_end_time.slice(0, 5)}</span>
                </div>
                {rsvpData.event_location_name && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{rsvpData.event_location_name}</span>
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
            Hei {rsvpData.member_first_name}! Olet saanut kutsun tapahtumaan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Details */}
          <div className="p-4 rounded-lg bg-muted space-y-3">
            <h3 className="text-lg font-semibold">{rsvpData.event_title}</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{format(eventDate, 'EEEE d. MMMM yyyy', { locale: fi })}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>{rsvpData.event_start_time.slice(0, 5)} - {rsvpData.event_end_time.slice(0, 5)}</span>
              </div>
              {rsvpData.event_location_name && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{rsvpData.event_location_name}</p>
                    {rsvpData.event_location_address && (
                      <p className="text-muted-foreground">{rsvpData.event_location_address}</p>
                    )}
                    {rsvpData.event_location_city && (
                      <p className="text-muted-foreground">{rsvpData.event_location_city}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {rsvpData.event_description && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rsvpData.event_description}</p>
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