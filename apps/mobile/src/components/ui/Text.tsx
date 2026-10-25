import { Text as RNText, type TextProps } from "react-native";
import { cn } from "./cn";

type Props = TextProps & {
  className?: string;
  // Tabular (fixed-width) digits for prices, counts and times, so totals don't jitter.
  numeric?: boolean;
};

const TABULAR = { fontVariant: ["tabular-nums" as const] };

// Shared body of every type role: merge classes, add tabular digits when asked.
function TypeRole({ base, className, numeric = false, style, ...props }: Props & { base: string }) {
  return (
    <RNText className={cn(base, className)} style={numeric ? [TABULAR, style] : style} {...props} />
  );
}

// Type roles from DESIGN.md (sizes live in tailwind.config.js). Bricolage Grotesque for
// anything you'd say out loud, Manrope for everything you read. Pass className to override
// size/color; cn() makes the override win.

// One per screen: trip title, onboarding question, booked title.
export function Display(props: Props) {
  return <TypeRole base="font-display text-display text-ink" {...props} />;
}

// Screen headers (Settings, chat name), day headers.
export function Title(props: Props) {
  return <TypeRole base="font-display text-title text-ink" {...props} />;
}

// Place names, questions, fact values. DESIGN.md sets this role in Bricolage 500
// (`font-display-medium`); it stays 700 here until each screen opts in.
export function Heading(props: Props) {
  return <TypeRole base="font-display text-headline text-ink" {...props} />;
}

export function Body(props: Props) {
  return <TypeRole base="font-body text-body text-ink" {...props} />;
}

export function Muted(props: Props) {
  return <TypeRole base="font-body text-small text-muted" {...props} />;
}

// Timestamps, attribution, counts under avatars. 12px is the floor.
export function Caption(props: Props) {
  return <TypeRole base="font-body-medium text-caption text-faint" {...props} />;
}

// Sentence-case section heading above a group (never above a title). No caps, no tracking.
export function Label(props: Props) {
  return <TypeRole base="font-body-semibold text-label text-muted" {...props} />;
}
