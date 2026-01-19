import { Outlet, NavLink } from 'react-router-dom';
import { Home, Users, Calendar, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

const navigation = [
  { name: 'Etusivu', href: '/', icon: Home },
  { name: 'Jäsenet', href: '/members', icon: Users },
  { name: 'Tapahtumat', href: '/events', icon: Calendar },
];

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            PV
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">Vibe Coding</span>
            <span className="text-xs text-muted-foreground">Society</span>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-4">
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
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <ThemeToggle />
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
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="min-h-screen pt-16 lg:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
