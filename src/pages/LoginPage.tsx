import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { clearAllAuthData } from '@/lib/clearAuthSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const REMEMBER_ME_KEY = 'remember_me_preference';

const loginSchema = z.object({
  email: z.string().email('Virheellinen sähköpostiosoite'),
  password: z.string().min(6, 'Salasanan tulee olla vähintään 6 merkkiä'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  });
  const hasNavigated = useRef(false);
  const hasCleared = useRef(false);

  // Clear ALL auth data when on login page without a user - prevents stale session loops
  useEffect(() => {
    if (!user && !authLoading && !hasCleared.current) {
      hasCleared.current = true;
      console.log('[Login] Clearing all stale auth data...');
      clearAllAuthData();
      
      // Force Supabase client to refresh its state
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          console.log('[Login] Session cleared successfully, ready for fresh login');
        }
      });
    }
  }, [user, authLoading]);

  // Manual session clear handler for troubleshooting
  const handleClearSession = async () => {
    clearAllAuthData();
    await supabase.auth.signOut();
    toast.success('Sessio tyhjennetty');
    window.location.reload();
  };

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Redirect if already authenticated - only once
  useEffect(() => {
    if (user && !authLoading && !hasNavigated.current) {
      hasNavigated.current = true;
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  // Save remember me preference - debounced to avoid re-renders
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));
    }, 100);
    return () => clearTimeout(timeout);
  }, [rememberMe]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    if (isSubmitting || hasNavigated.current) return; // Prevent double-submit
    setIsSubmitting(true);
    
    const { error } = await signIn(data.email, data.password, rememberMe);

    if (error) {
      setIsSubmitting(false);
      toast.error('Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana.');
      return;
    }

    // Verify the user has access before navigating
    const email = data.email.toLowerCase();
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (!member) {
      setIsSubmitting(false);
      toast.error('Käyttäjää ei löydy jäsenrekisteristä. Ota yhteyttä ylläpitoon.');
      await supabase.auth.signOut();
      return;
    }

    // Success - show toast and navigate only once
    hasNavigated.current = true;
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
            Pääomaomistajien vibe coding society
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
                autoComplete="email"
                {...register('email')}
                disabled={isSubmitting}
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
                autoComplete="current-password"
                {...register('password')}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isSubmitting}
              />
              <Label 
                htmlFor="remember-me" 
                className="text-sm font-normal cursor-pointer text-muted-foreground"
              >
                Muista minut (30 päivää)
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
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
            <p>Ylläpitäjät, Insiderit ja Vibe Coderit voivat kirjautua.</p>
            <Link to="/signup" className="text-primary hover:underline mt-2 block">
              Eikö sinulla ole tiliä? Rekisteröidy
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearSession}
              className="w-full text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Tyhjennä vanha sessio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
