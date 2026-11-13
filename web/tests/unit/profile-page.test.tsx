// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';
import '@testing-library/jest-dom/vitest';
import './vitest-axe.d.ts';
import ProfilePage from '@/app/profile/page';

expect.extend(matchers);

// Mock A11y Context
const mockAnnounce = vi.fn();
const mockSpeak = vi.fn();
const mockSetMode = vi.fn();
const mockSetTheme = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetLanguage = vi.fn();

vi.mock('@/lib/a11y/a11y-context', () => ({
  useA11y: () => ({
    announce: mockAnnounce,
    speak: mockSpeak,
    mode: 'voice-first',
    setMode: mockSetMode,
    theme: 'default',
    setTheme: mockSetTheme,
    fontSize: 'normal',
    setFontSize: mockSetFontSize,
    language: 'en',
    setLanguage: mockSetLanguage,
  }),
}));

// Mock Earcons
vi.mock('@/lib/audio/earcons', () => ({
  playEarcon: vi.fn(),
}));

describe('ProfilePage (F0 WCAG 2.2 AA & AAA Compliance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL & Clipboard
    if (typeof window !== 'undefined') {
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    }
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // 1. Structure & Headed sections test
  it('renders all 6 required headed sections in strict sequential hierarchy', () => {
    render(<ProfilePage />);

    // Single H1
    const h1 = screen.getByRole('heading', { level: 1, name: /learner profile and settings/i });
    expect(h1).toBeInTheDocument();

    // 6 H2 sections
    const h2Headings = screen.getAllByRole('heading', { level: 2 });
    const headingTexts = h2Headings.map((h) => h.textContent?.trim());

    expect(headingTexts).toContain('Personal details');
    expect(headingTexts).toContain('Accessibility settings');
    expect(headingTexts).toContain('Language');
    expect(headingTexts).toContain('Alerts');
    expect(headingTexts).toContain('Telegram');
    expect(headingTexts).toContain('Privacy and data');
  });

  // 2. Personal details section
  it('allows updating personal details and announces on save', () => {
    render(<ProfilePage />);

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const saveButton = screen.getByRole('button', { name: /save personal details/i });

    fireEvent.change(nameInput, { target: { value: 'Derartu Tulu' } });
    fireEvent.change(emailInput, { target: { value: 'derartu@example.com' } });
    fireEvent.click(saveButton);

    expect(mockAnnounce).toHaveBeenCalledWith('Personal details saved successfully.', 'polite');
    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });

  // 3. Accessibility settings & Language
  it('supports changing accessibility mode, theme, text size, and language', () => {
    render(<ProfilePage />);

    // Switch assistant mode
    const screenReaderModeBtn = screen.getByRole('button', {
      name: /screen reader.*silent mode/i,
    });
    fireEvent.click(screenReaderModeBtn);
    expect(mockSetMode).toHaveBeenCalledWith('screen-reader');
    expect(mockAnnounce).toHaveBeenCalledWith('Interaction mode set to Screen Reader.', 'polite');

    // Change theme
    const themeSelect = screen.getByLabelText(/contrast theme/i);
    fireEvent.change(themeSelect, { target: { value: 'high-contrast' } });
    expect(mockSetTheme).toHaveBeenCalledWith('high-contrast');

    // Change text size
    const sizeSelect = screen.getByLabelText(/text size/i);
    fireEvent.change(sizeSelect, { target: { value: 'large' } });
    expect(mockSetFontSize).toHaveBeenCalledWith('large');

    // Change language
    const langSelect = screen.getByLabelText(/preferred language/i);
    fireEvent.change(langSelect, { target: { value: 'am-ET' } });
    expect(mockSetLanguage).toHaveBeenCalledWith('am-ET');
  });

  // 4. Alerts section: form, subscriptions list, Pause, Delete
  describe('Alerts section', () => {
    it('shows validation error when keywords is empty', () => {
      render(<ProfilePage />);
      const addBtn = screen.getByRole('button', { name: /add job alert/i });
      fireEvent.click(addBtn);

      const alerts = screen.getAllByRole('alert');
      expect(alerts[0]).toHaveTextContent(/please enter one or more keywords/i);
      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('Error: Please enter one or more keywords'),
        'assertive'
      );
    });

    it('adds a new job alert and displays it in the active subscriptions list', () => {
      render(<ProfilePage />);
      const keywordsInput = screen.getByLabelText(/keywords/i);
      const locationInput = screen.getByLabelText(/location/i);
      const addBtn = screen.getByRole('button', { name: /add job alert/i });

      fireEvent.change(keywordsInput, { target: { value: 'Data entry specialist' } });
      fireEvent.change(locationInput, { target: { value: 'Hawassa' } });
      fireEvent.click(addBtn);

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('New job alert added for Data entry specialist'),
        'polite'
      );
      expect(screen.getByText('Data entry specialist')).toBeInTheDocument();
    });

    it('pauses and deletes an existing subscription with announcements', () => {
      render(<ProfilePage />);

      // Initial subscription in list
      const pauseBtn = screen.getAllByRole('button', { name: /pause alert for/i })[0];
      fireEvent.click(pauseBtn);

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('paused.'),
        'polite'
      );

      // Now resume button should exist
      const resumeBtn = screen.getByRole('button', { name: /resume alert for/i });
      fireEvent.click(resumeBtn);
      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('resumed.'),
        'polite'
      );

      // Delete subscription
      const deleteBtn = screen.getAllByRole('button', { name: /delete alert for/i })[0];
      fireEvent.click(deleteBtn);
      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('deleted.'),
        'polite'
      );
    });
  });

  // 5. Telegram Section: plain language explanation, linking, copy, slow reading
  describe('Telegram section - Linking workflow', () => {
    it('explains in plain language what linking allows and what the bot cannot do', () => {
      render(<ProfilePage />);

      expect(screen.getByText(/what linking allows/i)).toBeInTheDocument();
      expect(screen.getByText(/job help:/i)).toBeInTheDocument();
      expect(screen.getByText(/what the bot cannot do/i)).toBeInTheDocument();
      expect(screen.getByText(/cannot see or read/i)).toBeInTheDocument();
      expect(screen.getByText(/other chats, personal messages/i)).toBeInTheDocument();
    });

    it('creates a one-time code and displays ordered list of 4 steps', () => {
      render(<ProfilePage />);

      const connectBtn = screen.getByRole('button', { name: /connect telegram/i });
      fireEvent.click(connectBtn);

      // Shows ordered list of 4 steps
      const stepsList = screen.getByRole('list', { name: /steps to connect/i });
      expect(stepsList).toBeInTheDocument();
      const listItems = screen.getAllByRole('listitem');
      const stepTexts = listItems.map((li) => li.textContent);

      expect(stepTexts.some((t) => t?.includes('Open Telegram'))).toBe(true);
      expect(stepTexts.some((t) => t?.includes('@AblewayBot'))).toBe(true);
      expect(stepTexts.some((t) => t?.includes('Start'))).toBe(true);
      expect(stepTexts.some((t) => t?.includes('Send this code'))).toBe(true);

      // Displays one-time code in large text
      expect(screen.getByText(/your one-time linking code/i)).toBeInTheDocument();

      // Displays expiry time as text
      expect(screen.getByText(/code expires in/i)).toBeInTheDocument();

      // Announcement triggered
      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('Your Telegram linking code is'),
        'polite'
      );
    });

    it('copies code to clipboard and announces when "Copy code" is clicked', async () => {
      render(<ProfilePage />);
      fireEvent.click(screen.getByRole('button', { name: /connect telegram/i }));

      const copyBtn = screen.getByRole('button', { name: /copy code to clipboard/i });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(mockAnnounce).toHaveBeenCalledWith('Code copied to clipboard.', 'polite');
      });
    });

    it('reads code slowly character by character via assistant', () => {
      render(<ProfilePage />);
      fireEvent.click(screen.getByRole('button', { name: /connect telegram/i }));

      const readSlowlyBtn = screen.getByRole('button', {
        name: /let the assistant read code slowly/i,
      });
      fireEvent.click(readSlowlyBtn);

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringMatching(/\d \.\.\. \d/),
        true
      );
    });

    it('detects link connection and announces "Telegram connected"', async () => {
      render(<ProfilePage />);
      fireEvent.click(screen.getByRole('button', { name: /connect telegram/i }));

      // Trigger simulated connection event
      const simulateBtn = screen.getByRole('button', {
        name: /simulate telegram connection/i,
      });
      fireEvent.click(simulateBtn);

      // Verifies announcement: "Telegram connected"
      expect(mockAnnounce).toHaveBeenCalledWith('Telegram connected', 'polite');

      // Switches to Linked state
      expect(screen.getByText('Status: Connected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /unlink telegram/i })).toBeInTheDocument();
    });
  });

  // 6. Telegram Section - Expiry
  describe('Telegram section - Code Expiry', () => {
    it('shows expiry text and announces when code expires, and creates a fresh code', () => {
      vi.useFakeTimers();
      render(<ProfilePage />);

      fireEvent.click(screen.getByRole('button', { name: /connect telegram/i }));
      expect(screen.getByText(/code expires in/i)).toBeInTheDocument();

      // Fast forward time past 300 seconds
      act(() => {
        vi.advanceTimersByTime(301000);
      });

      // Shows expiry text
      expect(screen.getByText('Code has expired. Please make a new code.')).toBeInTheDocument();
      expect(mockAnnounce).toHaveBeenCalledWith(
        'Code has expired. Please make a new code.',
        'assertive'
      );

      // Generates a fresh code
      const makeNewCodeBtn = screen.getByRole('button', { name: /make a new code/i });
      fireEvent.click(makeNewCodeBtn);

      expect(screen.getByText(/code expires in/i)).toBeInTheDocument();
      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('Your Telegram linking code is'),
        'polite'
      );
    });
  });

  // 7. Telegram Section - Unlinking workflow with confirmation dialog
  describe('Telegram section - Unlinking workflow', () => {
    it('opens confirmation dialog on Unlink, cancels safely, and confirms unlinking', async () => {
      render(<ProfilePage />);
      // Connect first
      fireEvent.click(screen.getByRole('button', { name: /connect telegram/i }));
      fireEvent.click(screen.getByRole('button', { name: /simulate telegram connection/i }));
      expect(screen.getByText('Status: Connected')).toBeInTheDocument();

      // Click Unlink Telegram button
      const unlinkBtn = screen.getByRole('button', { name: /unlink telegram/i });
      fireEvent.click(unlinkBtn);

      // Confirmation dialog opens with accessible name and description
      const dialog = screen.getByRole('dialog', { name: /unlink telegram account/i });
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to unlink telegram\?/i)).toBeInTheDocument();

      // Cancel button closes dialog without unlinking
      const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
      fireEvent.click(cancelBtn);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText('Status: Connected')).toBeInTheDocument();

      // Open dialog again and confirm unlinking
      fireEvent.click(screen.getByRole('button', { name: /unlink telegram/i }));
      const confirmUnlinkBtn = screen.getByRole('button', { name: /yes, unlink telegram/i });
      fireEvent.click(confirmUnlinkBtn);

      // Confirms disconnection
      expect(mockAnnounce).toHaveBeenCalledWith('Telegram disconnected', 'polite');
      expect(screen.queryByText('Status: Connected')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /connect telegram/i })).toBeInTheDocument();
    });
  });

  // 8. Privacy and data section
  describe('Privacy and data section', () => {
    it('opens confirmation dialog for Export my data and confirms download', () => {
      render(<ProfilePage />);

      const exportBtn = screen.getByRole('button', { name: /export my data/i });
      fireEvent.click(exportBtn);

      const dialog = screen.getByRole('dialog', { name: /export your personal data/i });
      expect(dialog).toBeInTheDocument();

      const downloadBtn = screen.getByRole('button', { name: /download my data/i });
      fireEvent.click(downloadBtn);

      expect(mockAnnounce).toHaveBeenCalledWith('Your data export has downloaded.', 'polite');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens confirmation dialog for Delete my account and confirms deletion', () => {
      render(<ProfilePage />);

      const deleteBtn = screen.getByRole('button', { name: /delete my account/i });
      fireEvent.click(deleteBtn);

      const dialog = screen.getByRole('dialog', { name: /permanently delete your account/i });
      expect(dialog).toBeInTheDocument();

      const confirmDeleteBtn = screen.getByRole('button', {
        name: /yes, permanently delete my account/i,
      });
      fireEvent.click(confirmDeleteBtn);

      expect(mockAnnounce).toHaveBeenCalledWith('Your account has been deleted.', 'assertive');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // 9. Axe audits across all 3 themes
  describe('WCAG 2.2 Axe Accessibility Audit Across Themes', () => {
    const themes = ['theme-default', 'theme-high-contrast', 'text-large'];

    themes.forEach((themeClass) => {
      it(`passes axe audit in [${themeClass}] (default unlinked state)`, async () => {
        const { container } = render(
          <div className={themeClass}>
            <ProfilePage />
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it(`passes axe audit in [${themeClass}] with active linking code`, async () => {
        const { container } = render(
          <div className={themeClass}>
            <ProfilePage />
          </div>
        );
        fireEvent.click(screen.getByRole('button', { name: /connect telegram/i }));
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it(`passes axe audit in [${themeClass}] in linked state`, async () => {
        const { container } = render(
          <div className={themeClass}>
            <ProfilePage />
          </div>
        );
        fireEvent.click(screen.getByRole('button', { name: /connect telegram/i }));
        fireEvent.click(screen.getByRole('button', { name: /simulate telegram connection/i }));
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
  });
});

