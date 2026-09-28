'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="h-11 w-11" aria-hidden />;
  const dark = resolvedTheme === 'dark';
  return (
    <button className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:text-brand-700 dark:bg-[#14241f]" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Bật giao diện sáng' : 'Bật giao diện tối'}>
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}

