import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const signupSchema = z.object({
  email: z.string().email('Virheellinen sähköpostiosoite'),
  password: z.string().min(6, 'Salasanan tulee olla vähintään 6 merkkiä'),
  confirmPassword: z.string().min(6, 'Salasanan tulee olla vähintään 6 merkkiä'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Salasanat eivät täsmää',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);

    // First, check if email exists in members table
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, email, first_name, last_name')
      .eq('email', data.email)
      .maybeSingle();

    if (memberError) {
      setIsLoading(false);
      toast.error('Virhe tarkistettaessa jäsenyyttä.');
      return;
    }

    if (!member) {
      setIsLoading(false);
      toast.error('Sähköpostiosoitetta ei löydy jäsenrekisteristä. Ota yhteyttä ylläpitoon.');
      return;
    }

    // Proceed with signup
    const { error: signupError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setIsLoading(false);

    if (signupError) {
      if (signupError.message.includes('already registered')) {
        toast.error('Tili on jo olemassa. Kirjaudu sisään.');
      } else {
        toast.error('Rekisteröinti epäonnistui: ' + signupError.message);
      }
      return;
    }

    toast.success('Rekisteröinti onnistui! Voit nyt kirjautua sisään.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              PV
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Luo tili</CardTitle>
          <CardDescription>
            Rekisteröidy jäsenrekisterin sähköpostilla
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

            <div className="space-y-2">
              <Label htmlFor="password">Salasana</Label>
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
                  Rekisteröidään...
                </>
              ) : (
                'Luo tili'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Vain jäsenrekisterissä olevat sähköpostit voivat rekisteröityä.</p>
            <Link to="/login" className="text-primary hover:underline mt-2 block">
              Onko sinulla jo tili? Kirjaudu sisään
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
