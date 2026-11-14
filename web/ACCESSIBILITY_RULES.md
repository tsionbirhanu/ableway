# Ableway Frontend Accessibility UI Rules (WCAG 2.2 AA / AAA)

Standard: WCAG 2.2 AA at minimum, AAA contrast where possible. Users are blind or visually impaired, and many are new to computers.

Refer to this document for every component and page developed for Ableway.

---

## 1. Structure and Semantics

1. **Native HTML first**: Use `button`, `a`, `input`, `select`, `label`, `fieldset`, `legend`, `table`, `dialog`. Use ARIA only when no native element exists, and never add a role that conflicts with the element.
2. **Landmarks & Page Structure**: Every page has a `lang` attribute, exactly one `h1`, headings in order with no skipped levels, landmarks (`header`, `nav`, `main`, `footer`), and a skip link to main as the first focusable element.
3. **Consistent Landmarks**: Navigation and the Help link are in the same place on every page.
4. **Unique Titles**: Every page has a unique descriptive title (e.g. _"Choose a course - Ableway"_).

## 2. Keyboard and Focus

5. **Keyboard alone**: Everything works by keyboard alone in logical order. No keyboard traps. No positive `tabindex`.
6. **Visible Focus**: 3px outline with 2px offset, 3:1 contrast against surroundings, never removed. Sticky bars must not hide focused elements (`scroll-padding-top`).
7. **Route changes**: On route change, move focus to the new page's `h1` (`tabindex="-1"`) and announce the page name in a polite live region.
8. **Dialogs**: Dialogs move focus in, trap it, close with Escape, and return focus to the trigger.
9. **Shortcuts**: Single-key shortcuts must be switchable off or remappable. Use modifier combinations (e.g. `Alt+Shift+key`) and list them on the Help page.

## 3. Visual Design

10. **Contrast**: Text contrast at least 4.5:1 (7:1 in high contrast theme). Interface parts and focus indicators at least 3:1. Never use colour alone to carry meaning; add text or an icon with an accessible name.
11. **Themes & Reflow**: Three themes: default, high contrast, and large text (up to 200%). Layouts must work at 400% zoom without scrolling in two directions. Use `rem` units and responsive layouts.
12. **Touch/Click Targets**: At least 44 by 44 CSS pixels (`min-h-[44px] min-w-[44px]`), with spacing.
13. **Motion**: Respect `prefers-reduced-motion`. No autoplaying media, no flashing, no moving content that cannot be paused.
14. **Hover & Drag**: Never rely on hover. No drag-only actions; always provide a button alternative.

## 4. Forms and Errors

15. **Labels & Grouping**: Every input has a visible, persistent label (never a placeholder alone), the right type, and an autocomplete attribute. Group related fields with `fieldset` and `legend`. Mark required fields with the word "required".
16. **Submit Errors**: Show a summary at the top (`role="alert"`) and move focus to it. Also show a message next to each field, linked with `aria-describedby` and `aria-invalid`. Say what to do, for example "Enter an email like name@example.com".
17. **Simple Auth**: Do not make users enter the same information twice. Authentication must not need puzzles or CAPTCHAs, must allow paste and password managers, and should use one-time codes.
18. **No Time Limits**: If a session will expire, warn in text and audio and let the user extend it.

## 5. Dynamic Content and Audio

19. **Shared Live Region**: Use one shared `LiveRegion` component. Status changes use `aria-live="polite"`; use "assertive" only for urgent errors. Messages are short and never repeated.
20. **Dual Modes**: Voice mode: app speaks. Screen reader mode: app never speaks; it writes to live regions and screen reader reads them. Never speak over a screen reader.
21. **Audio Controls**: Audio always has controls (play, pause, back 10 seconds, speed, volume) and a text transcript. Audio never starts without a user action.
22. **Text Alternatives**: Every non-text item has a text alternative. Decorative items are hidden (`alt=""` or `aria-hidden="true"`).

## 6. Content

23. **Plain Language**: Plain language, short sentences, reading level around grade 6. Offer at most five options at once. Say what will happen before an action.
24. **Data Tables & Lists**: Tables only for data, with `th`, `scope`, and a `caption`. Use real `ul` and `ol` lists.
25. **Language**: Set `lang` on page and on any foreign text, updating when the learner switches language.

## 7. Testing

26. **Automated & Manual Testing**: Axe tests (`@axe-core/react`), Playwright keyboard-only tests, and manual verification with NVDA, JAWS, VoiceOver, and TalkBack at 400% zoom.
