---
name: axiom-ui
description: Mandatory skill for controlling or inspecting the desktop UI, launching applications, onboarding the owner's primary OCR language from 123 languages, capturing silent background screenshots, or analyzing PNG/JPG/WebP images and SVG files with zero vision hallucination via AxiomVision on http://127.0.0.1:39200/mcp.
---
# AxiomVision Skill

Use the local `AxiomVision` engine (running on `http://127.0.0.1:39200/mcp` or `node ~/.local/share/axiom-ui/mcp-stdio.mjs`) to deterministically launch, inspect, and control desktop applications, windows, screenshots, and SVG files without relying on Vision LLM guessing.

## Gate 0: Just-In-Time Primary Language Onboarding (123 Languages)

When you connect to `AxiomVision` for the first time on a user's machine:
1. English (`eng`) is pre-installed by default so the repository stays ultra-lightweight (~37 MB).
2. Call `ensure_language` with `{"language": "list"}` to inspect currently installed languages.
3. If only `"eng"` is installed:
   - If the owner is already speaking to you in a non-English language (e.g., Bengali -> `"ben"`, Japanese -> `"jpn"`, Spanish -> `"spa"`, Arabic -> `"ara"`, Hindi -> `"hin"`, French -> `"fra"`, German -> `"deu"`, Chinese -> `"chi_sim"`, Korean -> `"kor"`, Russian -> `"rus"`, Portuguese -> `"por"`), immediately call `ensure_language` with their 3-letter code to download and register their primary language in 1 second!
   - Otherwise, ask the owner once: *"Alongside English, which primary language would you like me to enable for screen and image OCR?"* and call `ensure_language` with that language code.

## When to Use

- Launching closed desktop applications (`antigravity`, `zcode`, `obsidian`, `brave`, `chrome`, `dolphin`, `vlc`) via `launch_app`.
- Reading exact text, pixel bounding boxes `(x, y, width, height)`, click centers `(center.x, center.y)`, UI control boxes, and AT-SPI2 ground-truth labels (`atspi_ground_truth_text`).
- Capturing silent, zero-flash, zero-disk-write in-memory window/desktop screenshots (`screenshot_and_ocr`).
- Parsing `.svg` files or raw `<svg>` markup via Pure-Rust XML/DOM engine (`inspect_svg`).
- Registering on-demand languages from the 123+ fast quantized models (`ensure_language`).

## Steps

1. Verify `AxiomVision` is running on port `39200`:
   ```bash
   axiomui status || axiomui up
   ```

2. Select the appropriate tool from the 27 available tools:
   - **On-Demand Language (Gate 0)**: `ensure_language` with `{"language": "list"}` or `{"language": "<3-letter-code>"}`.
   - **Launch App**: `launch_app` with `{"app": "zcode"}` or `{"app": "antigravity"}`.
   - **Live OCR + Ground-Truth**: `screenshot_and_ocr` with `{"window_id": <id>}` or `{}`.
   - **Deterministic SVG**: `inspect_svg` with `{"file_path_or_xml": "<path_or_xml>"}`.
   - **Image File OCR**: `inspect_image_ocr` or `find_text_in_image`.
   - **No-Mouse Actions**: `deep_atspi_tree` and `atspi_invoke_node`.
