import { useEffect, useState } from "react";
import type { ChatMessage } from "@/mocks/types";

const TYPING_MS = 1000;
const GAP_MS = 350;

// MOCK: replays the demo chat as if the messages were arriving live: typing dots from the
// next sender, then their message. `done` flips once the last message has landed.
// `skip` shows the whole chat at once (dev-only, for screenshots and rehearsal).
export function useChatPlayback(messages: ChatMessage[], skip = false, startDelayMs = 700) {
  const [shown, setShown] = useState(skip ? messages.length : 0);
  const [typingFrom, setTypingFrom] = useState<string | null>(null);

  useEffect(() => {
    if (skip) {
      // Params can arrive after the first render on web, so set the end state here too.
      setTypingFrom(null);
      setShown(messages.length);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = startDelayMs;
    messages.forEach((m, i) => {
      timers.push(setTimeout(() => setTypingFrom(m.from), at));
      at += TYPING_MS;
      timers.push(
        setTimeout(() => {
          setTypingFrom(null);
          setShown(i + 1);
        }, at),
      );
      at += GAP_MS;
    });
    return () => timers.forEach(clearTimeout);
  }, [messages, skip, startDelayMs]);

  return { shown, typingFrom, done: messages.length > 0 && shown >= messages.length };
}
