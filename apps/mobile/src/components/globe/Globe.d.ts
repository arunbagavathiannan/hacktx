// Metro picks Globe.web.tsx or Globe.native.tsx at bundle time; this tells TypeScript
// what `import { Globe } from "./Globe"` looks like on either platform.
import type { JSX } from "react";
import type { GlobeProps } from "./GlobeScene";

export declare function Globe(props: GlobeProps): JSX.Element;
