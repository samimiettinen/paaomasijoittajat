import { useState, useRef, useMemo } from 'react';
import { FileText, Link2, StickyNote, Plus, Trash2, Upload, ExternalLink, Download, Loader2, Users, User, X, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEventResources, useCreateEventResource, useDeleteEventResource, useUpdateEventResource, uploadEventFile, EventResource } from '@/hooks/useEventResources';
import { useResourcesPresenters, useAddResourcePresenter, useRemoveResourcePresenter, ResourcePresenter } from '@/hooks/useResourcePresenters';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
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
  const { data: members = [] } = useMembers();
  const { memberId: currentMemberId } = useAuth();
  const createResource = useCreateEventResource();
  const deleteResource = useDeleteEventResource();
  const updateResource = useUpdateEventResource();
  const addPresenter = useAddResourcePresenter();
  const removePresenter = useRemoveResourcePresenter();

  // Fetch presenters for all resources
  const resourceIds = useMemo(() => resources.map(r => r.id), [resources]);
  const { data: presentersByResource = {} } = useResourcesPresenters(resourceIds);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<EventResource | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'text' | 'url'>('file');
  const [isUploading, setIsUploading] = useState(false);

  // Presenter management state
  const [presenterDialogOpen, setPresenterDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<EventResource | null>(null);
  const [presenterRole, setPresenterRole] = useState<'presenter' | 'owner'>('presenter');
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<EventResource | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if current user can edit a resource (is presenter/owner)
  const canEditResource = (resourceId: string) => {
    if (!currentMemberId) return false;
    const presenters = presentersByResource[resourceId] || [];
    return presenters.some(p => p.member_id === currentMemberId);
  };

  // Check if current user can delete a resource (is owner)
  const canDeleteResource = (resourceId: string) => {
    if (!currentMemberId) return false;
    const presenters = presentersByResource[resourceId] || [];
    return presenters.some(p => p.member_id === currentMemberId && p.role === 'owner');
  };

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

  const openPresenterDialog = (resource: EventResource) => {
    setSelectedResource(resource);
    setPresenterRole('presenter');
    setPresenterDialogOpen(true);
  };

  const handleAddPresenter = async (memberId: string) => {
    if (!selectedResource) return;
    
    await addPresenter.mutateAsync({
      resourceId: selectedResource.id,
      memberId,
      role: presenterRole,
    });
    setMemberSearchOpen(false);
  };

  const handleRemovePresenter = async (presenter: ResourcePresenter) => {
    if (!selectedResource) return;
    
    await removePresenter.mutateAsync({
      id: presenter.id,
      resourceId: selectedResource.id,
    });
  };

  const openEditDialog = (resource: EventResource) => {
    setResourceToEdit(resource);
    setEditTitle(resource.title);
    setEditContent(resource.content || '');
    setEditDialogOpen(true);
  };

  const handleUpdateResource = async () => {
    if (!resourceToEdit || !editTitle.trim()) {
      toast.error('Otsikko on pakollinen');
      return;
    }

    await updateResource.mutateAsync({
      id: resourceToEdit.id,
      event_id: eventId,
      title: editTitle.trim(),
      content: resourceToEdit.resource_type !== 'file' ? editContent.trim() : undefined,
    });
    setEditDialogOpen(false);
    setResourceToEdit(null);
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

  const currentResourcePresenters = selectedResource ? (presentersByResource[selectedResource.id] || []) : [];
  const existingPresenterIds = currentResourcePresenters.map(p => p.member_id);
  const availableMembers = members.filter(m => !existingPresenterIds.includes(m.id));

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
              {resources.map((resource) => {
                const presenters = presentersByResource[resource.id] || [];
                const owners = presenters.filter(p => p.role === 'owner');
                const presentersList = presenters.filter(p => p.role === 'presenter');
                
                return (
                  <div
                    key={resource.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                      {getResourceIcon(resource.resource_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                      
                      {/* Presenters/Owners display */}
                      {presenters.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {owners.map((owner) => (
                            <TooltipProvider key={owner.id}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="gap-1 text-xs border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700">
                                    <Avatar className="h-4 w-4">
                                      <AvatarImage src={owner.member?.avatar_url || undefined} />
                                      <AvatarFallback className="text-[8px]">
                                        {owner.member?.first_name?.[0]}{owner.member?.last_name?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    {owner.member?.first_name} {owner.member?.last_name}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Omistaja</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                          {presentersList.map((presenter) => (
                            <TooltipProvider key={presenter.id}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    <Avatar className="h-4 w-4">
                                      <AvatarImage src={presenter.member?.avatar_url || undefined} />
                                      <AvatarFallback className="text-[8px]">
                                        {presenter.member?.first_name?.[0]}{presenter.member?.last_name?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    {presenter.member?.first_name} {presenter.member?.last_name}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Esittäjä</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
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
                      
                      {/* Edit button for presenters/owners */}
                      {canEditResource(resource.id) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(resource)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Muokkaa</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* Delete button for owners */}
                      {canDeleteResource(resource.id) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDelete(resource)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Poista (omistaja)</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* Admin controls */}
                      {!readOnly && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openPresenterDialog(resource)}
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Hallinnoi esittäjiä</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {!canDeleteResource(resource.id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(resource)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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

      {/* Presenter Management Dialog */}
      <Dialog open={presenterDialogOpen} onOpenChange={setPresenterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Esittäjät ja omistajat
            </DialogTitle>
            <DialogDescription>
              {selectedResource?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current presenters list */}
            {currentResourcePresenters.length > 0 ? (
              <div className="space-y-2">
                <Label>Nykyiset henkilöt</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentResourcePresenters.map((presenter) => (
                    <div key={presenter.id} className="flex items-center justify-between p-2 rounded-lg border bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={presenter.member?.avatar_url || undefined} />
                          <AvatarFallback>
                            {presenter.member?.first_name?.[0]}{presenter.member?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {presenter.member?.first_name} {presenter.member?.last_name}
                          </p>
                          <Badge variant={presenter.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                            {presenter.role === 'owner' ? 'Omistaja' : 'Esittäjä'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePresenter(presenter)}
                        disabled={removePresenter.isPending}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ei lisättyjä henkilöitä
              </p>
            )}

            {/* Add new presenter */}
            <div className="space-y-3 pt-4 border-t">
              <Label>Lisää henkilö</Label>
              
              <div className="flex gap-2">
                <Select value={presenterRole} onValueChange={(v) => setPresenterRole(v as 'presenter' | 'owner')}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presenter">Esittäjä</SelectItem>
                    <SelectItem value="owner">Omistaja</SelectItem>
                  </SelectContent>
                </Select>

                <Popover open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start">
                      <User className="h-4 w-4 mr-2" />
                      Valitse jäsen...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Hae jäsentä..." />
                      <CommandList>
                        <CommandEmpty>Ei jäseniä</CommandEmpty>
                        <CommandGroup>
                          {availableMembers.map((member) => (
                            <CommandItem
                              key={member.id}
                              value={`${member.first_name} ${member.last_name}`}
                              onSelect={() => handleAddPresenter(member.id)}
                            >
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {member.first_name?.[0]}{member.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              {member.first_name} {member.last_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPresenterDialogOpen(false)}>
              Sulje
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

      {/* Edit Resource Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Muokkaa resurssia
            </DialogTitle>
            <DialogDescription>
              {resourceToEdit?.resource_type === 'file' 
                ? 'Voit muokata tiedoston otsikkoa.'
                : 'Muokkaa resurssin tietoja.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Otsikko *</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Resurssin nimi"
                maxLength={200}
              />
            </div>

            {resourceToEdit?.resource_type === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="edit-content">Sisältö</Label>
                <Textarea
                  id="edit-content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Kirjoita muistiinpano..."
                  rows={5}
                  maxLength={5000}
                />
              </div>
            )}

            {resourceToEdit?.resource_type === 'url' && (
              <div className="space-y-2">
                <Label htmlFor="edit-url">URL-osoite</Label>
                <Input
                  id="edit-url"
                  type="url"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}

            {resourceToEdit?.resource_type === 'file' && (
              <p className="text-sm text-muted-foreground">
                Tiedoston sisältöä ei voi muuttaa. Lataa uusi tiedosto, jos haluat korvata nykyisen.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Peruuta
            </Button>
            <Button onClick={handleUpdateResource} disabled={updateResource.isPending}>
              {updateResource.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tallenna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
