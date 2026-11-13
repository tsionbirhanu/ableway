type SkipLinkProps = {
  /** id of the element to jump to, usually the main landmark. */
  targetId: string;
  label?: string;
};

/**
 * First focusable element on every page. Lets keyboard and screen reader
 * users jump past repeated content straight to the main content.
 */
export function SkipLink({ targetId, label = "Skip to main content" }: SkipLinkProps) {
  return (
    <a className="skip-link" href={`#${targetId}`}>
      {label}
    </a>
  );
}
