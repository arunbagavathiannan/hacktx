# apps/mobile

Huddle's Android app (Expo, Expo Router, NativeWind).

```bash
pnpm --filter mobile start       # dev server (Expo Go works until native modules are added)
pnpm --filter mobile android     # dev build on a connected Android phone
pnpm --filter mobile export:web  # static web build (used for PR screenshots)
```

## Gotchas

- **NativeWind `className` is ignored on Reanimated components on web** (`Animated.View` etc.).
  Put layout and color classes on an inner `View` and only pass the animated `style` to the
  `Animated.View` (see `src/components/ui/Skeleton.tsx`).
- Use `cn()` from `@/lib/cn` when a component accepts `className`, so overrides win.
