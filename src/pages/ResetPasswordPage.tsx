import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const resetSchema = z.object({
  email: z.string().email('Virheellinen sähköpostiosoite'),
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    
    setIsLoading(false);

    if (error) {
      toast.error('Virhe salasanan palautuksessa. Yritä uudelleen.');
      return;
    }

    setEmailSent(true);
    toast.success('Palautuslinkki lähetetty sähköpostiisi!');
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Tarkista sähköpostisi</CardTitle>
            <CardDescription>
              Olemme lähettäneet salasanan palautuslinkin sähköpostiisi. Klikkaa linkkiä asettaaksesi uuden salasanan.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/login">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Takaisin kirjautumiseen
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              PV
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Unohtuiko salasana?</CardTitle>
          <CardDescription>
            Syötä sähköpostiosoitteesi, niin lähetämme sinulle palautuslinkin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Sähköposti</Label>
              <Input
                id="email"
                type="email"
                placeholder="nimi@example.fi"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Lähetetään...
                </>
              ) : (
                'Lähetä palautuslinkki'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Takaisin kirjautumiseen
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
