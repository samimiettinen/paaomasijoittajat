import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Salasanan tulee olla vähintään 6 merkkiä'),
  confirmPassword: z.string().min(6, 'Vahvista salasana'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Salasanat eivät täsmää',
  path: ['confirmPassword'],
});

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // A valid session indicates the user clicked the email link
      if (session) {
        setIsValidSession(true);
      }
      setCheckingSession(false);
    };
    checkSession();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  });

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    setIsLoading(false);

    if (error) {
      toast.error('Virhe salasanan päivittämisessä. Yritä uudelleen.');
      return;
    }

    toast.success('Salasana päivitetty onnistuneesti!');
    navigate('/login', { replace: true });
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">Virheellinen linkki</CardTitle>
            <CardDescription>
              Salasanan palautuslinkki on vanhentunut tai virheellinen. Pyydä uusi linkki.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/reset-password')}>
              Pyydä uusi palautuslinkki
            </Button>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Aseta uusi salasana</CardTitle>
          <CardDescription>
            Syötä uusi salasanasi. Käytä vähintään 6 merkkiä.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Uusi salasana</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Vahvista salasana</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Päivitetään...
                </>
              ) : (
                'Päivitä salasana'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
