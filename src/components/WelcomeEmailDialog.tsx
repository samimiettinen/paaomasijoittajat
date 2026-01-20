import { useState, useEffect } from 'react';
import { Eye, Edit, Mail, RefreshCw, Save, FolderOpen, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WelcomeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberEmail: string;
  roleLabel: string;
  tempPassword?: string;
  onSend: (customContent: { subject: string; greeting: string; introText: string; signature: string }) => void;
  isSending: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  template_type: string;
  subject: string | null;
  greeting: string | null;
  intro_text: string | null;
  signature: string | null;
}

const DEFAULT_GREETING = 'Tervetuloa, {{name}}!';
const DEFAULT_INTRO_TEXT = 'Sinulle on myönnetty käyttöoikeudet Pääomaomistajat ry:n järjestelmään.';
const DEFAULT_SIGNATURE = 'Ystävällisin terveisin,\nPääomaomistajat ry';

export function WelcomeEmailDialog({
  open,
  onOpenChange,
  memberName,
  memberEmail,
  roleLabel,
  tempPassword,
  onSend,
  isSending,
}: WelcomeEmailDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [subject, setSubject] = useState(`Tervetuloa - Käyttöoikeudet myönnetty (${roleLabel})`);
  const [greeting, setGreeting] = useState(DEFAULT_GREETING);
  const [introText, setIntroText] = useState(DEFAULT_INTRO_TEXT);
  const [signature, setSignature] = useState(DEFAULT_SIGNATURE);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates', 'welcome'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_type', 'welcome')
        .order('name');
      
      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: open,
  });

  // Save template mutation
  const saveTemplate = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('email_templates')
        .insert({
          name,
          template_type: 'welcome',
          subject,
          greeting,
          intro_text: introText,
          signature,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', 'welcome'] });
      toast.success('Malli tallennettu');
      setTemplateName('');
      setShowSaveInput(false);
    },
    onError: (error: Error) => {
      toast.error(`Tallennus epäonnistui: ${error.message}`);
    },
  });

  // Delete template mutation
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', 'welcome'] });
      toast.success('Malli poistettu');
      setSelectedTemplateId('');
    },
    onError: (error: Error) => {
      toast.error(`Poisto epäonnistui: ${error.message}`);
    },
  });

  // Reset content when dialog opens with new data
  useEffect(() => {
    if (open) {
      setSubject(`Tervetuloa - Käyttöoikeudet myönnetty (${roleLabel})`);
      setGreeting(DEFAULT_GREETING);
      setIntroText(DEFAULT_INTRO_TEXT);
      setSignature(DEFAULT_SIGNATURE);
      setActiveTab('preview');
      setSelectedTemplateId('');
      setShowSaveInput(false);
      setTemplateName('');
    }
  }, [open, roleLabel]);

  // Load selected template
  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      if (template.subject) setSubject(template.subject);
      if (template.greeting) setGreeting(template.greeting);
      if (template.intro_text) setIntroText(template.intro_text);
      if (template.signature) setSignature(template.signature);
      setSelectedTemplateId(templateId);
      toast.success('Malli ladattu');
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Anna mallille nimi');
      return;
    }
    saveTemplate.mutate(templateName.trim());
  };

  const handleSend = () => {
    onSend({ subject, greeting, introText, signature });
  };

  const previewGreeting = greeting.replace('{{name}}', memberName);

  const emailPreviewHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a365d; margin-bottom: 16px;">${previewGreeting}</h1>
      
      <p style="color: #374151; line-height: 1.6;">${introText}</p>
      
      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #2d3748; margin-top: 0; font-size: 18px;">Käyttäjätietosi</h2>
        
        <p style="margin: 8px 0;"><strong>🔐 Rooli:</strong> ${roleLabel}</p>
        <p style="margin: 8px 0;"><strong>📧 Sähköposti:</strong> ${memberEmail}</p>
        ${tempPassword ? `<p style="margin: 8px 0;"><strong>🔑 Väliaikainen salasana:</strong> ${tempPassword}</p>` : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; font-weight: bold;">
          Kirjaudu sisään
        </span>
      </div>
      
      ${tempPassword ? `
      <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e;">
          <strong>⚠️ Tärkeää:</strong> Vaihda salasanasi heti ensimmäisen kirjautumisen jälkeen omissa tiedoissasi.
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #e0f2fe; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; color: #0369a1;">
          <strong>Unohditko salasanasi?</strong>
        </p>
        <p style="margin: 0; color: #0369a1;">
          Voit nollata salasanasi milloin tahansa: <a href="#" style="color: #0369a1;">Nollaa salasana</a>
        </p>
      </div>
      
      <p style="color: #718096; font-size: 14px; margin-top: 40px; white-space: pre-wrap;">${signature}</p>
    </div>
  `;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Tervetulosähköposti
          </DialogTitle>
          <DialogDescription>
            Lähetä tervetulosähköposti käyttäjälle {memberName} ({memberEmail})
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'edit')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Esikatselu
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Muokkaa sisältöä
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Aihe:</span>
                <span>{subject}</span>
              </div>
              <ScrollArea className="h-[400px] border rounded-lg">
                <div 
                  className="p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: emailPreviewHtml }}
                />
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Template controls */}
                <div className="flex gap-2 items-end pb-4 border-b">
                  <div className="flex-1 space-y-2">
                    <Label className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Tallennetut mallit
                    </Label>
                    <Select value={selectedTemplateId} onValueChange={handleLoadTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Valitse malli..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedTemplateId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (confirm('Haluatko varmasti poistaa tämän mallin?')) {
                          deleteTemplate.mutate(selectedTemplateId);
                        }
                      }}
                      title="Poista malli"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {/* Save template section */}
                {showSaveInput ? (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Mallin nimi</Label>
                      <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Anna mallille nimi..."
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={saveTemplate.isPending}
                    >
                      {saveTemplate.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowSaveInput(false);
                        setTemplateName('');
                      }}
                    >
                      Peruuta
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSaveInput(true)}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Tallenna uudeksi malliksi
                  </Button>
                )}

                <div className="space-y-2">
                  <Label>Sähköpostin otsikko</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Sähköpostin otsikko..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tervehdys</Label>
                  <Input
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                    placeholder="Tervetuloa, {{name}}!"
                  />
                  <p className="text-xs text-muted-foreground">
                    Käytä {'{{name}}'} lisätäksesi vastaanottajan etunimen.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Johdantoteksti</Label>
                  <Textarea
                    value={introText}
                    onChange={(e) => setIntroText(e.target.value)}
                    placeholder="Viesti vastaanottajalle..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Allekirjoitus</Label>
                  <Textarea
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Ystävällisin terveisin,&#10;Pääomaomistajat ry"
                    rows={3}
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Peruuta
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Lähetetään...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Lähetä sähköposti
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
