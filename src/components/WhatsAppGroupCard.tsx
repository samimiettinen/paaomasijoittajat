import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MessageCircle, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/KGpcVQZ5O800HkKzBFxGMZ';

export function WhatsAppGroupCard() {
  const [copied, setCopied] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(WHATSAPP_GROUP_LINK);
      setCopied(true);
      toast.success('Linkki kopioitu leikepöydälle');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopiointi epäonnistui');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          WhatsApp-ryhmä
        </CardTitle>
        <CardDescription>
          Jaa kutsu yhteisön WhatsApp-ryhmään
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Kopioitu!' : 'Kopioi linkki'}
          </Button>
          
          <Button variant="outline" size="sm" asChild>
            <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Avaa ryhmä
            </a>
          </Button>

          <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <QrCode className="h-4 w-4 mr-2" />
                Näytä QR-koodi
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  Liity WhatsApp-ryhmään
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <QRCodeSVG
                    value={WHATSAPP_GROUP_LINK}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Skannaa QR-koodi WhatsApp-sovelluksella liittyäksesi ryhmään
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Kopioitu!' : 'Kopioi linkki'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-xs text-muted-foreground break-all">
          {WHATSAPP_GROUP_LINK}
        </p>
      </CardContent>
    </Card>
  );
}
