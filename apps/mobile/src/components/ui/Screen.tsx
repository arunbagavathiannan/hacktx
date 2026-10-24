import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  footer?: ReactNode;
};

// Every screen's outer shell: dark background, safe areas, optional sticky footer (e.g. a CTA).
export function Screen({ children, scroll = false, className, footer }: Props) {
  const body = scroll ? (
    <ScrollView contentContainerClassName={cn("gap-5 px-5 pb-8 pt-2", className)}>
      {children}
    </ScrollView>
  ) : (
    <View className={cn("flex-1 gap-5 px-5 pt-2", className)}>{children}</View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
      {body}
      {footer ? <View className="border-t border-line px-5 pb-2 pt-3">{footer}</View> : null}
    </SafeAreaView>
  );
}
