import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Event, EventFormData, EventParticipant } from '@/lib/types';
import { toast } from 'sonner';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data as Event[];
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Event | null;
    },
    enabled: !!id,
  });
}

export function useEventParticipants(eventId: string) {
  return useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          member:members(*)
        `)
        .eq('event_id', eventId);
      
      if (error) throw error;
      return data as (EventParticipant & { member: EventParticipant['member'] })[];
    },
    enabled: !!eventId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: EventFormData) => {
      const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Tapahtuma luotu onnistuneesti');
    },
    onError: (error: Error) => {
      toast.error(`Virhe tapahtuman luomisessa: ${error.message}`);
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...event }: EventFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(event)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Tapahtuma päivitetty onnistuneesti');
    },
    onError: (error: Error) => {
      toast.error(`Virhe tapahtuman päivittämisessä: ${error.message}`);
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Tapahtuma poistettu onnistuneesti');
    },
    onError: (error: Error) => {
      toast.error(`Virhe tapahtuman poistamisessa: ${error.message}`);
    },
  });
}

export function useInviteMembers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, memberIds }: { eventId: string; memberIds: string[] }) => {
      const participants = memberIds.map(memberId => ({
        event_id: eventId,
        member_id: memberId,
        status: 'invited' as const,
      }));
      
      const { data, error } = await supabase
        .from('event_participants')
        .upsert(participants, { onConflict: 'event_id,member_id' })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-participants'] });
      toast.success('Kutsut lähetetty onnistuneesti');
    },
    onError: (error: Error) => {
      toast.error(`Virhe kutsujen lähettämisessä: ${error.message}`);
    },
  });
}

export function useUpdateParticipantStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EventParticipant['status'] }) => {
      const { data, error } = await supabase
        .from('event_participants')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-participants'] });
      toast.success('Osallistumistila päivitetty');
    },
    onError: (error: Error) => {
      toast.error(`Virhe tilan päivittämisessä: ${error.message}`);
    },
  });
}
