import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EventResource {
  id: string;
  event_id: string;
  resource_type: 'file' | 'text' | 'url';
  title: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  created_by: string | null;
}

export interface CreateEventResourceData {
  event_id: string;
  resource_type: 'file' | 'text' | 'url';
  title: string;
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  created_by?: string;
}

export function useEventResources(eventId: string) {
  return useQuery({
    queryKey: ['event-resources', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_resources')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EventResource[];
    },
    enabled: !!eventId,
  });
}

export function useCreateEventResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resource: CreateEventResourceData) => {
      const { data, error } = await supabase
        .from('event_resources')
        .insert(resource)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event-resources', variables.event_id] });
      toast.success('Resurssi lisätty onnistuneesti');
    },
    onError: (error: Error) => {
      toast.error(`Virhe resurssin lisäämisessä: ${error.message}`);
    },
  });
}

export function useDeleteEventResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, eventId, fileUrl }: { id: string; eventId: string; fileUrl?: string | null }) => {
      // Delete file from storage if exists
      if (fileUrl) {
        const filePath = fileUrl.split('/event-files/')[1];
        if (filePath) {
          await supabase.storage.from('event-files').remove([filePath]);
        }
      }

      const { error } = await supabase
        .from('event_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return eventId;
    },
    onSuccess: (eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event-resources', eventId] });
      toast.success('Resurssi poistettu');
    },
    onError: (error: Error) => {
      toast.error(`Virhe resurssin poistamisessa: ${error.message}`);
    },
  });
}

export async function uploadEventFile(eventId: string, file: File): Promise<{ url: string; fileName: string; fileSize: number }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${eventId}/${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('event-files')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('event-files')
    .getPublicUrl(fileName);

  return {
    url: publicUrl,
    fileName: file.name,
    fileSize: file.size,
  };
}
