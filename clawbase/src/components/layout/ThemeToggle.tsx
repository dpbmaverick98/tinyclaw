'use client';

import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);
  
  const toggle = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  return (
    <button
      onClick={toggle}
      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs"
    >
      {isDark ? 'light' : 'dark'}
    </button>
  );
}
