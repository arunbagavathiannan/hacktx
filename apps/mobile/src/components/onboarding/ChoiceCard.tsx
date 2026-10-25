import { Pressable, View } from "react-native";
import { Heading, Muted } from "@/components/ui";
import { cn } from "@/lib/cn";

type Props = {
  label: string; // the stored value; shown beside the title when a title is given (e.g. "$$")
  title?: string; // heading text; defaults to label
  description?: string;
  selected: boolean;
  onPress: () => void;
};

// Single-select answer: a full-width card with a radio on the right. No leading icon: the
// words carry the choice. The Pressable itself carries the radio role and checked state for
// TalkBack.
export function ChoiceCard({ label, title, description, selected, onPress }: Props) {
  const heading = title ?? label;
  const tier = title && title !== label ? label : null;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={description ? `${heading}. ${description}` : heading}
      accessibilityState={{ checked: selected, selected }}
      aria-checked={selected}
      onPress={onPress}
      className={cn(
        "min-h-12 flex-row items-center gap-4 rounded-card border px-5 py-4 active:opacity-80",
        selected ? "border-accent bg-accent-soft" : "border-line bg-surface",
      )}
    >
      <View className="flex-1 gap-1">
        <View className="flex-row items-baseline gap-2">
          <Heading className="font-display-medium">{heading}</Heading>
          {tier ? (
            <Muted className={cn("font-body-medium", selected ? "text-accent" : "text-faint")}>
              {tier}
            </Muted>
          ) : null}
        </View>
        {description ? <Muted>{description}</Muted> : null}
      </View>
      <View
        className={cn(
          "h-5 w-5 items-center justify-center rounded-full border-2",
          selected ? "border-accent" : "border-muted",
        )}
      >
        {selected ? <View className="h-2.5 w-2.5 rounded-full bg-accent" /> : null}
      </View>
    </Pressable>
  );
}
