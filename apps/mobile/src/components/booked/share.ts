import { trip } from "@/mocks";

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

// Web: no card capture (see CardShot.tsx). Use the Web Share API when the browser has it,
// otherwise copy the text summary to the clipboard.
export async function sendPlan(
  _capture: () => Promise<string | null>,
  text: string,
): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: `${trip.title} with Huddle`, text });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "cancelled";
      // NotAllowedError etc.: fall back to copying
    }
  }
  return copyPlanText(text);
}

export async function copyPlanText(text: string): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    // Clipboard API blocked (insecure origin, no permission): old-school textarea copy.
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok ? "copied" : "failed";
    } catch {
      return "failed";
    }
  }
}
