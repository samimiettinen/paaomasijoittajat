import { useState, useRef } from 'react';
import { FileText, Link2, StickyNote, Plus, Trash2, Upload, ExternalLink, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEventResources, useCreateEventResource, useDeleteEventResource, uploadEventFile, EventResource } from '@/hooks/useEventResources';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';

interface EventResourcesSectionProps {
  eventId: string;
  memberId?: string;
  readOnly?: boolean;
}

export function EventResourcesSection({ eventId, memberId, readOnly = false }: EventResourcesSectionProps) {
  const { data: resources = [], isLoading } = useEventResources(eventId);
  const createResource = useCreateEventResource();
  const deleteResource = useDeleteEventResource();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<EventResource | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'text' | 'url'>('file');
  const [isUploading, setIsUploading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddResource = async () => {
    if (!title.trim()) {
      toast.error('Otsikko on pakollinen');
      return;
    }

    setIsUploading(true);
    try {
      if (activeTab === 'file') {
        if (!selectedFile) {
          toast.error('Valitse tiedosto');
          setIsUploading(false);
          return;
        }
        const { url, fileName, fileSize } = await uploadEventFile(eventId, selectedFile);
        await createResource.mutateAsync({
          event_id: eventId,
          resource_type: 'file',
          title: title.trim(),
          file_url: url,
          file_name: fileName,
          file_size: fileSize,
          created_by: memberId,
        });
      } else if (activeTab === 'text') {
        if (!content.trim()) {
          toast.error('Sisältö on pakollinen');
          setIsUploading(false);
          return;
        }
        await createResource.mutateAsync({
          event_id: eventId,
          resource_type: 'text',
          title: title.trim(),
          content: content.trim(),
          created_by: memberId,
        });
      } else if (activeTab === 'url') {
        if (!content.trim()) {
          toast.error('URL on pakollinen');
          setIsUploading(false);
          return;
        }
        // Validate URL
        try {
          new URL(content.trim());
        } catch {
          toast.error('Virheellinen URL-osoite');
          setIsUploading(false);
          return;
        }
        await createResource.mutateAsync({
          event_id: eventId,
          resource_type: 'url',
          title: title.trim(),
          content: content.trim(),
          created_by: memberId,
        });
      }

      resetForm();
      setAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding resource:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;

    await deleteResource.mutateAsync({
      id: resourceToDelete.id,
      eventId,
      fileUrl: resourceToDelete.file_url,
    });
    setDeleteDialogOpen(false);
    setResourceToDelete(null);
  };

  const confirmDelete = (resource: EventResource) => {
    setResourceToDelete(resource);
    setDeleteDialogOpen(true);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileText className="h-4 w-4" />;
      case 'url':
        return <Link2 className="h-4 w-4" />;
      case 'text':
        return <StickyNote className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case 'file':
        return <Badge variant="secondary">Tiedosto</Badge>;
      case 'url':
        return <Badge variant="outline">Linkki</Badge>;
      case 'text':
        return <Badge variant="default">Muistiinpano</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resurssit
          </CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Lisää
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : resources.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Ei resursseja vielä. Lisää tiedostoja, muistiinpanoja tai linkkejä.
            </p>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                    {getResourceIcon(resource.resource_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{resource.title}</p>
                      {getResourceTypeBadge(resource.resource_type)}
                    </div>
                    {resource.resource_type === 'text' && resource.content && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {resource.content}
                      </p>
                    )}
                    {resource.resource_type === 'url' && resource.content && (
                      <a
                        href={resource.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                      >
                        {resource.content}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    )}
                    {resource.resource_type === 'file' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{resource.file_name}</span>
                        {resource.file_size && (
                          <span className="text-xs">({formatFileSize(resource.file_size)})</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(resource.created_at), 'd.M.yyyy HH:mm', { locale: fi })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {resource.resource_type === 'file' && resource.file_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={resource.file_url} target="_blank" rel="noopener noreferrer" title="Lataa">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(resource)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Resource Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lisää resurssi</DialogTitle>
            <DialogDescription>
              Lisää tapahtumaan tiedosto, muistiinpano tai linkki.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'file' | 'text' | 'url')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Tiedosto
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Teksti
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Linkki
              </TabsTrigger>
            </TabsList>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="resource-title">Otsikko *</Label>
                <Input
                  id="resource-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Resurssin nimi"
                  maxLength={200}
                />
              </div>

              <TabsContent value="file" className="mt-0 space-y-2">
                <Label htmlFor="resource-file">Tiedosto *</Label>
                <Input
                  id="resource-file"
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Valittu: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </TabsContent>

              <TabsContent value="text" className="mt-0 space-y-2">
                <Label htmlFor="resource-content">Sisältö *</Label>
                <Textarea
                  id="resource-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Kirjoita muistiinpano..."
                  rows={5}
                  maxLength={5000}
                />
              </TabsContent>

              <TabsContent value="url" className="mt-0 space-y-2">
                <Label htmlFor="resource-url">URL-osoite *</Label>
                <Input
                  id="resource-url"
                  type="url"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="https://..."
                />
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }}>
              Peruuta
            </Button>
            <Button onClick={handleAddResource} disabled={isUploading || createResource.isPending}>
              {(isUploading || createResource.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lisää
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poista resurssi?</AlertDialogTitle>
            <AlertDialogDescription>
              Haluatko varmasti poistaa resurssin "{resourceToDelete?.title}"? Tätä toimintoa ei voi peruuttaa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Peruuta</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteResource}>Poista</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
