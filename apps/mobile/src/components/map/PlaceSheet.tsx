import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Check, Clock, MapPin, NavigationArrow, Plus, Star } from "phosphor-react-native";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarStack, Body, Button, Heading, Muted } from "@/components/ui";
import type { Member, Place } from "@/mocks/types";
import { colors } from "@/theme";
import { categoryMeta, sourceLabel } from "./categories";

type Props = {
  place: Place | null; // null closes the sheet
  picked: boolean;
  pickers: Member[];
  onToggle: () => void;
  onDismiss: () => void;
};

const formatCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : `${n}`;

function names(members: Member[]) {
  const list = members.map((m) => (m.isYou ? "You" : m.name));
  if (list.length <= 2) return list.join(" and ");
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-2.5">
      {icon}
      <Body className="flex-1 text-[15px] text-ink">{children}</Body>
    </View>
  );
}

function Backdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} />
  );
}

// Place details: tap a pin, see what's there, add it to the plan.
export function PlaceSheet({ place, picked, pickers, onToggle, onDismiss }: Props) {
  const ref = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  // Keep showing the last place while the sheet animates closed.
  const [shown, setShown] = useState<Place | null>(place);

  useEffect(() => {
    if (place) {
      setShown(place);
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [place]);

  const meta = shown ? categoryMeta[shown.category] : null;

  return (
    <BottomSheetModal
      ref={ref}
      onDismiss={onDismiss}
      backdropComponent={Backdrop}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.surface, borderRadius: 28 }}
      handleIndicatorStyle={{ backgroundColor: colors.line, width: 44 }}
    >
      <BottomSheetView style={{ paddingBottom: insets.bottom + 16 }}>
        {shown && meta ? (
          <View className="gap-4 px-5 pt-1">
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <View
                  className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
                  style={{ backgroundColor: `${meta.color}22` }}
                >
                  <meta.Icon size={14} color={meta.color} weight="fill" />
                  <Text className="font-body-bold text-xs" style={{ color: meta.color }}>
                    {meta.label}
                  </Text>
                </View>
                <Text className="font-body text-xs text-faint">{sourceLabel[shown.source]}</Text>
              </View>
              <Heading className="text-2xl leading-8">{shown.name}</Heading>
              <View className="flex-row flex-wrap items-center gap-x-1.5">
                <Star size={15} color={colors.gold} weight="fill" />
                <Text className="font-body-bold text-sm text-ink">{shown.rating.toFixed(1)}</Text>
                <Text className="font-body text-sm text-muted">
                  ({formatCount(shown.reviews)} reviews) · {shown.price}
                </Text>
              </View>
            </View>

            <Body className="text-muted">{shown.blurb}</Body>

            <View className="gap-2.5 rounded-2xl border border-line px-4 py-3.5">
              {shown.hours ? (
                <InfoRow icon={<Clock size={18} color={colors.muted} weight="regular" />}>
                  {shown.hours}
                </InfoRow>
              ) : null}
              <InfoRow icon={<MapPin size={18} color={colors.muted} weight="regular" />}>
                {shown.address}
              </InfoRow>
              <InfoRow icon={<NavigationArrow size={18} color={colors.muted} weight="regular" />}>
                {shown.distanceLabel}
              </InfoRow>
            </View>

            <View className="flex-row items-center gap-3">
              {pickers.length > 0 ? (
                <>
                  <AvatarStack members={pickers} size="sm" />
                  <Muted className="flex-1">{names(pickers)} picked this</Muted>
                </>
              ) : (
                <Muted>No picks yet. Be the first.</Muted>
              )}
            </View>

            <Button
              label={picked ? "Added to plan" : "Add to plan"}
              variant={picked ? "secondary" : "primary"}
              icon={
                picked ? (
                  <Check size={18} color={colors.good} weight="fill" />
                ) : (
                  <Plus size={18} color={colors.bg} weight="fill" />
                )
              }
              onPress={onToggle}
            />
          </View>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
