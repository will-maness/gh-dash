# Bob Mastery Curriculum — Change Log

This file records every change made to the curriculum files after the initial build.
Changes are grouped by session and then by file. For each change, the type is noted:

- **[FIX]** — Incorrect or misleading content corrected against primary source docs
- **[ADD]** — New accurate content not present in original
- **[REMOVE]** — Content removed because it was unsupported, speculative, or wrong
- **[AUDIT]** — No change needed; fact verified as accurate

---

## Session 2 — v2.0 Feature Updates

*Trigger: Live doc crawl found Bob v2.0 / v2.0.1 content missing from lessons.*

### `bob-mastery-lesson-04-configuration.html`

| # | Type | Location | Change |
|---|---|---|---|
| S2-1 | **[ADD]** | L4 Section 3 (MCP) | Added `.callout-blue` noting the new MCP Servers settings panel in Settings → MCP Servers (Bob 2.0). No more manual JSON editing to register a server. |

### `bob-mastery-lesson-05-power-features.html`

| # | Type | Location | Change |
|---|---|---|---|
| S2-2 | **[ADD]** | L5 Section 1 hero chips | Added "Agent steering" chip to meta-chips |
| S2-3 | **[ADD]** | L5 Section 1 feature grid | Added "Agent steering & message queue" feature card explaining: send messages to a running Bob without canceling; queue persists across webview reloads; drag to reorder |
| S2-4 | **[ADD]** | L5 Section 1 feature grid | Added "Preview file edits before accepting" feature card: Settings → Editor → Preview edits; side-by-side diff in-editor distinct from approval prompt |
| S2-5 | **[ADD]** | L5 Section 1, after feature grid | Added `.callout-blue` for task history retention: 14-day default, Settings → Chat → Task retention, stored locally |
| S2-6 | **[FIX]** | L5 PM Insight callout | Updated to cover all four trust features (tips, rollback, agent steering, preview) instead of just two |
| S2-7 | **[FIX]** | L5 Quiz Q5 | Replaced `/review` auto-approval question with agent steering message queue question. Old Q5 content remains in Section 3 feature card. |

### `learn_bob/MEMORY.md`

| # | Type | Change |
|---|---|---|
| S2-8 | **[ADD]** | Added v2.0 content additions table documenting all session 2 changes |

---

## Session 3 — Full Audit

*Trigger: Full audit of all lesson content against live Bob docs at bob.ibm.com/docs/ide. Sources checked: modes, subagents, skills, tools, rollback, bobignore, custom-modes, bobalytics, security guidance, context-mentions, bob-tips, changelog.*

---

### Audit findings by lesson

#### Lesson 01 — How Bob Thinks

| Finding | Status |
|---|---|
| Context window = 270,000 tokens | ✅ **VERIFIED** — confirmed on changelog page |
| Bobcoins normalize billing across models | ✅ **VERIFIED** |
| Bobcoin budget categories (conversation length, file reads) | ✅ **VERIFIED** |
| Enterprise shared Bobcoin pool | ✅ **VERIFIED** |
| Bobalytics privacy (team-level only, no individual data) | ✅ **VERIFIED** |
| Ask mode = no write or execute tools | ✅ **VERIFIED** |

#### Lesson 02 — Modes & Tools

| Finding | Status |
|---|---|
| Mode table column header "Subagents" | ⚠️ **FIXED** — Renamed to "Allowed subagents" to match docs terminology |
| Missing `FindReferencingSymbols` from Read tool list | ⚠️ **FIXED** — Added to tool card tag list |
| Plan mode callout: plan-only subagent note missing | ⚠️ **FIXED** — Expanded callout to note both Plan and Ask restrict to `explore` type; if spawn not permitted, Bob completes work directly |
| Agent/Plan/Ask tool groups | ✅ **VERIFIED** — Docs confirm Agent: Read+Edit+Execute+MCP+Skill+Todo+Subtask+Subagent+Mode; Plan: Read+Edit+MCP+Skill+Subagent+Mode; Ask: Read+MCP+Skill+Subagent+Mode |
| Mode switching policy (explicit request or tool genuinely needed) | ✅ **VERIFIED** |

#### Lesson 03 — Skills & Subagents

| Finding | Status |
|---|---|
| Scenario text: "The 200+ tool calls" | ⚠️ **FIXED** — Changed to "All the tool calls" — specific inflated number not in docs |
| Skill priority: project > global | ✅ **VERIFIED** — Docs state explicitly: "If both locations contain a skill with the same name, the project-level skill takes precedence" |
| Skills load once per conversation | ✅ **VERIFIED** — Confirmed in skills docs |
| Skills can include supporting files beyond SKILL.md | ⚠️ **ADD** — Added note that skills can include supporting files in the skill directory; keep SKILL.md focused, put reference material in supporting files |
| `fork_context: true` behavior | ✅ **VERIFIED** |
| Subagent types: explore (read-only, lighter model) / general (full tools, default model) | ✅ **VERIFIED** |
| Ask mode: explore subagents only | ✅ **VERIFIED** |
| Subagent three conditions | ✅ **VERIFIED** — Docs confirm all three must be true |

#### Lesson 04 — Configuration

| Finding | Status |
|---|---|
| Global custom modes file path: `~/.bob/custom_modes.yaml` | ⚠️ **FIXED** — Docs show it is `~/.bob/settings/custom_modes.yaml`. Added clarifying paragraph with both paths and settings menu access. |
| `slug` character restrictions | ⚠️ **FIXED** — Changed from "lowercase, no spaces" to "letters, numbers, and hyphens only" per docs validation rules |
| `groups` omission behavior | ⚠️ **ADD** — Added "If you omit groups, the mode gets no grouped tools" per docs validation rules |
| `fileRegex` invalid value behavior | ⚠️ **ADD** — Added "Invalid regex prevents the file from loading" per docs validation rules |
| `allowedSubagents` field | ⚠️ **ADD** — Added to custom modes table (was missing entirely) |
| Rules hierarchy (mode-specific > AGENTS.md > workspace > global) | ✅ **VERIFIED** |
| MCP transport types (STDIO vs HTTP/SSE) | ✅ **VERIFIED** |
| `.bobignore` limitations (insert_content / search_and_replace bypass) | ✅ **VERIFIED** — Security docs confirm: `.bobignore` applies only to current workspace, does not create system-level sandbox |

#### Lesson 05 — Power Features

| Finding | Status |
|---|---|
| Rollback uses `simple-git` library | ⚠️ **FIXED** — Removed implementation detail not in public docs. Replaced with doc-accurate description: "shadow Git repository, separate from your main version control system" |
| Rollback snapshot timing: "every time Bob makes changes" | ⚠️ **FIXED** — Docs say: "Snapshots are recorded when tasks begin and before file modifications. They are not automatically created before running commands." Updated to match. |
| Nested Git repos disable rollback | ⚠️ **ADD** — Docs explicitly state this. Added to rollback feature card. |
| Folder mentions: non-recursive, immediate injection | ✅ **VERIFIED** — Docs confirm: "non-recursive, meaning they only include files directly in the specified folder, not in subfolders" |
| `@mention` bypasses `.bobignore` and `.gitignore` | ✅ **VERIFIED** — Docs: "file and folder @mentions bypass .bobignore checks when fetching content for context" |
| Bob tips: cyclomatic complexity + maintainability detection | ✅ **VERIFIED** |
| Bob tips: purple underline + Bob Findings panel | ✅ **VERIFIED** |
| Agent steering (v2.0) content | ✅ Added in Session 2 |
| Preview edits (v2.0) content | ✅ Added in Session 2 |

#### Lesson 06 — Cost, Security & Scale

| Finding | Status |
|---|---|
| Bobcoin plan allocations (40 / 160 / 500) | ⚠️ **FLAGGED** — Pricing page does not expose exact numbers in crawlable HTML. Added "Verify current pricing" amber callout with link to bob.ibm.com/pricing. Numbers retained as they match prior research but are flagged as time-sensitive. |
| Bobalytics: Enterprise-only, team-level aggregates only | ✅ **VERIFIED** — Docs: "Bobalytics is available exclusively for Enterprise plan users" |
| Bobalytics: three KPIs (Adoption Rate, Bob Factor, Bobcoin Spend) | ✅ **VERIFIED** |
| Telemetry off = user disappears from Bobalytics | ✅ **VERIFIED** |
| Context poisoning: new task as only reliable fix | ✅ **VERIFIED** |
| Security threat model (prompt injection, MCP risks, secret exposure) | ✅ **VERIFIED** — Confirmed against security guidelines page |
| Bob Shell API key types (General vs. Inference) | ✅ **VERIFIED** — Confirmed in shell docs |
| IBM does not use prompts for training data claim | ✅ **VERIFIED** — Security docs state this |

---

### Changes applied in Session 3

#### `bob-mastery-lesson-02-modes-and-tools.html`

| # | Type | Change |
|---|---|---|
| A3-1 | **[FIX]** | Mode table column: renamed "Subagents" → "Allowed subagents" |
| A3-2 | **[ADD]** | Read tool list: added `FindReferencingSymbols` tool tag |
| A3-3 | **[FIX]** | Plan mode callout: added note that both Plan and Ask restrict to explore-type only; if spawn not permitted, Bob completes work directly |

#### `bob-mastery-lesson-03-skills-and-subagents.html`

| # | Type | Change |
|---|---|---|
| A3-4 | **[FIX]** | Scenario text: removed "200+" specific count → "All the tool calls" |
| A3-5 | **[ADD]** | Added note about supporting files in skill directories |

#### `bob-mastery-lesson-04-configuration.html`

| # | Type | Change |
|---|---|---|
| A3-6 | **[FIX]** | Added paragraph documenting both custom modes file paths: `.bob/custom_modes.yaml` (project) and `~/.bob/settings/custom_modes.yaml` (global) with settings menu access |
| A3-7 | **[FIX]** | Code block comment updated to show both file paths |
| A3-8 | **[FIX]** | `slug` field: "lowercase, no spaces" → "letters, numbers, and hyphens only" |
| A3-9 | **[ADD]** | `groups` field: added note — if omitted, mode gets no grouped tools |
| A3-10 | **[ADD]** | `fileRegex` field: added note — invalid regex prevents file from loading |
| A3-11 | **[ADD]** | Added `allowedSubagents` row to custom modes fields table |

#### `bob-mastery-lesson-05-power-features.html`

| # | Type | Change |
|---|---|---|
| A3-12 | **[FIX]** | Rollback: removed `simple-git` library reference (not in public docs) |
| A3-13 | **[FIX]** | Rollback: corrected snapshot timing to match docs — "when tasks begin and before file modifications, not before running commands" |
| A3-14 | **[ADD]** | Rollback: added nested Git repos disable rollback note |

#### `bob-mastery-lesson-06-cost-security-scale.html`

| # | Type | Change |
|---|---|---|
| A3-15 | **[ADD]** | Pricing table: added amber callout flagging Bobcoin allocations as time-sensitive with link to bob.ibm.com/pricing |

---

## Verified-clean files (no changes needed)

- `bob-mastery-lesson-01-how-bob-thinks.html` — all facts verified; no corrections needed
- `bob-mastery-project-gh-dash.html` — session structure, constraints, and prompts verified against current Bob capability set; no corrections needed
- `bob-mastery-lesson-plan-overview.html` — navigation links and lesson summaries accurate

---

*Last updated: Session 3 (full audit). Auditor: IBM Bob.*
