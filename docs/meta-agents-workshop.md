# Meta "AI agents" workshop: takeaways (HackTX '26)

Our summary of the Meta workshop on how their engineers work with AI agents. We use it both
for how we build Huddle and for how Huddle's own agent works. (No slides or verbatim transcript
here; the presenters asked us not to photograph the talk.)

## What an agent is

1. **A goal**: e.g. "make this test pass".
2. **A loop**: gather context → plan → act → check the result → repeat until done.
3. **Tools**: terminal commands, file access, a browser, APIs. The model is the same one
   behind chatbots; the difference is that it can act and check its own work.

## Four levels

| Level | What it is | Human's role |
|---|---|---|
| 1. Chatbot | Answers questions | You make the change |
| 2. Capable colleague | Makes the change, runs tests, opens a PR | You review the PR |
| 3. Team of agents | Specialists: a searcher that traces code paths, a builder, reviewers from different angles | You set goals and review |
| 4. Autonomous | Finds work on its own, learns from each loop, runs overnight | Hype outruns reality; trust is the open problem |

## How Meta engineers ship with agents

1. **Goals and guardrails**: what to do, and what not to touch.
2. **Builder agent runs the loop** and opens a PR with the change, a summary, and a
   **test plan with real output** (not "I ran the tests").
3. **Reviewer agents go first**: lint/syntax, then higher-level checks such as a mismatch
   between the summary and the actual code, or a test plan that misses an edge case (e.g. n = 0).
4. **A human does the final review** and merges. Risky changes never ship on their own.

## Anatomy of an agent

- **Hands**: MCP tools (an open standard, "USB-C for agents"). Building your own MCP server
  is doable in a weekend.
- **Playbooks**: skills, i.e. plain-text "if you see X, do Y" from senior engineers.
- **Notebook**: memory the agent writes as it learns.
- **Teammates**: other specialized agents.
- Agents prefer the **terminal**: text in, text out.

## Lessons they learned the hard way

1. **Context is everything.** More context means fewer loops.
2. **Small steps.** Break big tasks into small loops (an orchestrator helps).
3. **Verify with evidence.** Show the test output. Agents have been seen deleting tests
   and calling it done.
4. **Human judgment is scarce,** so use agents to do the first passes before a human looks.

## How we apply it

- **Building Huddle:** orchestrated tracks follow "builder → reviewer agents → human merge".
  See "How we build with agents" in CLAUDE.md.
- **Huddle's own agent:** goal (plan this trip) + loop + tools, with a verification step before
  showing results (prices match sources, dates match the chat, deals checked). This also
  answers the mentor's trust question.
- Meta offered **Muse API credits** at the workshop. Ask a Meta mentor for them.
