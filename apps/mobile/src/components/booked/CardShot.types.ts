export type CardShotHandle = {
  // Local file URI of the captured card, or null where capture isn't available (web).
  capture: () => Promise<string | null>;
};
