import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { Globe } from "./Globe";
import type { GlobeProps } from "./GlobeScene";

// The demo must never crash on the globe. SafeGlobe renders nothing (and calls onFail) if
// three.js throws, or if GL hasn't drawn a single frame within `timeoutMs`.

type BoundaryProps = { onError: () => void; children: ReactNode };

class GlobeBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Props = GlobeProps & { onFail?: () => void; timeoutMs?: number };

export function SafeGlobe({ onFail, timeoutMs = 4000, onFirstFrame, ...props }: Props) {
  const [failed, setFailed] = useState(false);
  const drew = useRef(false);
  const failedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  // Fires at most once, whichever comes first: a render error or the timeout.
  const fail = useRef(() => {
    if (failedRef.current) return;
    failedRef.current = true;
    if (timer.current) clearTimeout(timer.current);
    setFailed(true);
    onFailRef.current?.();
  }).current;

  useEffect(() => {
    timer.current = setTimeout(() => {
      if (!drew.current) fail();
    }, timeoutMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [timeoutMs, fail]);

  if (failed) return null;
  return (
    <GlobeBoundary onError={fail}>
      <Globe
        {...props}
        onFirstFrame={() => {
          drew.current = true;
          if (timer.current) clearTimeout(timer.current);
          onFirstFrame?.();
        }}
      />
    </GlobeBoundary>
  );
}
