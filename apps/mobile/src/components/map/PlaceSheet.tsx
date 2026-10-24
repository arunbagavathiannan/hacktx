import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Check, Clock, MapPin, Plus, Star, X } from "phosphor-react-native";
import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { AvatarStack, Badge, Body, Button, Heading, Muted } from "@/components/ui";
import type { Member, Place } from "@/mocks/types";
import { colors } from "@/theme";
import { categoryIcon } from "./PlacePin";

const categoryLabel: Record<Place["category"], string> = {
  hotel: "Stay",
  food: "Eat",
  activity: "Do",
  nightlife: "Night out",
};

type Props = {
  place: Place | null;
  members: Member[];
  picked: boolean;
  onTogglePick: () => void;
  onClose: () => void;
};

// "What's there": opens when a pin is tapped. Details come from Google Places / SerpAPI.
export function PlaceSheet({ place, members, picked, onTogglePick, onClose }: Props) {
  const ref = useRef<BottomSheet>(null);

  useEffect(() => {
    if (place) ref.current?.snapToIndex(0);
    else ref.current?.close();
  }, [place]);

  const pickers = place ? members.filter((m) => place.pickedBy.includes(m.id)) : [];
  const Icon = place ? categoryIcon[place.category] : null;

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      enableDynamicSizing
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      <BottomSheetView>
        {place && Icon ? (
          <View className="gap-4 px-5 pb-8 pt-1">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1.5">
                <View className="flex-row items-center gap-2">
                  <Icon size={16} color={colors.accent} weight="fill" />
                  <Badge label={categoryLabel[place.category]} tone="accent" />
                </View>
                <Heading>{place.name}</Heading>
                <View className="flex-row items-center gap-1.5">
                  <Star size={14} color={colors.gold} weight="fill" />
                  <Text className="font-body-bold text-sm text-ink">{place.rating.toFixed(1)}</Text>
                  <Muted>
                    ({place.reviews.toLocaleString()}) · {place.price}
                  </Muted>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full bg-raised"
              >
                <X size={16} color={colors.muted} />
              </Pressable>
            </View>

            <Body className="text-muted">{place.blurb}</Body>

            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <MapPin size={16} color={colors.faint} />
                <Muted>
                  {place.address} · {place.distanceLabel}
                </Muted>
              </View>
              {place.hours ? (
                <View className="flex-row items-center gap-2">
                  <Clock size={16} color={colors.faint} />
                  <Muted>{place.hours}</Muted>
                </View>
              ) : null}
            </View>

            {pickers.length > 0 ? (
              <View className="flex-row items-center gap-3">
                <AvatarStack members={pickers} size="sm" />
                <Muted>
                  {pickers.map((m) => m.name).join(", ")} {pickers.length === 1 ? "wants" : "want"}{" "}
                  this
                </Muted>
              </View>
            ) : (
              <Muted>Nobody's picked this yet.</Muted>
            )}

            <Button
              label={picked ? "In your plan" : "Add to plan"}
              variant={picked ? "secondary" : "primary"}
              icon={
                picked ? (
                  <Check size={18} color={colors.good} weight="bold" />
                ) : (
                  <Plus size={18} color={colors.bg} weight="bold" />
                )
              }
              onPress={onTogglePick}
            />
            <Text className="text-center font-body text-[11px] text-faint">
              via {place.source === "google_places" ? "Google Places" : "SerpAPI Google Hotels"}
            </Text>
          </View>
        ) : (
          <View />
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
