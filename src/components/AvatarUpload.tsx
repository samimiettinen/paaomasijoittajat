import { useRef } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  firstName?: string;
  lastName?: string;
  onAvatarChange?: (url: string | null) => void;
}

export function AvatarUpload({
  currentAvatarUrl,
  firstName = '',
  lastName = '',
  onAvatarChange,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, deleteAvatar, isUploading } = useAvatarUpload();

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newUrl = await uploadAvatar(file);
    if (newUrl && onAvatarChange) {
      onAvatarChange(newUrl);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    await deleteAvatar();
    if (onAvatarChange) {
      onAvatarChange(null);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-20 w-20">
          <AvatarImage src={currentAvatarUrl || undefined} alt="Profiilikuva" />
          <AvatarFallback className="text-lg bg-primary text-primary-foreground">
            {initials || '?'}
          </AvatarFallback>
        </Avatar>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Camera className="h-4 w-4 mr-2" />
          {currentAvatarUrl ? 'Vaihda kuva' : 'Lisää kuva'}
        </Button>
        {currentAvatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isUploading}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Poista kuva
          </Button>
        )}
        <p className="text-xs text-muted-foreground">Max 2 MB, JPG/PNG</p>
      </div>
    </div>
  );
}
