import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAvatarUpload() {
  const { memberId } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const uploadAvatar = async (file: File) => {
    if (!memberId) {
      toast.error('Kirjaudu sisään ladataksesi kuvan');
      return null;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vain kuvatiedostot ovat sallittuja');
      return null;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kuvan maksimikoko on 2 MB');
      return null;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${memberId}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update member record
      const { error: updateError } = await supabase
        .from('members')
        .update({ avatar_url: avatarUrl })
        .eq('id', memberId);

      if (updateError) throw updateError;

      // Invalidate member query
      queryClient.invalidateQueries({ queryKey: ['members', memberId] });

      toast.success('Profiilikuva päivitetty');
      return avatarUrl;
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(`Virhe kuvan latauksessa: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAvatar = async () => {
    if (!memberId) return;

    setIsUploading(true);

    try {
      // List and delete all files in member's folder
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(memberId);

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${memberId}/${f.name}`);
        await supabase.storage.from('avatars').remove(filePaths);
      }

      // Clear avatar_url in member record
      const { error } = await supabase
        .from('members')
        .update({ avatar_url: null })
        .eq('id', memberId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['members', memberId] });
      toast.success('Profiilikuva poistettu');
    } catch (error: any) {
      toast.error(`Virhe kuvan poistossa: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadAvatar, deleteAvatar, isUploading };
}
