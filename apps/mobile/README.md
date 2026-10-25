# apps/mobile

Huddle's Android app (Expo, Expo Router, NativeWind).

```bash
pnpm --filter mobile start       # dev server (Expo Go works until native modules are added)
pnpm --filter mobile android     # dev build on a connected Android phone
pnpm --filter mobile export:web  # static web build (used for PR screenshots)
```

## Open it on your phone with Expo Go

1. Install **Expo Go** from the Play Store (it must support the app's Expo SDK, currently 58).
2. From the repo root, run one of:
   ```bash
   pnpm go          # phone and laptop on the same Wi-Fi
   pnpm go:tunnel   # different networks, or Wi-Fi that blocks devices (hackathon/campus Wi-Fi)
   ```
   The first `go:tunnel` asks to install `@expo/ngrok` globally; say yes.
3. Scan the QR code in the terminal with Expo Go (Android) or the Camera app (iOS).

`pnpm go` sticks to Expo Go even if `expo-dev-client` is added later. Expo Go can't load our
own native code, so once `modules/notification-listener` exists the listener won't run there
(guard it the same way as web); the planning screens still work. The real demo uses the dev
build (`pnpm android`).

## Gotchas

- **NativeWind `className` is ignored on Reanimated components on web** (`Animated.View` etc.).
  Put layout and color classes on an inner `View` and only pass the animated `style` to the
  `Animated.View` (see `src/components/ui/Skeleton.tsx`).
- Use `cn()` from `@/lib/cn` when a component accepts `className`, so overrides win.
