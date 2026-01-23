import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResourcePresenter {
  id: string;
  resource_id: string;
  member_id: string;
  role: 'presenter' | 'owner';
  created_at: string;
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export function useResourcePresenters(resourceId: string) {
  return useQuery({
    queryKey: ['resource-presenters', resourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_presenters')
        .select(`
          id,
          resource_id,
          member_id,
          role,
          created_at,
          members (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('resource_id', resourceId);

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        member: item.members as unknown as ResourcePresenter['member']
      })) as ResourcePresenter[];
    },
    enabled: !!resourceId,
  });
}

export function useResourcesPresenters(resourceIds: string[]) {
  return useQuery({
    queryKey: ['resources-presenters', resourceIds],
    queryFn: async () => {
      if (resourceIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('resource_presenters')
        .select(`
          id,
          resource_id,
          member_id,
          role,
          created_at,
          members (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .in('resource_id', resourceIds);

      if (error) throw error;
      
      // Group by resource_id
      const grouped: Record<string, ResourcePresenter[]> = {};
      (data || []).forEach(item => {
        const presenter = {
          ...item,
          member: item.members as unknown as ResourcePresenter['member']
        } as ResourcePresenter;
        
        if (!grouped[item.resource_id]) {
          grouped[item.resource_id] = [];
        }
        grouped[item.resource_id].push(presenter);
      });
      
      return grouped;
    },
    enabled: resourceIds.length > 0,
  });
}

export function useAddResourcePresenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resourceId, memberId, role }: { resourceId: string; memberId: string; role: 'presenter' | 'owner' }) => {
      const { data, error } = await supabase
        .from('resource_presenters')
        .insert({
          resource_id: resourceId,
          member_id: memberId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resource-presenters', variables.resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resources-presenters'] });
      toast.success(variables.role === 'presenter' ? 'Esittäjä lisätty' : 'Omistaja lisätty');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Henkilö on jo lisätty tässä roolissa');
      } else {
        toast.error(`Virhe: ${error.message}`);
      }
    },
  });
}

export function useRemoveResourcePresenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, resourceId }: { id: string; resourceId: string }) => {
      const { error } = await supabase
        .from('resource_presenters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return resourceId;
    },
    onSuccess: (resourceId) => {
      queryClient.invalidateQueries({ queryKey: ['resource-presenters', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resources-presenters'] });
      toast.success('Henkilö poistettu');
    },
    onError: (error: Error) => {
      toast.error(`Virhe: ${error.message}`);
    },
  });
}
