// Planner agent: Muse Spark tool-calling loop (max 10 tool calls per run).
// Tools live in ../_shared/tools/. Each tool call is written to the agent_steps table.
// See "Agent design" in CLAUDE.md.

Deno.serve(() => Response.json({ error: "agent is not implemented yet" }, { status: 501 }));
