// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';
import '@testing-library/jest-dom/vitest';
import './vitest-axe.d.ts';
import HomePage from '@/app/page';
import { LanguageSelectorDropdown } from '@/components/navigation/language-selector-dropdown';

expect.extend(matchers);

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock A11y Context
const mockAnnounce = vi.fn();
const mockSetLanguage = vi.fn();
let currentLanguage = 'en-US';

vi.mock('@/lib/a11y/a11y-context', () => ({
  useA11y: () => ({
    language: currentLanguage,
    setLanguage: mockSetLanguage,
    mode: 'voice-first',
    announce: mockAnnounce,
    speechRate: 0.82,
  }),
}));

// Mock Audio
vi.mock('@/lib/audio/earcons', () => ({
  playEarcon: vi.fn(),
}));

describe('Welcome Page & Language Selector (F0 Compliance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLanguage = 'en-US';
  });

  afterEach(() => {
    cleanup();
  });

  it('verifies the old "choose your language" section space is deleted from the page', () => {
    render(<HomePage />);
    expect(document.getElementById('welcome-multilingual-section')).toBeNull();
  });

  it('verifies the voice assistance part is removed from the page', () => {
    render(<HomePage />);
    expect(document.getElementById('voice-assistant-status-widget')).toBeNull();
  });

  it('renders the language option in "ENG" form with dropdown arrow and selects language on click', () => {
    render(<LanguageSelectorDropdown />);

    // Renders "ENG" button with dropdown arrow
    const dropdownBtn = screen.getByRole('button', { name: /select language/i });
    expect(dropdownBtn).toBeInTheDocument();
    expect(dropdownBtn).toHaveTextContent('ENG');

    // Click to open dropdown
    fireEvent.click(dropdownBtn);
    expect(dropdownBtn).toHaveAttribute('aria-expanded', 'true');

    // Listbox with options appears
    expect(screen.getByRole('listbox', { name: /language selection/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /አማርኛ/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /afaan oromoo/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /ትግርኛ/i })).toBeInTheDocument();

    // Select Amharic
    fireEvent.click(screen.getByRole('option', { name: /አማርኛ/i }));
    expect(mockSetLanguage).toHaveBeenCalledWith('am-ET');
  });

  it('passes axe accessibility audit across all 3 themes', async () => {
    const themes = ['theme-default', 'theme-high-contrast', 'text-large'];

    for (const themeClass of themes) {
      const { container } = render(
        <div className={themeClass}>
          <HomePage />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      cleanup();
    }
  });
});
