# Accessibility UI Rules (WCAG 2.2 AA / AAA)

These rules MUST be followed in every component, page, style, and interaction.
Target users are blind or visually impaired, and many are new to computers.

## Structure and Semantics
1. **Native HTML first**: Use native elements (`button`, `a`, `input`, `select`, `label`, `fieldset`, `legend`, `table`, `dialog`). Use ARIA only when no native element exists, and never add a role that conflicts with the element.
2. **Landmarks & Hierarchy**: Every page has a `lang` attribute, exactly one `h1`, headings in order with no skipped levels, landmarks (`header`, `nav`, `main`, `footer`), and a skip link to main as the first focusable element.
3. **Consistent Controls**: Navigation and the Help link must be in the exact same location on every page.
4. **Unique Titles**: Every page has a unique descriptive title (e.g., "Choose a course - Ableway").

## Keyboard and Focus
5. **Keyboard-Only Operation**: Everything works by keyboard alone in logical DOM order. No keyboard traps. No positive `tabindex`.
6. **Visible Focus Indicator**: 3px outline with 2px offset, at least 3:1 contrast against surroundings, never removed. Sticky bars must never hide focused elements (`scroll-padding-top`).
7. **Route Announcements**: On route change, move focus to the new page's `h1` (`tabindex="-1"`) and announce the page name in a polite live region.
8. **Dialog Management**: Dialogs must move focus in, trap focus, close with Escape, and return focus to the trigger element on close.
9. **Shortcuts**: Single-key shortcuts must be switchable off or remappable. Prefer modifier combinations (`Alt+Shift+Key`) and document all shortcuts on the Help page/modal.

## Visual Design
10. **Contrast & Redundancy**: Text contrast at least 4.5:1 (7:1 in high contrast theme). Interface components and focus rings at least 3:1. Never use colour alone to carry meaning; always include text or an icon with an accessible name.
11. **Themes & Zoom**: Three themes: Default, High Contrast, and Large Text (up to 200%). Layouts must work at 400% zoom without horizontal scrolling. Use `rem` units and responsive flex/grid layouts.
12. **Target Sizes**: Click and touch targets are at least 44 by 44 CSS pixels (`min-h-[44px] min-w-[44px]`), with adequate spacing.
13. **Motion**: Respect `prefers-reduced-motion`. No autoplaying media, no flashing, and no moving content that cannot be paused.
14. **Hover & Drag**: Never rely on hover. No drag-only actions; always provide button alternatives.

## Forms and Errors
15. **Labels & Groups**: Every input has a visible, persistent label (never placeholder alone), correct type, and `autocomplete` attribute. Group related fields with `fieldset` and `legend`. Mark required fields with the word "required".
16. **Error Summary & Inline Feedback**: On submit errors, show a summary at the top (`role="alert"`) and move focus to it. Display error message next to field, linked with `aria-describedby` and `aria-invalid="true"`. Give actionable guidance (e.g., "Enter an email like name@example.com").
17. **Simple Auth**: Never require entering the same data twice. No puzzles or CAPTCHAs; allow password manager autofill and paste; use one-time codes.
18. **No Time Limits**: No arbitrary timeouts. If a session/code expires, warn in text and audio and provide an "Extend time" option.

## Dynamic Content and Audio
19. **Shared Live Region**: One shared `LiveAnnouncer` component. Use `aria-live="polite"` for status changes; use `assertive` only for critical errors. Messages are short and deduplicated.
20. **Dual Assistant Modes**:
    - **Voice Mode**: App speaks synthesized speech.
    - **Screen Reader Mode**: App never speaks aloud; all announcements route silently to ARIA live regions so screen readers (NVDA, JAWS, VoiceOver) don't experience double-talk.
21. **Audio Player**: Audio always has explicit controls (play, pause, back 10s, speed, volume) and synchronized text transcript. Audio never autoplays.
22. **Text Alternatives**: Every non-text element has a text alternative. Purely decorative elements are hidden (`aria-hidden="true"` or `alt=""`).

## Content
23. **Plain Language**: Grade 6 reading level, short sentences. Offer at most 5 options at once. Explain outcomes before taking actions.
24. **Semantic Lists & Tables**: Tables strictly for tabular data (`caption`, `<th scope="col">`). Lists must use native `ul` or `ol`.
25. **Language Tagging**: Set `lang` on the page and on any multilingual snippet, updating when the learner switches language.

## Testing
26. **Automated & Manual Verification**: Automated axe checks (`@axe-core/react`) and manual verification with screen readers (NVDA, JAWS, VoiceOver, TalkBack) and 400% zoom reflow.

