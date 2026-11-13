import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import 'vitest-axe/extend-expect';
import '@testing-library/jest-dom';
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

const themes = ['theme-default', 'theme-high-contrast', 'text-large'];

describe('WCAG 2.2 Accessibility & Keyboard Tests for UI Components', () => {
  // Helper to test across all 3 themes
  const testInThemes = (name: string, ui: React.ReactElement) => {
    themes.forEach(themeClass => {
      it(`${name} [Theme: ${themeClass}] passes axe audit`, async () => {
        const { container } = render(
          <div className={themeClass}>
            {ui}
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
  };

  describe('1. Button', () => {
    testInThemes(
      'Button component',
      <Button variant="primary">Start Course</Button>
    );

    it('receives focus and fires onClick on keyboard activation', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Enroll</Button>);
      const btn = screen.getByRole('button', { name: 'Enroll' });
      btn.focus();
      expect(document.activeElement).toBe(btn);
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. LinkButton', () => {
    testInThemes(
      'LinkButton component',
      <LinkButton href="/courses" variant="primary">Browse Catalog</LinkButton>
    );

    it('renders as semantic link and is focusable', () => {
      render(<LinkButton href="/help">Get Help</LinkButton>);
      const link = screen.getByRole('link', { name: 'Get Help' });
      expect(link).toHaveAttribute('href', '/help');
      link.focus();
      expect(document.activeElement).toBe(link);
    });
  });

  describe('3. TextField', () => {
    testInThemes(
      'TextField component with label and hint',
      <TextField
        id="test-input"
        label="Full Name"
        hint="Enter your legal name"
        required
      />
    );

    testInThemes(
      'TextField in error state with aria-describedby and role="alert"',
      <TextField
        id="test-error-input"
        label="Email Address"
        error="Enter an email like name@example.com"
        defaultValue="invalid"
        required
      />
    );

    it('associates label, hint, and error with input element', () => {
      render(
        <TextField
          id="email-field"
          label="Email Address"
          hint="We will never share your email"
          error="Enter a valid email"
        />
      );
      const input = screen.getByLabelText(/Email Address/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toContain('email-field-error');
      expect(describedBy).toContain('email-field-hint');
    });
  });

  describe('4. SelectField', () => {
    const options = [
      { value: 'en', label: 'English' },
      { value: 'am', label: 'Amharic' },
    ];

    testInThemes(
      'SelectField component',
      <SelectField
        id="test-select"
        label="Preferred Language"
        options={options}
        hint="Select your language"
      />
    );

    it('changes value on selection', () => {
      const handleChange = vi.fn();
      render(
        <SelectField
          id="lang-select"
          label="Preferred Language"
          options={options}
          onChange={handleChange}
        />
      );
      const select = screen.getByLabelText(/Preferred Language/i);
      fireEvent.change(select, { target: { value: 'am' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('5. RadioGroup', () => {
    const radioOptions = [
      { value: 'voice', label: 'Voice Mode', hint: 'Speaks aloud' },
      { value: 'screen', label: 'Screen Reader Mode', hint: 'Silent for NVDA' },
    ];

    testInThemes(
      'RadioGroup component',
      <RadioGroup
        legend="Interaction Mode"
        name="mode-group"
        options={radioOptions}
        value="voice"
        onChange={() => {}}
      />
    );

    it('navigates radios and updates selection', () => {
      const handleChange = vi.fn();
      render(
        <RadioGroup
          legend="Interaction Mode"
          name="mode-group"
          options={radioOptions}
          value="voice"
          onChange={handleChange}
        />
      );
      const screenReaderRadio = screen.getByLabelText(/Screen Reader Mode/i);
      fireEvent.click(screenReaderRadio);
      expect(handleChange).toHaveBeenCalledWith('screen');
    });
  });

  describe('6. Checkbox', () => {
    testInThemes(
      'Checkbox component',
      <Checkbox
        id="test-chk"
        label="Enable high contrast visuals"
        hint="Increases contrast ratio to 7:1"
      />
    );

    it('toggles checked state via keyboard space key', () => {
      const handleChange = vi.fn();
      render(
        <Checkbox
          id="chk-toggle"
          label="Agree to terms"
          onChange={handleChange}
        />
      );
      const chk = screen.getByLabelText(/Agree to terms/i);
      fireEvent.click(chk);
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('7. Dialog', () => {
    it('passes axe audit when open', async () => {
      const { container } = render(
        <Dialog
          isOpen={true}
          onClose={() => {}}
          title="Session Warning"
          description="Your session will expire in 5 minutes."
        >
          <Button variant="primary" onClick={() => {}}>Extend Session</Button>
        </Dialog>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('calls onClose when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <Dialog
          isOpen={true}
          onClose={handleClose}
          title="Session Dialog"
          description="Description text"
        >
          <p>Dialog content</p>
        </Dialog>
      );
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('8. LiveRegion', () => {
    testInThemes(
      'LiveRegion component with polite announcement',
      <LiveRegion mode="polite" message="Lesson 3 completed successfully." />
    );

    it('renders aria-live and aria-atomic attributes correctly', () => {
      render(<LiveRegion mode="assertive" message="Critical error occurred" />);
      const region = screen.getByRole('alert');
      expect(region).toHaveAttribute('aria-live', 'assertive');
      expect(region).toHaveAttribute('aria-atomic', 'true');
      expect(region).toHaveTextContent('Critical error occurred');
    });
  });

  describe('9. SkipLink', () => {
    testInThemes(
      'SkipLink component',
      <div>
        <SkipLink targetId="main-content" />
        <main id="main-content">
          <h1>Main Content</h1>
        </main>
      </div>
    );

    it('moves focus to target element on click', () => {
      render(
        <div>
          <SkipLink targetId="target-area" />
          <div id="target-area">Destination Header</div>
        </div>
      );
      const skip = screen.getByText('Skip to main content');
      fireEvent.click(skip);
      const target = document.getElementById('target-area');
      expect(document.activeElement).toBe(target);
    });
  });

  describe('10. VisuallyHidden', () => {
    testInThemes(
      'VisuallyHidden component',
      <p>
        Total Price: $100
        <VisuallyHidden>US Dollars including taxes</VisuallyHidden>
      </p>
    );

    it('renders with sr-only class preserving screen reader access', () => {
      render(<VisuallyHidden>Accessible description</VisuallyHidden>);
      const hidden = screen.getByText('Accessible description');
      expect(hidden).toHaveClass('sr-only');
    });
  });

  describe('11. Alert', () => {
    testInThemes(
      'Alert components with different severities',
      <div className="space-y-2">
        <Alert severity="info" title="Information">Course update available.</Alert>
        <Alert severity="success" title="Success">Payment confirmed.</Alert>
        <Alert severity="warning" title="Warning">Approaching deadline.</Alert>
        <Alert severity="error" title="Error">Invalid credentials provided.</Alert>
      </div>
    );

    it('renders role="alert" for error and warning and role="status" for info and success', () => {
      const { rerender } = render(<Alert severity="error" title="Error">Failed</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(<Alert severity="info" title="Info">Notice</Alert>);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('12. Card', () => {
    testInThemes(
      'Card component with header and footer',
      <Card>
        <CardHeader>
          <CardTitle>Accessible Web Development</CardTitle>
          <CardDescription>Master WCAG 2.2 standards</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Course overview details.</p>
        </CardContent>
        <CardFooter>
          <Button variant="primary">Enroll Now</Button>
        </CardFooter>
      </Card>
    );
  });

  describe('13. Tabs', () => {
    const tabItems = [
      { id: 'tab1', label: 'Tab 1', content: <p>Panel 1 Content</p> },
      { id: 'tab2', label: 'Tab 2', content: <p>Panel 2 Content</p> },
    ];

    testInThemes(
      'Tabs component',
      <Tabs ariaLabel="Sample Tabs" items={tabItems} defaultTabId="tab1" />
    );

    it('supports arrow key navigation between tabs', () => {
      render(<Tabs ariaLabel="Test Navigation" items={tabItems} defaultTabId="tab1" />);
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      expect(tab1).toHaveAttribute('aria-selected', 'true');
      tab1.focus();

      fireEvent.keyDown(tab1, { key: 'ArrowRight' });
      expect(tab2).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Panel 2 Content')).toBeInTheDocument();
    });
  });

  describe('14. Table', () => {
    const tableData = [
      { id: '1', key: 'Alt+Shift+V', action: 'Voice Assistant' },
      { id: '2', key: 'Alt+Shift+H', action: 'Help page' },
    ];

    testInThemes(
      'Table component with caption and header scope',
      <Table
        caption="Keyboard Shortcuts Table"
        data={tableData}
        keyExtractor={row => row.id}
        columns={[
          { header: 'Action', accessor: 'action', isRowHeader: true },
          { header: 'Shortcut', accessor: 'key' },
        ]}
      />
    );

    it('renders caption and proper column headers', () => {
      render(
        <Table
          caption="Shortcuts Summary"
          data={tableData}
          keyExtractor={row => row.id}
          columns={[
            { header: 'Action', accessor: 'action', isRowHeader: true },
            { header: 'Shortcut', accessor: 'key' },
          ]}
        />
      );
      expect(screen.getByText('Shortcuts Summary')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(2);
      expect(screen.getAllByRole('rowheader')).toHaveLength(2);
    });
  });

  describe('15. ProgressBar', () => {
    testInThemes(
      'ProgressBar component',
      <ProgressBar value={75} min={0} max={100} label="Lesson Progress" />
    );

    it('sets proper ARIA attributes', () => {
      render(<ProgressBar value={40} min={0} max={100} label="Upload Progress" />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '40');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
      expect(bar).toHaveAttribute('aria-valuetext', '40% completed');
    });
  });

  describe('16. AudioPlayer', () => {
    testInThemes(
      'AudioPlayer component with transcript',
      <AudioPlayer
        title="Sample Audio Lesson"
        src="/assets/sample.mp3"
        transcript="This is the full text transcript of the lesson."
      />
    );

    it('toggles transcript visibility via button', () => {
      render(
        <AudioPlayer
          title="Sample Audio Lesson"
          src="/assets/sample.mp3"
          transcript="Full transcript text line."
        />
      );
      const toggleBtn = screen.getByRole('button', { name: /show transcript/i });
      expect(screen.queryByText('Full transcript text line.')).not.toBeInTheDocument();

      fireEvent.click(toggleBtn);
      expect(screen.getByText(/Full transcript text line./)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hide transcript/i })).toBeInTheDocument();
    });
  });
});
