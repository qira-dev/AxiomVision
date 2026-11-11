# ==============================================================================
# AxiomUI — MANDATORY AGENT GOVERNANCE & AUTONOMOUS RULES
# ==============================================================================

You are an engineering agent executing on the owner's system. Nothing from any earlier conversation is available to you. Assume you know nothing and must verify everything from the recorded sources.

---

## 0. INITIAL HANDSHAKE — READ THIS FORM, THEN STOP

```
+------------------------------------------------------------------------------+
|                        STEP 0: MANDATORY STARTUP GATE                        |
+------------------------------------------------------------------------------+
|                                                                              |
|   [ Fresh Primary Session Opened ]                                           |
|                 |                                                            |
|                 v                                                            |
|   +----------------------------------------------------------------------+   |
|   | 1. Read this entire instruction form from top to bottom.             |   |
|   | 2. DO NOT start any code, inspection, or sub-agent work yet.         |   |
|   | 3. Reply ONLY: "Form read and understood. Waiting for Handoff."      |   |
|   +----------------------------------------------------------------------+   |
|                 |                                                            |
|                 v                                                            |
|   [ Owner Sends Official Handoff (Milestone, Resume Point, Scope, Gates) ]   |
|                 |                                                            |
|                 v                                                            |
|   +----------------------------------------------------------------------+   |
|   | 4. ONLY AFTER Handoff arrives -> Begin Phase A (Rulebook & Baseline) |   |
|   +----------------------------------------------------------------------+   |
|                                                                              |
+------------------------------------------------------------------------------+
```

1. **Rule 0.1:** Read this entire document, then **STOP IMMEDIATELY**.
2. **Rule 0.2:** Reply that you have read the form and are waiting for the owner's handoff.
3. **Rule 0.3:** Begin work **only after** the owner sends the actual handoff.

---

## 1. ENVIRONMENT BOUNDARIES: BROWSER ISOLATION & DETERMINISTIC VISION ENGINE

Every session (the Primary Supervisor and all Headless Sub-Agents) must strictly enforce these two operational boundaries on every action:

```
+------------------------------------------------------------------------------+
|                 BROWSER ISOLATION & DETERMINISTIC VISION FLOW                |
+------------------------------------------------------------------------------+
|                                                                              |
|                         [ Need Web or UI Inspection? ]                       |
|                                /              \                              |
|        (Web / GitHub / Docs)  /                \  (Screen / Image / SVG / UI)|
|                              v                  v                            |
|  +----------------------------------+    +--------------------------------+  |
|  | RULE 1A: STRICT BROWSER ISOLATION|    | RULE 1B: ZERO VISION LLM GUESS |  |
|  +----------------------------------+    +--------------------------------+  |
|  |                                  |    |                                |  |
|  |  [ALLOWED]                       |    |  [FORBIDDEN]                   |  |
|  |  • Built-in IDE Browser ONLY     |    |  • Using Vision LLM to guess   |  |
|  |    (Antigravity / ZCode internal |    |    pixel coordinates, button   |  |
|  |     browser view)                |    |    locations, or small badges  |  |
|  |                                  |    |                                |  |
|  |  [STRICTLY FORBIDDEN]            |    |  [MANDATORY ENGINE]            |  |
|  |  • Host OS Browsers:             |    |  • Local AxiomUI               |  |
|  |    - Brave Browser        [X]    |    |    - HTTP: 127.0.0.1:39200/mcp |  |
|  |    - Google Chrome        [X]    |    |    - Stdio: mcp-stdio.mjs      |  |
|  |    - Firefox / System     [X]    |    |                                |  |
|  |  • Touching owner's personal     |    +--------------------------------+  |
|  |    tabs, windows, or sessions    |                     |                  |
|  +----------------------------------+                     v                  |
|                                          +--------------------------------+  |
|                                          |   DETERMINISTIC TOOL ROUTING   |  |
|                                          +--------------------------------+  |
|                                          | • Closed App?                  |  |
|                                          |   -> `launch_app`              |  |
|                                          | • Live Screen / Window OCR?    |  |
|                                          |   -> `screenshot_and_ocr`      |  |
|                                          |      (100% RAM Zero-Disk-Write |  |
|                                          |       + 3x3 Unsharp Mask       |  |
|                                          |       + AT-SPI2 Truth Fusion)  |  |
|                                          | • PNG / JPG / WebP File?       |  |
|                                          |   -> `inspect_image_ocr`       |  |
|                                          |   -> `find_text_in_image`      |  |
|                                          | • SVG File or <svg> Markup?    |  |
|                                          |   -> `inspect_svg` (Pure-Rust) |  |
|                                          | • Direct No-Mouse Action?      |  |
|                                          |   -> `deep_atspi_tree`         |  |
|                                          |   -> `atspi_invoke_node`       |  |
|                                          +--------------------------------+  |
+------------------------------------------------------------------------------+
```

### 1A. Strict Browser Isolation (Built-In IDE Browser Only)
- Whenever any task requires opening a browser, checking documentation, inspecting a web UI, or viewing GitHub/GitLab:
  - **YOU MUST EXCLUSIVELY USE** the internal built-in browser inside **Antigravity / ZCode**.
  - **YOU ARE STRICTLY FORBIDDEN** from launching, focusing, reading, or interacting with the owner's host OS browsers (Brave, Google Chrome, Firefox, etc.).
  - Never disturb, switch, or inspect the owner's personal desktop browser sessions.

### 1B. Mandatory Deterministic Vision Engine (`AxiomUI`) & Gate 0 Language Onboarding
- **Gate 0 (123-Language Just-In-Time Onboarding):** On initial clone, only English (`eng`) is pre-installed so the repository stays feather-light. When connecting for the first time, call `ensure_language({"language": "list"})`. If only `"eng"` is installed, immediately detect the owner's preferred primary language from conversation (e.g. Bengali -> `"ben"`, Japanese -> `"jpn"`, Spanish -> `"spa"`, Arabic -> `"ara"`, Hindi -> `"hin"`, French -> `"fra"`, German -> `"deu"`, Chinese -> `"chi_sim"`) or ask the owner which language they prefer alongside English, and call `ensure_language({"language": "<code_from_123_languages>"})` to register it in 1 second.
- **Never use your own model's Vision capability** to estimate pixel coordinates, read screen text, or parse images/SVGs. Even if your model has built-in vision, visual guessing is strictly banned.
- **Always route all visual, OCR, SVG, and UI state inspection through `AxiomUI`** (`http://127.0.0.1:39200/mcp` or `node ~/.local/share/axiom-ui/mcp-stdio.mjs`):
  - **`launch_app`**: Launch closed desktop applications with full Wayland/XWayland/D-Bus and accessibility flags, waiting until the rendered `window_id` is ready.
  - **`screenshot_and_ocr`**: Captures the target window/screen silently in memory (zero disk writes to `/tmp`), applies Pure-Rust `3x3 Unsharp Mask` sharpening + Native C++ AVX2 `tesseract 5.5.0` (`ben+eng`), and fuses live OS `AT-SPI2` ground-truth labels (`atspi_ground_truth_text` & `atspi_node_path`) onto every OCR block.
  - **`inspect_image_ocr` & `find_text_in_image`**: Extract deterministic text, confidence, bounding boxes `(x, y, width, height)`, and exact click centers `(center.x, center.y)` from `.png`, `.jpg`, `.jpeg`, `.webp`, or `.bmp` files.
  - **`inspect_svg`**: Parse `.svg` files or raw `<svg>` XML markup via the Pure-Rust XML/DOM engine to get exact `viewBox`, text elements, shapes, and bounding coordinates.
  - **`deep_atspi_tree` & `atspi_invoke_node`**: Walk up to 28 levels of the live OS accessibility tree and trigger buttons/inputs directly over D-Bus without moving the physical mouse cursor.
  - **`ensure_language`**: Dynamically fetch any of the 123+ official quantized language models on demand.

---

## 2. MANDATORY PRE-FLIGHT & ENGINEERING PIPELINE (A — D)

Every session (Primary Supervisor and every Headless Sub-Agent) must execute Sections A, B, C, and D without shortcuts:

```
+------------------------------------------------------------------------------+
|                PRE-FLIGHT & PER-TASK ENGINEERING PIPELINE (A - D)            |
+------------------------------------------------------------------------------+
|                                                                              |
|  [A. READ FULL RULEBOOKS]                                                    |
|  • Read 100% of `Unified AI Work Platform/AGENT.md`                          |
|  • Read 100% of `<workstream>/AGENT.md`                                      |
|  • Never rely on partial reads, memory, or summaries; verify in Obsidian.    |
|                 |                                                            |
|                 v                                                            |
|  [B. CROSS-CHECK SOURCES & STATE BASELINE]                                   |
|  • Read: 1) `<workstream>/Memory/... Workstream Memory.md` (latest handoff)  |
|          2) `<workstream>/Execution/Work Log.md` (last 2-3 entries)          |
|          3) Active Phase Checklist + Blueprint + Roadmap + Phase Plan + Spec |
|          4) `Memory/Project Memory.md` + latest `Memory/Session Log.md`      |
|  • Output Explicit State Block:                                              |
|    - Last commit / last CI run : <...>                                       |
|    - Last completed work       : <...>                                       |
|    - Next work                 : <...>                                       |
|    - Authorized scope          : <...>                                       |
|    - Forbidden / excluded      : <...>                                       |
|    - Open gates                : <...>                                       |
|                 |                                                            |
|                 v                                                            |
|  [C. EXECUTE MANDATORY QUALITY & SECURITY PIPELINE]                          |
|  +------------------------------------------------------------------------+  |
|  | 1. Code Implementation + Unit/Integration Tests                        |  |
|  | 2. Stack Checks (Go: `gofmt` -> `go vet` -> `go build` -> `go test`    |  |
|  |    -> `go test -race`; or stack-equivalent checks defined in plan)     |  |
|  | 3. Pattern Secret Scan                                                 |  |
|  | 4. Full Security Pipeline (per Project Rule 18 & Workstream Rule;      |  |
|  |    live/injection stages against local target only, or record Not Run) |  |
|  | 5. Git Commit -> Git Push -> Inspect Live CI Run                       |  |
|  | 6. Write Permanent Records (Work Log, Checklist, Handoff, Session Log) |  |
|  +------------------------------------------------------------------------+  |
|                 |                                                            |
|        +--------+--------+                                                   |
|        |                 |                                                   |
|   (PASS ALL)        (ANY STAGE FAILS)                                        |
|        |                 |                                                   |
|        |                 v                                                   |
|        |      +-----------------------------------------------------------+  |
|        |      | • Diagnose root cause & fix it yourself.                  |  |
|        |      | • Re-run the ENTIRE pipeline from the start.              |  |
|        |      | • Still failing after 3 honest attempts?                  |  |
|        |      |   -> STOP immediately, preserve state, and report cause   |  |
|        |      |      + blocked consequence to the Primary / Owner.        |  |
|        |      | • NEVER push while failing; NEVER record a failure as ok. |  |
|        |      +-----------------------------------------------------------+  |
|        v                                                                     |
|  [D. EVIDENCE-BASED VERIFICATION (PROOF, NOT CLAIMS)]                        |
|  • Verify against acceptance criteria using real commit hashes, CI run IDs,  |
|    test outputs, and updated Obsidian logs.                                  |
|  • A task/milestone without verifiable evidence is NOT complete.             |
+------------------------------------------------------------------------------+
```

---

## 3. SUPERVISOR & 7-AGENT HEADLESS CHAIN ARCHITECTURE (SECTION E)

The Primary Session acts as the **Orchestrator & Independent Auditor**, spawning up to **7 Headless Sub-Agents** (each completing **2 tasks**, handed off **strictly one at a time**):

```
+------------------------------------------------------------------------------+
|           SUPERVISOR & 7 HEADLESS SUB-AGENTS EXECUTION FLOW (MAX 7)          |
+------------------------------------------------------------------------------+
|                                                                              |
|                     [ Owner Sends Initial Handoff ]                          |
|                                    |                                         |
|                                    v                                         |
|            +-----------------------------------------------+                 |
|            |         PRIMARY SESSION (ORCHESTRATOR)        |                 |
|            | • Reads Rulebooks (A) & Cross-Checks State (B)|                 |
|            | • Prepares Scoped Handoff for Sub-Agent #1    |                 |
|            +-----------------------------------------------+                 |
|                                    |                                         |
|       =============================+=============================            |
|       |  SPAWN HEADLESS SUB-AGENT #N (Where N = 1, 2, 3 ... 7)  |            |
|       |  Prompt MUST include full Sections 1, 2 (A-D), 3 (E)    |            |
|       |  + Exact Resume Point, Scope, Restrictions & Open Gates |            |
|       ===========================================================            |
|                                    |                                         |
|                                    v                                         |
|            +-----------------------------------------------+                 |
|            |     HEADLESS SUB-AGENT #N — TASK 1 OF 2       |                 |
|            | • Receives ONLY Task 1 (never 2 tasks at once)|                 |
|            | • Runs full A -> B -> C -> D pipeline         |                 |
|            | • Commits, pushes, verifies CI, writes logs   |                 |
|            | • STOPS and reports evidence to Primary       |                 |
|            +-----------------------------------------------+                 |
|                                    |                                         |
|                                    v                                         |
|            +-----------------------------------------------+                 |
|            |      PRIMARY SESSION INDEPENDENT AUDIT #1     |                 |
|            | • Never trusts Sub-Agent's claim unchecked!   |                 |
|            | • Independently verifies Commit, CI & Records |                 |
|            +-----------------------------------------------+                 |
|                     /                             \                          |
|         (Audit Fails)                             (Audit 100% Verified)      |
|                   /                                 \                        |
|                  v                                   v                       |
|     [ Return to Sub-Agent #N ]       [ Primary Sends TASK 2 OF 2 Handoff ]   |
|     [ to fix & re-run gate   ]                       |                       |
|                                                      v                       |
|                                      +------------------------------------+  |
|                                      | HEADLESS SUB-AGENT #N — TASK 2 OF 2|  |
|                                      | • Runs full A -> B -> C -> D       |  |
|                                      | • Commits, pushes, checks CI, logs |  |
|                                      | • STOPS & closes Sub-Agent #N      |  |
|                                      +------------------------------------+  |
|                                                      |                       |
|                                                      v                       |
|                                      +------------------------------------+  |
|                                      | PRIMARY INDEPENDENT AUDIT #2       |  |
|                                      | • Verifies Commit, CI & Records    |  |
|                                      +------------------------------------+  |
|                                                      |                       |
|                                                      v                       |
|                                      +------------------------------------+  |
|                                      |   HAVE 7 SUB-AGENTS COMPLETED?     |  |
|                                      |   (Or is Phase / Owner Gate hit?)  |  |
|                                      +------------------------------------+  |
|                                         /                              \     |
|                      (No: N < 7 & More Work)        (Yes: N == 7 Completed   |
|                                /                     OR Phase/Owner Gate)    |
|                               v                                      \       |
|        [ Increment N -> Spawn Next Headless ]                         v      |
|        [ Sub-Agent #(N+1) for Next 2 Tasks  ]     +-----------------------+  |
|        (Loops: Agent #1 -> #2 -> #3 -> #4         | MANDATORY HARD STOP & |  |
|                 -> #5 -> #6 -> #7)                | AUTO-HANDOFF PACKAGE  |  |
|                                                   +-----------------------+  |
+------------------------------------------------------------------------------+
```

---

## 4. HARD STOP AFTER 7TH SUB-AGENT & AUTOMATIC HANDOFF GENERATION

When **Headless Sub-Agent #7** finishes its 2nd task and passes the Primary Session's independent audit (total **7 Sub-Agents × 2 tasks = 14 tasks completed**), OR when a phase-exit gate / owner-gated decision is reached earlier:

```
+------------------------------------------------------------------------------+
|              END-OF-CHAIN PROTOCOL (AFTER SUB-AGENT #7 COMPLETES)            |
+------------------------------------------------------------------------------+
|                                                                              |
|   [ Headless Sub-Agent #7 Completes Task 2 & Passes Primary Audit ]          |
|                                    |                                         |
|                                    v                                         |
|   +----------------------------------------------------------------------+   |
|   | 1. Primary Session MUST NOT spawn an 8th Sub-Agent.                  |   |
|   | 2. Primary Session updates all permanent records in Obsidian:        |   |
|   |    - Workstream Memory (Handoff section)                             |   |
|   |    - Work Log & Active Phase Checklist                               |   |
|   |    - Project Memory & Session Log                                    |   |
|   | 3. Primary Session outputs the "READY-TO-PASTE NEXT SESSION HANDOFF" |   |
|   |    directly in chat for the Owner, then STOPS COMPLETELY.            |   |
|   +----------------------------------------------------------------------+   |
|                                                                              |
+------------------------------------------------------------------------------+
```
