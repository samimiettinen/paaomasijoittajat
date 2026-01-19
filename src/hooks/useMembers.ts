import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Member, MemberFormData } from '@/lib/types';
import { toast } from 'sonner';

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      return data as Member[];
    },
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Member | null;
    },
    enabled: !!id,
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (member: MemberFormData) => {
      const { data, error } = await supabase
        .from('members')
        .insert(member)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Jäsen lisätty onnistuneesti');
    },
    onError: (error: Error) => {
      toast.error(`Virhe jäsenen lisäämisessä: ${error.message}`);
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...member }: MemberFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('members')
        .update(member)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Jäsen päivitetty onnistuneesti');
    },
    onError: (error: Error) => {
      toast.error(`Virhe jäsenen päivittämisessä: ${error.message}`);
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Jäsen poistettu onnistuneesti');
    },
    onError: (error: Error) => {
      toast.error(`Virhe jäsenen poistamisessa: ${error.message}`);
    },
  });
}

export function useBulkImportMembers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (members: Partial<MemberFormData>[]) => {
      const { data, error } = await supabase
        .from('members')
        .insert(members.map(m => ({
          first_name: m.first_name || '',
          last_name: m.last_name || '',
          mobile_phone: m.mobile_phone || '',
          membership_status: 'active' as const,
          is_admin: false,
        })))
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success(`${data.length} jäsentä tuotu onnistuneesti`);
    },
    onError: (error: Error) => {
      toast.error(`Virhe tuonnissa: ${error.message}`);
    },
  });
}
