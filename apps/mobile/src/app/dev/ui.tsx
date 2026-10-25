import { AirplaneTilt, Bed, ForkKnife, MapPin, MapTrifold } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";
import {
  AvatarStack,
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Chip,
  Display,
  Heading,
  Label,
  Muted,
  Perforation,
  Screen,
  Skeleton,
  Title,
} from "@/components/ui";
import { members } from "@/mocks";
import { colors, icon } from "@/theme";

// Component gallery for reviewing the design system (and PR screenshots). Not in the demo.
export default function UiGallery() {
  const [selected, setSelected] = useState("Fly");

  return (
    <Screen scroll>
      <Label className="pt-4">Design system</Label>
      <Title>Huddle UI</Title>
      <Body>Body text in Manrope. Headings in Bricolage Grotesque.</Body>
      <Muted>Muted text for secondary info.</Muted>

      <Label>Type roles</Label>
      <Display>Denver weekend</Display>
      <Title>Friday, Nov 13</Title>
      <Heading>The Crawford Hotel</Heading>
      <Caption>Caption · 9:41 PM · 12px floor</Caption>
      <View className="gap-1">
        <Muted numeric>$1,111 · 4 going (numeric)</Muted>
        <Muted numeric>$8,888 · 5 going (numeric)</Muted>
      </View>

      <Label>Colors</Label>
      <View className="flex-row flex-wrap gap-2">
        {Object.entries(colors).map(([name, value]) => (
          <View key={name} className="items-center gap-1">
            <View
              className="h-10 w-10 rounded-xl border border-line"
              style={{ backgroundColor: value }}
            />
            <Muted className="text-[10px]">{name}</Muted>
          </View>
        ))}
      </View>

      <Label>Buttons</Label>
      <Button label="Plan it" />
      <Button label="Change dates" variant="secondary" />
      <Button label="Not now" variant="ghost" />
      <Button
        label="Open the map"
        disabled
        icon={<MapTrifold size={20} color={colors.bg} weight={icon.activeWeight} />}
      />

      <Label>Chips</Label>
      <View className="flex-row flex-wrap gap-2">
        {["Fly", "Drive", "Either"].map((o) => (
          <Chip key={o} label={o} selected={selected === o} onPress={() => setSelected(o)} />
        ))}
      </View>

      <Label>Cards</Label>
      <Card>
        <View className="flex-row items-center gap-3">
          <AirplaneTilt size={icon.size} color={colors.accent} weight={icon.weight} />
          <View className="flex-1">
            <Heading className="text-base">Southwest · Fri 7:05 AM</Heading>
            <Muted>Nonstop · 2h 15m</Muted>
          </View>
          <Body className="font-body-bold">$142</Body>
        </View>
      </Card>
      <Card selected>
        <View className="flex-row items-center gap-3">
          <Bed size={icon.size} color={colors.accent} weight={icon.activeWeight} />
          <View className="flex-1 gap-1">
            <Heading className="text-base">The Crawford Hotel</Heading>
            <Muted>4.7 ★ · Union Station · $249/night</Muted>
          </View>
          <AvatarStack members={members.slice(2, 5)} size="sm" />
        </View>
      </Card>

      <Label>Badges</Label>
      <View className="flex-row gap-2">
        <Badge label="Spotted in ski bums" tone="accent" />
        <Badge label="Fits budget" tone="good" />
        <Badge label="3 picks" />
        <Badge label="$40 over budget" tone="accent" variant="accent" />
      </View>

      <Label>Ticket perforation</Label>
      <View className="overflow-hidden rounded-card bg-surface">
        <View className="gap-1 p-5">
          <Muted>When</Muted>
          <Heading>Fri Nov 13 – Sun 15</Heading>
        </View>
        <Perforation />
        <View className="gap-1 p-5">
          <Heading>Fly or drive?</Heading>
          <Muted>Austin → Denver is a 13-hour drive.</Muted>
        </View>
      </View>

      <Label>Avatars</Label>
      <AvatarStack members={members} />

      <Label>Loading</Label>
      <Card>
        <View className="gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </View>
      </Card>

      <Label>Icons (Phosphor, regular / fill)</Label>
      <View className="flex-row gap-4">
        <MapPin size={icon.size} color={colors.ink} weight={icon.weight} />
        <MapPin size={icon.size} color={colors.accent} weight={icon.activeWeight} />
        <ForkKnife size={icon.size} color={colors.ink} weight={icon.weight} />
        <ForkKnife size={icon.size} color={colors.accent} weight={icon.activeWeight} />
      </View>
    </Screen>
  );
}
