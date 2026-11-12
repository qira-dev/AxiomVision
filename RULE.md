# AxiomVision — Mandatory Agent Operational Rulebook

This document defines the mandatory operational rules for any AI agent connected to **AxiomVision** (`http://127.0.0.1:39200/mcp` or `mcp-stdio.mjs`). Every rule in this specification is binding across all desktop inspection, OCR, SVG parsing, and UI automation tasks.

---

## RULE 1: ZERO VISION LLM HALLUCINATION (MANDATORY DETERMINISTIC ENGINE)

1. **No Visual Guessing:** Even if your foundation model includes built-in multimodal Vision capabilities, you are **strictly forbidden** from using Vision LLM estimation to guess pixel coordinates, estimate button positions, or transcribe dense terminal/UI text or SVG files.
2. **Deterministic Grounding Only:** Every coordinate you click (`center.x, center.y`), every UI element you invoke (`node_path` / `element_index`), and every screen string you read must come directly from `AxiomVision` tool outputs.

```
+------------------------------------------------------------------------------+
|                   AXIOMVISION DETERMINISTIC ROUTING HIERARCHY                |
+------------------------------------------------------------------------------+
|                                                                              |
|                        [ Incoming Visual or UI Task ]                        |
|                                      |                                       |
|        +-----------------------------+-----------------------------+         |
|        |                             |                             |         |
|        v                             v                             v         |
|  [A. LIVE DESKTOP/WINDOW]     [B. STATIC FILES ON DISK]     [C. UI ACTIONS]  |
|  +----------------------+     +-----------------------+     +-------------+  |
|  | • App not open?      |     | • .svg or <svg> XML?  |     | • No-mouse  |  |
|  |   -> `launch_app`    |     |   -> `inspect_svg`    |     |   D-Bus act |  |
|  | • Read window text,  |     | • .png/.jpg/.webp?    |     |   -> `deep_ |  |
|  |   coords & OS truth? |     |   -> `inspect_image_  |     |      atspi_ |  |
|  |   -> `screenshot_    |     |      ocr` (single or  |     |      tree` +|  |
|  |      and_ocr`        |     |      batch `file_     |     |   `atspi_   |  |
|  |   (100% RAM pipe +   |     |      paths` array)    |     |   invoke_   |  |
|  |    3x3 Unsharp Mask  |     | • Locate specific     |     |   node`     |  |
|  |    + AT-SPI2 Fusion) |     |   target string?      |     | • Pointer / |  |
|  |                      |     |   -> `find_text_in_   |     |   Keyboard  |  |
|  |                      |     |      image`           |     |   -> `click`|  |
|  +----------------------+     +-----------------------+     +-------------+  |
|                                                                              |
+------------------------------------------------------------------------------+
```

---

## RULE 2: GATE 0 — JUST-IN-TIME LANGUAGE ONBOARDING (123+ LANGUAGES)

To keep the repository feather-light (~40 MB), only English (`eng`) is pre-installed on a fresh clone. `AxiomVision` supports **123+ quantized fast OCR language models** on demand with zero daemon restarts:

```
+------------------------------------------------------------------------------+
|                  GATE 0: ON-DEMAND LANGUAGE PROVISIONING FLOW                |
+------------------------------------------------------------------------------+
|                                                                              |
|   [ Agent Connects to AxiomVision ]                                          |
|                 |                                                            |
|                 v                                                            |
|   +----------------------------------------------------------------------+   |
|   | 1. Call `ensure_language({"language": "list"})`                      |   |
|   +----------------------------------------------------------------------+   |
|                 |                                                            |
|                 v                                                            |
|   [ Is the user's primary / screen language already installed? ]             |
|          /                                              \                    |
|       (Yes)                                             (No)                 |
|        /                                                  \                  |
|       v                                                    v                 |
|   [ Proceed directly ]            +--------------------------------------+   |
|                                   | 2. Detect user's language from chat  |   |
|                                   |    (or ask once) and call:           |   |
|                                   |    `ensure_language({"language": X})`|   |
|                                   |    (e.g. "ben", "jpn", "spa", "ara", |   |
|                                   |     "hin", "fra", "deu", "chi_sim")  |   |
|                                   | 3. Model downloads in <1s and        |   |
|                                   |    activates immediately (no restart)|   |
|                                   +--------------------------------------+   |
|                                                                              |
+------------------------------------------------------------------------------+
```

---

## RULE 3: TOOL SELECTION & PARAMETER DISCIPLINE

1. **Launching Closed Applications (`launch_app`):**
   - Never assume an application is open. Call `list_windows` first or call `launch_app({"app": "<name>"})` (e.g., `"antigravity"`, `"zcode"`, `"obsidian"`, `"dolphin"`, `"vlc"`).
   - If the app is already running, `launch_app` reuses and focuses the existing window without spawning duplicates.
2. **Live Window & Screen Inspection (`screenshot_and_ocr`):**
   - Pass `{"window_id": <id>}` to inspect a specific window, or `{}` for the full screen.
   - `screenshot_and_ocr` runs 100% in RAM (zero files written to `/tmp`), applies a Pure-Rust `3x3 Laplacian Unsharp Mask` to sharpen tiny 9–10px fonts, and fuses live 28-level `AT-SPI2` OS accessibility labels (`atspi_ground_truth_text` and `atspi_node_path`) onto overlapping OCR blocks.
   - Always check both `text` (optical OCR) and `atspi_ground_truth_text` (exact OS memory string, which resolves visual `...` truncation and icon labels).
3. **Static Image & Batch Inspection (`inspect_image_ocr` & `find_text_in_image`):**
   - For a single image file on disk, pass `{"file_path": "/abs/path/to/image.png"}`.
   - For multiple images, pass `{"file_paths": ["/path/1.png", "/path/2.png", ...]}` to process the batch sequentially without parallel CPU contention or timeouts.
   - If UI contour boxes are not needed for a text-only transcription task, pass `"detect_ui_boxes": false` to keep the response payload minimal.
4. **Deterministic SVG Inspection (`inspect_svg`):**
   - For `.svg` files or raw `<svg>...</svg>` strings, always call `inspect_svg({"file_path_or_xml": "..."})`. Never rasterize an SVG just to guess its text when `inspect_svg` extracts 100% exact XML coordinates and `<text>` nodes in ~10ms.
5. **Silent Background D-Bus Actions (`deep_atspi_tree` & `atspi_invoke_node`):**
   - Whenever an element exposes an `atspi_node_path` (from `screenshot_and_ocr` or `deep_atspi_tree`), prefer calling `atspi_invoke_node({"node_path": "..."})` to trigger buttons or set input text directly over D-Bus without moving or hijacking the user's physical mouse cursor.

---

## RULE 4: STRICT BROWSER ISOLATION, PRIVACY & SYSTEM SAFETY

1. **Browser Isolation:**
   - When operating inside an IDE with a built-in browser view (such as Antigravity or ZCode), **exclusively use the IDE's internal built-in browser** for web previews, documentation lookups, or GitHub/GitLab checks.
   - **Never** launch, focus, or hijack the user's personal host OS browsers (Brave, Google Chrome, Firefox) or disturb their personal tabs/sessions unless the user explicitly commands you to inspect a specific host browser window.
2. **Zero-Disk-Write & Localhost Privacy:**
   - Do not write temporary screenshot `.png` files to `/tmp` or the project directory during live screen inspection; rely on `screenshot_and_ocr`'s in-memory pipe.
   - `AxiomVision` binds strictly to `127.0.0.1:39200`. Never expose the MCP port to external network interfaces.
3. **No Root / System Modification:**
   - Never run `sudo` or modify system files outside the user's authorized workspace.

---

## RULE 5: ANTI-SILENT-FAIL & POST-ACTION VERIFICATION

1. **Mandatory Error Check:**
   - Before trusting any OCR or UI output, verify that `isError` is `false` and `ok` is `true` (and for images, `dimensions.width > 0`). Never treat a failed or timed-out response (`error_code: "VISION_ENGINE_FAILED"`) as an empty screen.
2. **Post-Action State Verification:**
   - After performing any mutating UI action (`click`, `atspi_invoke_node`, `set_value`, `type_text`, `press_key`, `launch_app`), verify that the expected UI state change actually occurred by calling `screenshot_and_ocr` or `deep_atspi_tree`.
