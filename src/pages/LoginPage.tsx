import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Virheellinen sähköpostiosoite'),
  password: z.string().min(6, 'Salasanan tulee olla vähintään 6 merkkiä'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast.error('Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana.');
      return;
    }

    toast.success('Kirjautuminen onnistui!');
    navigate(from, { replace: true });
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
          <CardTitle className="text-2xl font-bold">Kirjaudu sisään</CardTitle>
          <CardDescription>
            Pääomasijoittajien vibe coding society
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kirjaudutaan...
                </>
              ) : (
                'Kirjaudu sisään'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/reset-password" className="text-sm text-muted-foreground hover:text-primary hover:underline">
              Unohtuiko salasana?
            </Link>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Vain ylläpitäjät voivat kirjautua.</p>
            <Link to="/signup" className="text-primary hover:underline mt-2 block">
              Eikö sinulla ole tiliä? Rekisteröidy
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
