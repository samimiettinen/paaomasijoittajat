import { Outlet, NavLink, Link } from 'react-router-dom';
import { Home, Users, Calendar, Menu, X, LogOut, User, Shield, UserCog, RefreshCw, CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, signOut, isAdmin, isVibeCoder, adminLevel, refreshPermissions } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleRefreshPermissions = async () => {
    setIsRefreshing(true);
    try {
      await refreshPermissions();
      toast.success('Oikeudet päivitetty');
    } catch {
      toast.error('Oikeuksien päivitys epäonnistui');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Navigation items based on role
  const navigation = isAdmin 
    ? [
        { name: 'Etusivu', href: '/', icon: Home },
        { name: 'Jäsenet', href: '/members', icon: Users },
        { name: 'Tapahtumat', href: '/events', icon: Calendar },
        { name: 'Käyttäjähallinta', href: '/vibe-coders', icon: UserCog },
      ]
    : [
        { name: 'Omat tiedot', href: '/profile', icon: User },
        { name: 'Omat tapahtumat', href: '/my-events', icon: CalendarCheck },
      ];

  const roleLabel = adminLevel === 'super' ? 'Super Admin' : adminLevel === 'regular' ? 'Admin' : adminLevel === 'vibe_coder' ? 'Vibe Coder' : '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-border bg-card lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            PV
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">Vibe Coding</span>
            <span className="text-xs text-muted-foreground">Society</span>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-4 flex-1">
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`
              }
            >
              <User className="h-5 w-5" />
              Omat tiedot
            </NavLink>
          )}
        </nav>
        <div className="border-t border-border p-4 space-y-3">
          {user && (
            <div className="px-3 py-2 rounded-lg bg-secondary space-y-1">
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              {roleLabel && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {roleLabel}
                </Badge>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefreshPermissions} 
                disabled={isRefreshing}
                title="Päivitä oikeudet"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Kirjaudu ulos">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
            PV
          </div>
          <span className="text-sm font-semibold">Vibe Coding Society</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Kirjaudu ulos">
            <LogOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden">
          <nav className="fixed inset-y-0 right-0 w-64 border-l border-border bg-card p-4 pt-20">
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`
                }
              >
                <User className="h-5 w-5" />
                Omat tiedot
              </NavLink>
            )}
            {roleLabel && (
              <div className="mt-4 px-3">
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {roleLabel}
                </Badge>
              </div>
            )}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64 flex-1 flex flex-col">
        <div className="flex-1 pt-16 lg:pt-0">
          <Outlet />
        </div>
        
        {/* GDPR Footer */}
        <footer className="border-t border-border bg-card/50 py-4 px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Vibe Coding Society. Kaikki oikeudet pidätetään.</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Tietosuojaseloste
              </Link>
              <span>•</span>
              <span>GDPR</span>
              <span>•</span>
              <span>Tietojen käsittely EU:n tietosuoja-asetuksen mukaisesti</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}