import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmailSend {
  id: string;
  event_id: string;
  member_id: string;
  email_address: string;
  sent_at: string;
  sent_by_member_id: string | null;
}

export function useEmailSends(eventId: string) {
  return useQuery({
    queryKey: ['email-sends', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_sends')
        .select('*')
        .eq('event_id', eventId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as EmailSend[];
    },
    enabled: !!eventId,
  });
}

export function useEmailSendsByMember(eventId: string, memberId: string) {
  return useQuery({
    queryKey: ['email-sends', eventId, memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_sends')
        .select('*')
        .eq('event_id', eventId)
        .eq('member_id', memberId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as EmailSend[];
    },
    enabled: !!eventId && !!memberId,
  });
}
