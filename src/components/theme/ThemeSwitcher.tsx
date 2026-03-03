import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Sun, Moon, Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Compact dropdown for the header */
export function ThemeSwitcher() {
  const { currentTheme, setTheme, themes, isDark, toggleDark } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title="Change Theme">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Application Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {(Object.keys(themes) as ThemeName[]).map((key) => {
          const t = themes[key];
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => setTheme(key)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              {currentTheme === key && <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleDark} className="cursor-pointer">
          {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Full-page theme settings panel (for a settings page) */
export function ThemeSettingsPanel() {
  const { currentTheme, setTheme, themes, isDark, toggleDark } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Application Theme</h3>
        <p className="text-sm text-muted-foreground">Choose a visual theme for the application</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(themes) as ThemeName[]).map((key) => {
          const t = themes[key];
          const isActive = currentTheme === key;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all hover:shadow-md ${isActive ? 'ring-2 ring-primary border-primary' : ''}`}
              onClick={() => setTheme(key)}
            >
              <CardContent className="pt-6 space-y-3">
                {/* Preview swatches */}
                <div className="flex gap-1.5">
                  <div className="w-8 h-8 rounded" style={{ background: `hsl(${t.cssVars['--sidebar-background']})` }} />
                  <div className="w-8 h-8 rounded" style={{ background: `hsl(${t.cssVars['--primary']})` }} />
                  <div className="w-8 h-8 rounded" style={{ background: `hsl(${t.cssVars['--accent']})` }} />
                  <div className="w-8 h-8 rounded border" style={{ background: `hsl(${t.cssVars['--background']})` }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{t.label}</p>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button variant="outline" onClick={toggleDark} className="gap-2">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </Button>
      </div>
    </div>
  );
}
