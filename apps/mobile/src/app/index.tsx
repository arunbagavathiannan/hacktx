import { ChatsCircle } from "phosphor-react-native";
import { Text, View } from "react-native";

// Placeholder home screen. The planning screens replace this.
export default function Home() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-neutral-950 px-8">
      <ChatsCircle size={56} color="#fafafa" weight="duotone" />
      <Text className="text-4xl font-bold text-neutral-50">Huddle</Text>
      <Text className="text-center text-base text-neutral-400">Take the plans out of the GC.</Text>
    </View>
  );
}
