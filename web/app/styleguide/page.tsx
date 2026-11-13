'use client';

import React, { useState } from 'react';
import {
  Button,
  LinkButton,
  TextField,
  SelectField,
  RadioGroup,
  Checkbox,
  Dialog,
  LiveRegion,
  SkipLink,
  VisuallyHidden,
  Alert,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Tabs,
  Table,
  ProgressBar,
  AudioPlayer,
} from '@/components/ui';
import { useA11y } from '@/core/a11y/a11y-context';

export default function StyleguidePage() {
  const { theme, setTheme, fontSize, setTextSize, announce } = useA11y();

  // Dialog demonstration state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dialogTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  // Form demonstration states
  const [textValue, setTextValue] = useState('');
  const [selectValue, setSelectValue] = useState('option-1');
  const [radioValue, setRadioValue] = useState('standard');
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [progress, setProgress] = useState(65);
  const [liveMsg, setLiveMsg] = useState('Initial polite live status message.');

  // Table sample data
  interface ShortcutItem {
    id: string;
    action: string;
    shortcut: string;
    category: string;
  }

  const sampleShortcuts: ShortcutItem[] = [
    { id: '1', action: 'Activate Voice Assistant', shortcut: 'Alt + Shift + V', category: 'Global' },
    { id: '2', action: 'Open Help & Shortcuts', shortcut: 'Alt + Shift + H', category: 'Navigation' },
    { id: '3', action: 'Quick Accessibility Settings', shortcut: 'Alt + Shift + S', category: 'Settings' },
    { id: '4', action: 'Pause / Resume Audio', shortcut: 'Alt + Shift + Space', category: 'Playback' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      {/* Page Header */}
      <div className="border-b-2 border-[var(--color-border)] pb-6 space-y-3">
        <h1 tabIndex={-1} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text)]">
          Ableway Accessibility UI Styleguide
        </h1>
        <p className="text-[var(--font-size-base)] text-[var(--color-text-muted)] leading-relaxed max-w-3xl">
          Standard: WCAG 2.2 AA at minimum, AAA contrast where possible. Every component provides typed props,
          visible 3px focus indicators with 2px offset, minimum 44×44px interactive target sizes, and support for all three themes.
        </p>

        {/* Live Theme & Text Size Switcher Bar */}
        <div className="mt-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              Switch Theme (Test All 3 Themes)
            </h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Theme selector">
              <Button
                type="button"
                variant={theme === 'default' ? 'primary' : 'outline'}
                onClick={() => {
                  setTheme('default');
                  announce('Switched to Default Savanna Dark theme', 'polite');
                }}
                aria-pressed={theme === 'default'}
              >
                Default (Savanna Dark)
              </Button>
              <Button
                type="button"
                variant={theme === 'high-contrast' ? 'primary' : 'outline'}
                onClick={() => {
                  setTheme('high-contrast');
                  announce('Switched to High Contrast 7:1 theme', 'polite');
                }}
                aria-pressed={theme === 'high-contrast'}
              >
                High Contrast (7:1+)
              </Button>
              <Button
                type="button"
                variant={theme === 'yellow-black' ? 'primary' : 'outline'}
                onClick={() => {
                  setTheme('yellow-black');
                  announce('Switched to Yellow on Black theme', 'polite');
                }}
                aria-pressed={theme === 'yellow-black'}
              >
                Yellow on Black
              </Button>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              Text Size (Up to 200% Zoomable)
            </h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Text size selector">
              <Button
                type="button"
                variant={fontSize === 'normal' ? 'primary' : 'outline'}
                onClick={() => {
                  setTextSize('normal');
                  announce('Standard text size active', 'polite');
                }}
                aria-pressed={fontSize === 'normal'}
              >
                Normal (18px)
              </Button>
              <Button
                type="button"
                variant={fontSize === 'large' ? 'primary' : 'outline'}
                onClick={() => {
                  setTextSize('large');
                  announce('Large text size active', 'polite');
                }}
                aria-pressed={fontSize === 'large'}
              >
                Large (22px)
              </Button>
              <Button
                type="button"
                variant={fontSize === 'x-large' ? 'primary' : 'outline'}
                onClick={() => {
                  setTextSize('x-large');
                  announce('Extra large text size active', 'polite');
                }}
                aria-pressed={fontSize === 'x-large'}
              >
                Extra Large (26px)
              </Button>
              <Button
                type="button"
                variant={fontSize === 'xx-large' ? 'primary' : 'outline'}
                onClick={() => {
                  setTextSize('xx-large');
                  announce('Maximum 200% text size active', 'polite');
                }}
                aria-pressed={fontSize === 'xx-large'}
              >
                Maximum (32px / 200%)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Buttons & LinkButtons */}
      <section className="space-y-4" aria-labelledby="section-buttons">
        <h2 id="section-buttons" className="text-2xl font-bold text-[var(--color-text)]">
          1. Button &amp; LinkButton
        </h2>
        <Card>
          <CardContent className="space-y-6 pt-4">
            <div>
              <h3 className="text-base font-semibold mb-3">Button Variants (min 44×44px, 3px focus ring)</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={() => announce('Primary button clicked')}>
                  Primary Button
                </Button>
                <Button variant="secondary" onClick={() => announce('Secondary button clicked')}>
                  Secondary Button
                </Button>
                <Button variant="outline" onClick={() => announce('Outline button clicked')}>
                  Outline Button
                </Button>
                <Button variant="danger" onClick={() => announce('Danger button clicked')}>
                  Danger Button
                </Button>
                <Button variant="ghost" onClick={() => announce('Ghost button clicked')}>
                  Ghost Button
                </Button>
                <Button variant="primary" disabled>
                  Disabled Button
                </Button>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <h3 className="text-base font-semibold mb-3">LinkButton (Semantic Anchor styled as Button)</h3>
              <div className="flex flex-wrap items-center gap-3">
                <LinkButton href="/courses" variant="primary">
                  Browse Courses
                </LinkButton>
                <LinkButton href="/help" variant="outline">
                  Get Help
                </LinkButton>
                <LinkButton href="/settings" variant="secondary">
                  Open Settings
                </LinkButton>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. Form Inputs: TextField, SelectField, RadioGroup, Checkbox */}
      <section className="space-y-4" aria-labelledby="section-forms">
        <h2 id="section-forms" className="text-2xl font-bold text-[var(--color-text)]">
          2. Accessible Form Controls (WCAG Rules 15 &amp; 16)
        </h2>
        <Card>
          <CardContent className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField
                id="styleguide-name"
                label="Full name"
                required
                hint="Enter your legal first and last name"
                placeholder="e.g. Abebe Bikila"
                value={textValue}
                onChange={e => setTextValue(e.target.value)}
                autoComplete="name"
              />

              <TextField
                id="styleguide-error-demo"
                label="Email address"
                required
                defaultValue="invalid-email"
                error="Enter an email like name@example.com"
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField
                id="styleguide-language-select"
                label="Preferred language"
                required
                hint="Choose the language for the course material"
                value={selectValue}
                onChange={e => setSelectValue(e.target.value)}
                options={[
                  { value: 'option-1', label: 'English (US / UK)' },
                  { value: 'option-2', label: 'Amharic (አማርኛ)' },
                  { value: 'option-3', label: 'Afaan Oromoo' },
                ]}
              />

              <SelectField
                id="styleguide-select-error"
                label="Payment frequency"
                error="Please select an eligible billing period"
                options={[
                  { value: '', label: '-- Select a period --' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'annual', label: 'Annual (Save 20%)' },
                ]}
              />
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <RadioGroup
                legend="Audio Interaction Preference"
                name="audio-mode"
                required
                hint="Determines whether the synthetic assistant speaks or defers to your screen reader"
                value={radioValue}
                onChange={val => setRadioValue(val)}
                options={[
                  {
                    value: 'standard',
                    label: 'Voice Mode (Assistant Speaks)',
                    description: 'Synthesizes speech aloud for learners without a screen reader',
                  },
                  {
                    value: 'screen-reader',
                    label: 'Screen Reader Mode (Silent to Assistive Tech)',
                    description: 'Writes updates to live regions and never speaks over your reader',
                  },
                  {
                    value: 'hybrid',
                    label: 'Hybrid Mode',
                    description: 'Synthesizes voice on explicit request, silent otherwise',
                  },
                ]}
              />
            </div>

            <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
              <Checkbox
                id="styleguide-consent"
                label="I agree to receive accessible audio notifications"
                hint="You can toggle or mute notifications anytime in Settings"
                checked={checkboxValue}
                onChange={e => setCheckboxValue(e.target.checked)}
              />

              <Checkbox
                id="styleguide-error-checkbox"
                label="I accept the Ableway Terms of Service"
                required
                error="You must review and accept the terms before enrolling"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. Alerts & Live Regions */}
      <section className="space-y-4" aria-labelledby="section-alerts">
        <h2 id="section-alerts" className="text-2xl font-bold text-[var(--color-text)]">
          3. Alerts &amp; Dynamic Announcements (WCAG Rules 10, 16, &amp; 19)
        </h2>
        <Card>
          <CardContent className="space-y-4 pt-4">
            <Alert severity="info" title="Course Enrollment Open">
              Spring 2026 cohort enrollment is currently open until December 15.
            </Alert>
            <Alert severity="success" title="Settings Saved">
              Your accessibility preferences were persisted to your profile successfully.
            </Alert>
            <Alert severity="warning" title="Session Warning">
              Your session will expire in 5 minutes due to inactivity. Press Extend to remain active.
            </Alert>
            <Alert severity="error" title="Payment Required">
              Please enter an active Telebirr or CBE account number to continue.
            </Alert>

            <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
              <h3 className="text-base font-semibold">LiveRegion Test</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Click below to trigger polite live region announcements that screen readers will read.
              </p>
              <div className="flex gap-3 items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const msg = `Updated at ${new Date().toLocaleTimeString()}: Progress saved.`;
                    setLiveMsg(msg);
                    announce(msg, 'polite');
                  }}
                >
                  Trigger Polite Update
                </Button>
                <LiveRegion message={liveMsg} />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. Dialog Modal with Focus Trap */}
      <section className="space-y-4" aria-labelledby="section-dialog">
        <h2 id="section-dialog" className="text-2xl font-bold text-[var(--color-text)]">
          4. Accessible Dialog Modal (WCAG Rule 8)
        </h2>
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-[var(--font-size-base)] text-[var(--color-text-muted)]">
              Dialog traps keyboard focus, closes on Escape, provides backdrop click dismissal,
              and returns focus to the trigger button upon closing.
            </p>
            <Button
              ref={dialogTriggerRef}
              type="button"
              variant="primary"
              onClick={() => setIsDialogOpen(true)}
              aria-haspopup="dialog"
            >
              Open Demonstration Dialog
            </Button>

            <Dialog
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              title="Accessible Confirmation Dialog"
              description="This dialog traps keyboard focus, respects Escape key dismissal, and returns focus cleanly to its trigger."
              triggerRef={dialogTriggerRef}
            >
              <div className="space-y-4">
                <p className="text-[var(--font-size-base)] text-[var(--color-text)]">
                  When this modal opened, focus moved to the first focusable control inside.
                  Pressing Tab will cycle within this dialog. Pressing Escape or the Close button will exit and return focus to the trigger.
                </p>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setIsDialogOpen(false);
                      announce('Action confirmed inside dialog', 'polite');
                    }}
                  >
                    Confirm Action
                  </Button>
                </div>
              </div>
            </Dialog>
          </CardContent>
        </Card>
      </section>

      {/* 5. Tabs Component */}
      <section className="space-y-4" aria-labelledby="section-tabs">
        <h2 id="section-tabs" className="text-2xl font-bold text-[var(--color-text)]">
          5. WAI-ARIA Tabs with Arrow Key Roving Focus
        </h2>
        <Card>
          <CardContent className="pt-4">
            <Tabs
              ariaLabel="Styleguide feature tabs"
              defaultTabId="overview"
              items={[
                {
                  id: 'overview',
                  label: 'Curriculum Overview',
                  content: (
                    <div className="space-y-2">
                      <h4 className="font-bold text-lg">Curriculum &amp; Objectives</h4>
                      <p className="text-[var(--color-text-muted)] leading-relaxed">
                        Learn Python, accessibility testing, and audio engineering with screen readers.
                        Includes 12 weeks of self-paced coursework and live weekly mentorship.
                      </p>
                    </div>
                  ),
                },
                {
                  id: 'prerequisites',
                  label: 'Prerequisites',
                  content: (
                    <div className="space-y-2">
                      <h4 className="font-bold text-lg">Requirements</h4>
                      <p className="text-[var(--color-text-muted)] leading-relaxed">
                        Basic familiarity with keyboard navigation (NVDA, JAWS, or VoiceOver) or
                        desire to learn keyboard-first computing.
                      </p>
                    </div>
                  ),
                },
                {
                  id: 'mentors',
                  label: 'Mentorship',
                  content: (
                    <div className="space-y-2">
                      <h4 className="font-bold text-lg">Assigned Mentors</h4>
                      <p className="text-[var(--color-text-muted)] leading-relaxed">
                        Each student is paired with a certified accessibility engineer and a career advisor.
                      </p>
                    </div>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      {/* 6. Accessible Table */}
      <section className="space-y-4" aria-labelledby="section-table">
        <h2 id="section-table" className="text-2xl font-bold text-[var(--color-text)]">
          6. Data Table with Caption &amp; Scope (WCAG Rule 24)
        </h2>
        <Card>
          <CardContent className="pt-4">
            <Table
              caption="Available Keyboard Shortcuts Reference Table"
              summary="Listing of key combinations, descriptions, and functional categories"
              data={sampleShortcuts}
              keyExtractor={item => item.id}
              columns={[
                { header: 'Action', accessor: 'action', isRowHeader: true },
                { header: 'Key Combination', accessor: 'shortcut' },
                { header: 'Category', accessor: 'category' },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      {/* 7. ProgressBar */}
      <section className="space-y-4" aria-labelledby="section-progress">
        <h2 id="section-progress" className="text-2xl font-bold text-[var(--color-text)]">
          7. ProgressBar with ARIA Attributes
        </h2>
        <Card>
          <CardContent className="space-y-4 pt-4">
            <ProgressBar
              value={progress}
              min={0}
              max={100}
              label="Course Completion Progress"
              valueText={`${progress}% completed of Chapter 4`}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setProgress(prev => Math.max(0, prev - 10))}
                aria-label="Decrease progress by 10 percent"
              >
                - 10%
              </Button>
              <Button
                variant="outline"
                onClick={() => setProgress(prev => Math.min(100, prev + 10))}
                aria-label="Increase progress by 10 percent"
              >
                + 10%
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 8. AudioPlayer with Accessible Transcript */}
      <section className="space-y-4" aria-labelledby="section-audio">
        <h2 id="section-audio" className="text-2xl font-bold text-[var(--color-text)]">
          8. Accessible Audio Player with Transcript (WCAG Rule 21)
        </h2>
        <Card>
          <CardContent className="pt-4">
            <AudioPlayer
              title="Introduction to Screen Readers: NVDA and JAWS"
              src="/assets/audio/sample-lesson.mp3"
              transcript={`Welcome to Ableway! In this introductory lesson, we will explore navigating modern web applications using NVDA and JAWS.

Key Takeaways:
1. Heading navigation: Press 'H' to jump to the next heading, or Shift + H to jump to the previous heading.
2. Landmark navigation: Press 'D' to jump between landmarks such as banner, navigation, main, and footer.
3. Form controls: Press 'F' to navigate between form fields, or Tab to traverse interactive elements in sequence.

Always ensure your synthesizer speech rate is comfortable for sustained listening.`}
            />
          </CardContent>
        </Card>
      </section>

      {/* 9. VisuallyHidden & SkipLink Utilities */}
      <section className="space-y-4" aria-labelledby="section-utilities">
        <h2 id="section-utilities" className="text-2xl font-bold text-[var(--color-text)]">
          9. Accessibility Utilities (SkipLink &amp; VisuallyHidden)
        </h2>
        <Card>
          <CardContent className="space-y-4 pt-4">
            <p className="text-[var(--font-size-base)] text-[var(--color-text-muted)]">
              `VisuallyHidden` hides content visually while preserving it for assistive technology.
              The text below contains hidden instructions readable by screen readers:
            </p>
            <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
              <span>Visible status: Active learner account.</span>
              <VisuallyHidden>
                Additional screen reader context: Your account renewal is scheduled for December 2026.
              </VisuallyHidden>
            </div>

            <div className="pt-2">
              <p className="text-sm text-[var(--color-text-muted)]">
                `SkipLink` is mounted at the top of the page. Press <kbd className="font-mono bg-[var(--color-bg)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">Tab</kbd> from the URL bar to reveal it.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
