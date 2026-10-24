// Detector: one cheap Muse Spark call per batch of new chat messages.
// Returns { isPlan, confidence, summary }. No tools. See "Agent design" in CLAUDE.md.

Deno.serve(() => Response.json({ error: "detect is not implemented yet" }, { status: 501 }));
