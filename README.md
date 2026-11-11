# ⚡ AxiomUI

> **Universal Zero-Hallucination Desktop Automation Engine & MCP Plugin for AI Agents**  
> *Pure-Rust In-Memory Vision • Native C++ AVX2 Multilingual OCR • Sub-pixel Laplacian Sharpening • Live AT-SPI2 Ground-Truth Fusion • Zero-Disk-Write*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Linux GNOME Wayland & X11](https://img.shields.io/badge/Platform-Linux%20GNOME%20Wayland%20%26%20X11-orange.svg)](#)
[![Rust: 100% Pure](https://img.shields.io/badge/Core-Pure%20Rust%20%2B%20AVX2-red.svg)](#)
[![Size: 43 MB](https://img.shields.io/badge/Bundle%20Size-43%20MB-brightgreen.svg)](#)

---

## 🚀 1-Line Zero-Dependency Install

Install and launch AxiomUI on Ubuntu/Debian in 5 seconds with zero external package installations:

```bash
curl -fsSL https://raw.githubusercontent.com/qira-dev/AxiomUI/main/install.sh | bash
```

*No Node.js compilation, no Rust/Cargo installation, no Python PyTorch/EasyOCR 2GB bloat. Batteries included in a 43MB footprint.*

---

## 🧠 Why AxiomUI?

Most desktop AI agents fail because they rely on **Vision LLMs** that estimate button positions from fuzzy images. **AxiomUI** replaces visual hallucination with **Mathematical Determinism**:

```
+---------------------------------------------------------------------------------+
|                                AXIOMUI ARCHITECTURE                             |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  [CLIENT AGENT] (Antigravity / Cursor / Claude Code / Zed / Browser)            |
|        |                                                                        |
|        | JSON-RPC (HTTP: 127.0.0.1:39200/mcp OR Stdio: mcp-stdio.mjs)           |
|        v                                                                        |
|  +---------------------------------------------------------------------------+  |
|  | 1. SINGLETON DAEMON PROXY & SINGLE-FLIGHT QUEUE (`server.mjs`)            |  |
|  |    • Zero duplicate processes                                             |  |
|  |    • SHA-256 in-memory frame cache                                        |  |
|  |    • Screen wake keeping extension active 24/7                            |  |
|  +---------------------------------------------------------------------------+  |
|        |                                                                        |
|        +-----------------------------------+------------------------------------+
|        |                                   |                                    |
|        v                                   v                                    v
|  +-----------------------+   +---------------------------+   +----------------+ |
|  | 2A. PURE-RUST VISION  |   | 2B. NATIVE C++ AVX2 OCR   |   | 2C. AT-SPI2    | |
|  |                       |   |                           |   |     DIRECT     | |
|  | • 100% In-Memory      |   | • 8-bit Quantized fast    |   | • 28-Level     | |
|  |   Zero-Disk Stream    |   |   models (ben+eng default)|   |   D-Bus Walker | |
|  | • 3x3 Laplacian       |   | • 123+ languages on-demand|   | • OS-Level     | |
|  |   Unsharp Mask        |   | • 2-Core wave limit       |   |   Ground-Truth | |
|  | • UI Component Box    |   |   (`nice -n 15` low-pri)  |   |   Strings      | |
|  |   Contour Detector    |   | • Microsecond SIMD pass   |   | • Silent Invoker| |
|  +-----------------------+   +---------------------------+   +----------------+ |
|        \                                   |                                   / |
|         \                                  |                                  /  |
|          v                                 v                                 v   |
|  +---------------------------------------------------------------------------+  |
|  | 3. LIVE GROUND-TRUTH FUSION ENGINE (`fuseAtspiGroundTruth`)               |  |
|  |    • Fuses optical OCR pixel coordinates with 100% exact UTF-8 strings    |  |
|  |      from OS memory (resolves truncated labels, icon text & badges)       |  |
|  +---------------------------------------------------------------------------+  |
|                                            |                                    |
|                                            v                                    |
|  [DETERMINISTIC OUTPUT] -> Clickable coordinates (center.x, center.y) + Exact   |
|                            UTF-8 text badges + AT-SPI node_paths.               |
+---------------------------------------------------------------------------------+
```

---

## 🛠️ CLI Quickstart

```bash
axiomui up         # Start AxiomUI background daemon on port 39200
axiomui status     # Inspect PID, CPU, and RAM usage
axiomui doctor     # Run full Wayland, Portal, and AT-SPI2 diagnostics
axiomui logs       # Tail daemon logs
axiomui stop       # Stop AxiomUI daemon
axiomui restart    # Restart daemon
```

### Multilingual On-Demand (123+ Languages)
```bash
axiomui lang list                  # View currently installed OCR models
axiomui lang add jpn               # Instant download Japanese model (~1.5 MB)
axiomui lang add fra               # Instant download French model (~1.2 MB)
axiomui lang add all               # Download all 123 languages in one go (~75 MB)
```

---

## 🔌 Connecting to Your Agent

### 1. Claude Desktop, Antigravity, Cursor, Zed (Stdio Mode)
Add to your IDE's `mcpServers` configuration:

```json
{
  "mcpServers": {
    "axiom-ui": {
      "command": "node",
      "args": ["~/.local/share/axiom-ui/mcp-stdio.mjs"]
    }
  }
}
```

### 2. Streamable HTTP / SSE Mode (Port 39200)
* **Streamable HTTP:** `http://127.0.0.1:39200/mcp`
* **SSE Endpoint:** `http://127.0.0.1:39200/sse`
* **Health Check:** `http://127.0.0.1:39200/health`

---

## 📦 Tool Inventory (27 Tools)

| Tool Category | Tools | Description |
| :--- | :--- | :--- |
| **App Launching** | `launch_app` | Launches closed apps (`antigravity`, `zcode`, `obsidian`, `brave`, `chrome`, `dolphin`, `vlc`) with Wayland/D-Bus flags and waits for rendered window. |
| **Deterministic Vision** | `screenshot_and_ocr` | 100% in-memory screenshot + 3x3 unsharp mask OCR + live AT-SPI2 ground-truth fusion. |
| | `inspect_image_ocr` | Deterministic Bengali, English, and Code OCR + UI bounding boxes. |
| | `find_text_in_image` | Locates exact `center.x, center.y` pixel coordinates for target strings. |
| | `inspect_svg` | Pure-Rust XML/DOM parser for SVGs (viewBox, shapes, coordinates, text). |
| | `ensure_language` | On-demand instant downloader for any of 123+ quantized language models. |
| **Window Discovery** | `list_windows`, `focused_window`, `list_apps`, `get_app_state`, `get_tree_page` | Discovers open windows, PID, window_id, bounds, and accessibility states. |
| **OS Control & Input** | `click`, `perform_action`, `set_value`, `type_text`, `press_key`, `scroll`, `drag`, `activate_window`, `move_window`, `resize_window`, `screenshot` | Silent, bounded input automation. |
| **Direct D-Bus Actions** | `deep_atspi_tree`, `atspi_invoke_node` | Reads 28-level accessibility tree and invokes button actions without moving mouse. |

---

## 📜 Governance & Rulebook
See [`RULE.md`](RULE.md) for the mandatory autonomous agent governance rules:
- **Rule 1A:** Strict Browser Isolation (Built-in IDE Browser view only).
- **Rule 1B:** Zero Vision LLM Hallucination (Mandatory AxiomUI engine usage).
- **Rule 2:** Quality & Security Pipeline (`gofmt/vet` -> `build` -> `test` -> `secret scan` -> `CI verification`).
- **Rule 3:** Supervisor & 7-Agent Headless Chain architecture with automatic handoff.

---

## 📄 License
MIT License. Crafted with precision by km-abdullah.
