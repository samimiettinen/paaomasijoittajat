import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MyEventParticipation {
  id: string;
  status: string;
  early_arrival: boolean | null;
  invited_at: string;
  event_id: string;
  events: {
    id: string;
    title: string;
    event_date: string;
    start_time: string;
    end_time: string;
    location_name: string | null;
    location_address: string | null;
    location_city: string | null;
    description: string | null;
    status: string;
  } | null;
}

export function useMyEvents() {
  const { memberId } = useAuth();

  return useQuery({
    queryKey: ['my-events', memberId],
    queryFn: async () => {
      if (!memberId) return [];

      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          id,
          status,
          early_arrival,
          invited_at,
          event_id,
          events (
            id,
            title,
            event_date,
            start_time,
            end_time,
            location_name,
            location_address,
            location_city,
            description,
            status
          )
        `)
        .eq('member_id', memberId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return data as MyEventParticipation[];
    },
    enabled: !!memberId,
  });
}

export function useUpdateMyRsvp() {
  const queryClient = useQueryClient();
  const { memberId } = useAuth();

  return useMutation({
    mutationFn: async ({
      participationId,
      status,
      earlyArrival,
    }: {
      participationId: string;
      status: 'confirmed' | 'declined';
      earlyArrival?: boolean;
    }) => {
      const updateData: { 
        status: 'confirmed' | 'declined'; 
        early_arrival?: boolean; 
      } = { status };
      if (earlyArrival !== undefined) {
        updateData.early_arrival = earlyArrival;
      }

      const { error } = await supabase
        .from('event_participants')
        .update(updateData)
        .eq('id', participationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-events', memberId] });
      toast.success('Osallistumistila päivitetty');
    },
    onError: (error: Error) => {
      toast.error(`Virhe: ${error.message}`);
    },
  });
}
