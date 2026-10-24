import { Text as RNText, type TextProps } from "react-native";
import { cn } from "@/lib/cn";

type Props = TextProps & { className?: string };

// Display type (Bricolage Grotesque) for headings, Manrope for everything else.
// Pass className to override size/color; cn() makes the override win.
export function Title({ className, ...props }: Props) {
  return (
    <RNText className={cn("font-display text-3xl leading-9 text-ink", className)} {...props} />
  );
}

export function Heading({ className, ...props }: Props) {
  return <RNText className={cn("font-display text-xl leading-7 text-ink", className)} {...props} />;
}

export function Body({ className, ...props }: Props) {
  return <RNText className={cn("font-body text-base leading-6 text-ink", className)} {...props} />;
}

export function Muted({ className, ...props }: Props) {
  return <RNText className={cn("font-body text-sm leading-5 text-muted", className)} {...props} />;
}

export function Label({ className, ...props }: Props) {
  return (
    <RNText
      className={cn("font-body-bold text-xs uppercase tracking-widest text-faint", className)}
      {...props}
    />
  );
}
