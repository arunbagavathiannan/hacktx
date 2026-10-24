export { colors } from "./colors";

import { colors } from "./colors";

// Phosphor icon defaults: regular weight everywhere, fill for active/selected states.
export const icon = {
  size: 22,
  color: colors.ink,
  weight: "regular" as const,
  activeWeight: "fill" as const,
};
