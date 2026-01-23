import { useState } from 'react';
import { MessageSquare, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { generateBulkWhatsAppLinks, type BulkWhatsAppMember } from '@/lib/whatsapp';

interface BulkWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: BulkWhatsAppMember[];
  eventTitle?: string;
}

const defaultTemplate = `Hei {first_name}!

Olet kutsuttu tapahtumaan. Vahvistathan osallistumisesi vastaamalla tähän viestiin.

Ystävällisin terveisin,
Pääomasijoittajien Vibe Coding Society`;

export function BulkWhatsAppDialog({ open, onOpenChange, members, eventTitle }: BulkWhatsAppDialogProps) {
  const [messageTemplate, setMessageTemplate] = useState(
    eventTitle 
      ? `Hei {first_name}!\n\nOlet kutsuttu tapahtumaan "${eventTitle}". Vahvistathan osallistumisesi vastaamalla tähän viestiin.\n\nYstävällisin terveisin,\nPääomasijoittajien Vibe Coding Society`
      : defaultTemplate
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [openedLinks, setOpenedLinks] = useState<Set<number>>(new Set());

  const whatsappLinks = generateBulkWhatsAppLinks(members, messageTemplate);

  const handleCopyLink = async (link: string, index: number) => {
    await navigator.clipboard.writeText(link);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('Linkki kopioitu!');
  };

  const handleOpenLink = (link: string, index: number) => {
    window.open(link, '_blank');
    setOpenedLinks(prev => new Set([...prev, index]));
  };

  const handleOpenAll = () => {
    // Open links with a small delay to prevent browser blocking
    whatsappLinks.forEach(({ link }, index) => {
      setTimeout(() => {
        window.open(link, '_blank');
        setOpenedLinks(prev => new Set([...prev, index]));
      }, index * 500);
    });
    toast.info(`Avataan ${whatsappLinks.length} WhatsApp-linkkiä...`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Lähetä WhatsApp-viestit ({members.length} jäsentä)
          </DialogTitle>
          <DialogDescription>
            Muokkaa viestimallia ja avaa linkit lähettääksesi viestit. Käytä {'{first_name}'}, {'{last_name}'} tai {'{full_name}'} personointiin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Viestimalli</Label>
            <Textarea
              id="template"
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {openedLinks.size}/{members.length} avattu
            </span>
            <Button onClick={handleOpenAll} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Avaa kaikki linkit
            </Button>
          </div>

          <ScrollArea className="h-[250px] border rounded-lg">
            <div className="p-2 space-y-2">
              {whatsappLinks.map(({ member, link }, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    openedLinks.has(index) ? 'bg-success/10 border-success/30' : 'bg-card'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.mobile_phone}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyLink(link, index)}
                      title="Kopioi linkki"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant={openedLinks.has(index) ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => handleOpenLink(link, index)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      {openedLinks.has(index) ? 'Avattu' : 'Avaa'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Sulje
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
