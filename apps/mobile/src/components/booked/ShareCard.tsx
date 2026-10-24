import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { AvatarStack } from "@/components/ui";
import { trip } from "@/mocks";
import { colors } from "@/theme";
import { KindIcon, kindLabel } from "./icons";
import type { PlanItem, PlanSummary } from "./plan";

// The image that goes back to the group chat. Self-contained (no screen chrome) so the
// ViewShot capture looks right on its own in WhatsApp.
export function ShareCard({ summary }: { summary: PlanSummary }) {
  const rows = [summary.flight, summary.hotel, summary.headline].filter(
    (r): r is PlanItem => r !== null,
  );

  return (
    <LinearGradient
      colors={["#2B1810", "#15100D", colors.bg]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={{ borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: colors.line }}
    >
      <Skyline />

      <View className="gap-5 px-5 pb-5 pt-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full bg-accent" />
            <Text className="font-display text-base text-ink">Huddle</Text>
          </View>
          <View className="rounded-full border border-line bg-bg/60 px-3 py-1">
            <Text className="font-body-semibold text-xs text-muted">
              for {trip.sourceChat.name}
            </Text>
          </View>
        </View>

        <View className="gap-1 pt-16">
          <Text className="font-body-bold text-xs uppercase tracking-widest text-gold">
            We're going to
          </Text>
          <Text className="font-display text-6xl leading-[64px] text-ink">
            {trip.destination.city}
          </Text>
          <Text className="font-body-semibold text-sm text-muted">
            {trip.dates.label} · {trip.destination.region}
          </Text>
        </View>

        {rows.length > 0 ? (
          <View className="gap-3 rounded-2xl bg-bg/70 p-4">
            {rows.map((r) => (
              <View key={r.id} className="flex-row items-center gap-3">
                <KindIcon kind={r.kind} size={20} />
                <View className="flex-1">
                  <Text className="font-body text-[11px] text-faint">{kindLabel[r.kind]}</Text>
                  <Text className="font-body-bold text-sm text-ink" numberOfLines={1}>
                    {r.title}
                  </Text>
                </View>
                <Text className="font-body-bold text-sm text-ink">{r.price}</Text>
              </View>
            ))}
            <View className="flex-row items-center justify-between border-t border-line pt-3">
              <Text className="font-body-semibold text-sm text-muted">Each, all in</Text>
              <Text className="font-display text-xl text-accent">${summary.total}</Text>
            </View>
          </View>
        ) : null}

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <AvatarStack members={trip.members} size="sm" max={5} />
            <Text className="font-body-semibold text-xs text-muted">
              {trip.members.length} going
            </Text>
          </View>
          <Text className="font-body-semibold text-xs text-faint">Planned with Huddle</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// Sunset over the Front Range: a sun and two mountain layers behind the title.
function Skyline() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 36 }}>
      <Svg width="100%" height={150} viewBox="0 0 350 150" preserveAspectRatio="xMidYMax slice">
        <Defs>
          <SvgGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.gold} stopOpacity="0.9" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0.55" />
          </SvgGradient>
        </Defs>
        <Circle cx="268" cy="70" r="46" fill="url(#sun)" />
        <Path
          d="M0 120 L48 82 L78 100 L128 52 L170 92 L206 70 L250 104 L292 66 L350 108 L350 150 L0 150 Z"
          fill="#3A2216"
        />
        <Path
          d="M0 138 L40 114 L92 130 L140 102 L196 128 L240 110 L300 134 L350 120 L350 150 L0 150 Z"
          fill="#1C130E"
        />
      </Svg>
    </View>
  );
}
