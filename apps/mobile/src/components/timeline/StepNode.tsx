import {
  AirplaneTilt,
  Bed,
  ChatTeardropText,
  Check,
  Compass,
  type IconProps,
  MapPin,
  Question,
  ShieldCheck,
  SlidersHorizontal,
} from "phosphor-react-native";
import { type ComponentType, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { TimelineTool } from "@/mocks/timeline";
import { colors } from "@/theme";
import type { StepStatus } from "./useTimelinePlayback";

export const NODE = 36;

const toolIcons: Record<TimelineTool, ComponentType<IconProps>> = {
  extract_trip: ChatTeardropText,
  apply_preferences: SlidersHorizontal,
  suggest_destinations: Compass,
  search_flights: AirplaneTilt,
  search_hotels: Bed,
  search_places: MapPin,
  pin_on_map: MapPin,
  verify: ShieldCheck,
  ask_user: Question,
};

// The circle on the timeline rail: tool icon while pending/running, a check when done.
// Running gets a spinning arc and a soft pulse so it reads as "working" from across a room.
export function StepNode({ tool, status }: { tool: TimelineTool; status: StepStatus }) {
  const Icon = toolIcons[tool];
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    if (status === "running") {
      spin.value = 0;
      spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
      pulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })),
        -1,
      );
    } else {
      cancelAnimation(spin);
      cancelAnimation(pulse);
      pulse.value = 0;
    }
    if (status === "done") {
      pop.value = withSequence(withTiming(1.18, { duration: 140 }), withSpring(1));
    }
  }, [status, spin, pulse, pop]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * pulse.value,
    transform: [{ scale: 1 + 0.35 * pulse.value }],
  }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const ring =
    status === "done" ? colors.accent : status === "running" ? colors["accent-soft"] : colors.line;
  const fill = status === "done" ? colors.accent : status === "running" ? colors.raised : colors.bg;

  return (
    <View style={{ width: NODE, height: NODE }}>
      {status === "running" ? (
        <>
          <Animated.View
            style={[
              {
                position: "absolute",
                width: NODE,
                height: NODE,
                borderRadius: NODE / 2,
                backgroundColor: colors.accent,
              },
              pulseStyle,
            ]}
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                width: NODE,
                height: NODE,
                borderRadius: NODE / 2,
                borderWidth: 2,
                borderColor: "transparent",
                borderTopColor: colors.accent,
                borderRightColor: colors.accent,
              },
              spinStyle,
            ]}
          />
        </>
      ) : null}
      <Animated.View style={popStyle}>
        <View
          style={{
            width: NODE,
            height: NODE,
            borderRadius: NODE / 2,
            borderWidth: 2,
            borderColor: ring,
            backgroundColor: fill,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {status === "done" ? (
            <Check size={18} color={colors.bg} weight="bold" />
          ) : (
            <Icon
              size={17}
              color={status === "running" ? colors.accent : colors.faint}
              weight={status === "running" ? "fill" : "regular"}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
}
