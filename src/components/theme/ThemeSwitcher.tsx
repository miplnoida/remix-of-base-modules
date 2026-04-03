import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Check, Sun, Moon, Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Compact dropdown for the header — only shows enabled themes from DB */
export function ThemeSwitcher() {
  const { currentTheme, setTheme, enabledThemes, isDark, toggleDark } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title="Change Theme">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Application Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {enabledThemes.map((t) => {
          const isActive = currentTheme === t.theme_key;
          const cssVars = t.css_vars as Record<string, string>;
          return (
            <DropdownMenuItem
              key={t.theme_key}
              onClick={() => setTheme(t.theme_key)}
              className={`flex items-center gap-3 cursor-pointer py-2.5 ${isActive ? 'bg-primary/5' : ''}`}
            >
              {/* Color swatches */}
              <div className="flex gap-0.5 flex-shrink-0">
                <div className="w-4 h-4 rounded-sm" style={{ background: `hsl(${cssVars['--sidebar-background']})` }} />
                <div className="w-4 h-4 rounded-sm" style={{ background: `hsl(${cssVars['--primary']})` }} />
                <div className="w-4 h-4 rounded-sm border" style={{ background: `hsl(${cssVars['--accent']})` }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.label}</p>
                <p className="text-xs text-muted-foreground truncate">{t.description}</p>
              </div>
              {isActive && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleDark} className="cursor-pointer py-2.5">
          {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
