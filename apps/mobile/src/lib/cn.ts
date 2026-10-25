// Merge Tailwind classes so a caller's className overrides a component's defaults
// (e.g. <Heading className="text-base"> really ends up text-base, not the default size).
// One implementation, in components/ui/cn.ts, which also knows the type-role sizes.
export { cn } from "@/components/ui/cn";
