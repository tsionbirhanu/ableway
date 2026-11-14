'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';
import { playEarcon } from '@/lib/audio/earcons';

export interface LanguageItem {
  code: string;
  shortCode: string;
  name: string;
  nativeName: string;
  speechLang: string;
}

export const SUPPORTED_LANGUAGES: LanguageItem[] = [
  {
    code: 'en-US',
    shortCode: 'ENG',
    name: 'English',
    nativeName: 'English',
    speechLang: 'en-US',
  },
  {
    code: 'am-ET',
    shortCode: 'AMH',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    speechLang: 'am-ET',
  },
  {
    code: 'om-ET',
    shortCode: 'ORO',
    name: 'Afaan Oromoo',
    nativeName: 'Afaan Oromoo',
    speechLang: 'en-US',
  },
  {
    code: 'ti-ET',
    shortCode: 'TIG',
    name: 'Tigrinya',
    nativeName: 'ትግርኛ',
    speechLang: 'am-ET',
  },
];

export function getLanguageItem(code: string): LanguageItem {
  if (code.startsWith('am')) return SUPPORTED_LANGUAGES[1];
  if (code.startsWith('om')) return SUPPORTED_LANGUAGES[2];
  if (code.startsWith('ti')) return SUPPORTED_LANGUAGES[3];
  return SUPPORTED_LANGUAGES[0];
}

interface LanguageSelectorDropdownProps {
  className?: string;
  onLanguageChange?: (code: string) => void;
}

export function LanguageSelectorDropdown({
  className = '',
  onLanguageChange,
}: LanguageSelectorDropdownProps) {
  const { language, setLanguage, announce } = useA11y();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentLang = getLanguageItem(language);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard events (Escape to close)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  const handleSelect = (lang: LanguageItem) => {
    setLanguage(lang.code);
    onLanguageChange?.(lang.code);
    setIsOpen(false);
    playEarcon('success');
    announce(`Language set to ${lang.name} (${lang.nativeName})`, 'polite');
    buttonRef.current?.focus();
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        id="language-dropdown-button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select language. Current language is ${currentLang.name}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center gap-1.5 border border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-[#0B132B] cursor-pointer shadow-sm"
      >
        <Globe className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
        <span className="font-bold tracking-wider font-mono text-sm">{currentLang.shortCode}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-orange-400' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Language selection"
          aria-activedescendant={`lang-opt-${currentLang.code}`}
          tabIndex={-1}
          className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0B132B] border border-white/20 shadow-2xl p-1.5 z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 mb-1">
            Choose Language
          </div>
          {SUPPORTED_LANGUAGES.map((item) => {
            const isSelected = item.shortCode === currentLang.shortCode;
            return (
              <button
                key={item.code}
                id={`lang-opt-${item.code}`}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500 text-white font-bold shadow-sm'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      isSelected
                        ? 'bg-black/20 text-white'
                        : 'bg-white/10 text-orange-300 border border-white/10'
                    }`}
                  >
                    {item.shortCode}
                  </span>
                  <div>
                    <div className="font-semibold">{item.nativeName}</div>
                    <div
                      className={`text-[10px] ${
                        isSelected ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      {item.name}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-white shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
