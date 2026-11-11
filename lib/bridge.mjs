import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = process.env.AXIOM_VISION_ROOT || path.resolve(__dirname, '..');
export const BIN_DIR = path.join(ROOT_DIR, 'bin');
export const CUL_BIN = path.join(BIN_DIR, 'computer-use-linux');
export const VISION_RS_BIN = path.join(BIN_DIR, 'desktop-vision-rs');
export const SYS_PYTHON_BIN = '/usr/bin/python3';
export const ATSPI_SCRIPT = path.join(ROOT_DIR, 'lib', 'atspi_helper.py');
export const TMP_DIR = path.join(ROOT_DIR, 'data', 'tmp');

fs.mkdirSync(TMP_DIR, { recursive: true });

export function resolveDesktopEnv() {
  const uid = process.getuid ? process.getuid() : 1000;
  const runtimeDir = process.env.XDG_RUNTIME_DIR || `/run/user/${uid}`;
  const env = { ...process.env };

  env.XDG_RUNTIME_DIR = runtimeDir;
  if (!env.DBUS_SESSION_BUS_ADDRESS && fs.existsSync(`${runtimeDir}/bus`)) {
    env.DBUS_SESSION_BUS_ADDRESS = `unix:path=${runtimeDir}/bus`;
  }
  if (!env.WAYLAND_DISPLAY && fs.existsSync(`${runtimeDir}/wayland-0`)) {
    env.WAYLAND_DISPLAY = 'wayland-0';
  }
  if (!env.DISPLAY) {
    env.DISPLAY = ':0';
  }
  if (!env.XDG_SESSION_TYPE) {
    env.XDG_SESSION_TYPE = 'wayland';
  }
  if (!env.XDG_CURRENT_DESKTOP) {
    env.XDG_CURRENT_DESKTOP = 'ubuntu:GNOME';
  }
  env.COMPUTER_USE_LINUX_INDICATOR = '0';
  env.ACCESSIBILITY_ENABLED = '1';
  env.GNOME_ACCESSIBILITY = '1';
  env.GTK_MODULES = 'gail:atk-bridge';
  env.QT_ACCESSIBILITY = '1';
  env.QT_LINUX_ACCESSIBILITY_ALWAYS_ON = '1';
  if (!env.XAUTHORITY) {
    try {
      const files = fs.readdirSync(runtimeDir);
      const xauth = files.find((f) => f.startsWith('.mutter-Xwaylandauth.'));
      if (xauth) {
        env.XAUTHORITY = path.join(runtimeDir, xauth);
      }
    } catch {}
  }
  env.AXIOM_VISION_ROOT = ROOT_DIR;
  env.PATH = `${ROOT_DIR}/runtime/node/bin:${BIN_DIR}:${os.homedir()}/.local/bin:/usr/local/bin:/usr/bin:/bin:${env.PATH || ''}`;
  return env;
}

const KNOWN_APP_MAP = {
  antigravity: {
    bin: '/opt/Antigravity-x64/antigravity',
    args: ['--force-renderer-accessibility'],
    match: 'antigravity',
  },
  zcode: {
    bin: path.join(os.homedir(), 'Applications', 'ZCode.AppImage'),
    args: ['--force-renderer-accessibility'],
    match: 'zcode',
  },
  zed: {
    bin: path.join(os.homedir(), 'Applications', 'ZCode.AppImage'),
    args: ['--force-renderer-accessibility'],
    match: 'zcode',
  },
  obsidian: {
    bin: path.join(os.homedir(), 'Applications', 'Obsidian.AppImage'),
    args: ['--force-renderer-accessibility'],
    match: 'obsidian',
  },
  brave: {
    bin: '/opt/brave.com/brave/brave',
    args: ['--force-renderer-accessibility'],
    match: 'brave',
  },
  'brave-browser': {
    bin: '/opt/brave.com/brave/brave',
    args: ['--force-renderer-accessibility'],
    match: 'brave',
  },
  chrome: {
    bin: '/usr/bin/google-chrome',
    args: ['--force-renderer-accessibility'],
    match: 'chrome',
  },
  'google-chrome': {
    bin: '/usr/bin/google-chrome',
    args: ['--force-renderer-accessibility'],
    match: 'chrome',
  },
  dolphin: {
    bin: '/usr/bin/dolphin',
    args: [],
    match: 'dolphin',
  },
  nautilus: {
    bin: '/usr/bin/nautilus',
    args: [],
    match: 'nautilus',
  },
  files: {
    bin: '/usr/bin/nautilus',
    args: [],
    match: 'nautilus',
  },
  vlc: {
    bin: '/usr/bin/vlc',
    args: [],
    match: 'vlc',
  },
};

function findDesktopEntryCommand(appQuery) {
  const q = String(appQuery || '').trim().toLowerCase().replace(/\.desktop$/i, '');
  if (!q) return null;

  if (KNOWN_APP_MAP[q] && fs.existsSync(KNOWN_APP_MAP[q].bin)) {
    return KNOWN_APP_MAP[q];
  }

  // Check ~/Applications/*.AppImage
  try {
    const appDir = path.join(os.homedir(), 'Applications');
    if (fs.existsSync(appDir)) {
      for (const entry of fs.readdirSync(appDir)) {
        if (entry.toLowerCase().includes(q) && entry.endsWith('.AppImage')) {
          return {
            bin: path.join(appDir, entry),
            args: ['--force-renderer-accessibility'],
            match: q,
          };
        }
      }
    }
  } catch {}

  // Scan .desktop files
  const desktopDirs = [
    path.join(os.homedir(), '.local/share/applications'),
    '/usr/share/applications',
  ];
  for (const dir of desktopDirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.desktop')) continue;
        const fullPath = path.join(dir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const nameMatch = content.match(/^Name=(.+)$/m);
        const wmMatch = content.match(/^StartupWMClass=(.+)$/m);
        const execMatch = content.match(/^Exec=(.+)$/m);
        if (!execMatch) continue;

        const fileBase = file.replace(/\.desktop$/i, '').toLowerCase();
        const nameVal = (nameMatch ? nameMatch[1].trim() : '').toLowerCase();
        const wmVal = (wmMatch ? wmMatch[1].trim() : '').toLowerCase();

        if (
          fileBase === q ||
          nameVal === q ||
          wmVal === q ||
          fileBase.includes(q) ||
          nameVal.includes(q)
        ) {
          let rawExec = execMatch[1]
            .trim()
            .replace(/%[fFuUdDnNickvm]/g, '')
            .trim();
          const parts = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < rawExec.length; i++) {
            const ch = rawExec[i];
            if (ch === '"') {
              inQuotes = !inQuotes;
            } else if (ch === ' ' && !inQuotes) {
              if (current) {
                parts.push(current);
                current = '';
              }
            } else {
              current += ch;
            }
          }
          if (current) parts.push(current);
          if (parts.length > 0) {
            return {
              bin: parts[0],
              args: parts.slice(1),
              match: wmVal || nameVal || q,
            };
          }
        }
      }
    } catch {}
  }

  return {
    bin: String(appQuery).trim(),
    args: [],
    match: q,
  };
}

export const EXTRA_TOOLS = [
  {
    name: 'ensure_language',
    description:
      'Download and register any of the 123+ official Tesseract quantized OCR language models on demand into local engine (e.g. "jpn", "spa", "fra", "hin", "ara", "deu", "chi_sim", "kor", "rus", "por", "ita", "all"). Instant download (~1-2MB) with zero restarts required.',
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          description: '3-letter language code (e.g. "jpn", "spa", "fra", "hin", "ara", "rus", "deu", "chi_sim", "kor") or "all".',
        },
      },
      required: ['language'],
    },
  },
  {
    name: 'launch_app',
    description:
      'Launch any desktop GUI application (e.g. "antigravity", "zcode", "obsidian", "brave", "chrome", "dolphin", "vlc") directly via MCP with full Wayland/XWayland/D-Bus desktop environment variables and wait until its rendered window appears in the compositor.',
    inputSchema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description: 'Application name, alias, .desktop name, or executable path (e.g. "antigravity", "zcode", "obsidian", "brave").',
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional command-line arguments to pass to the application.',
        },
        wait_for_window: {
          type: 'boolean',
          description: 'Wait until the application window is registered and rendered in the compositor (default: true).',
        },
        wait_timeout_ms: {
          type: 'integer',
          description: 'Maximum milliseconds to wait for window registration (default: 10000).',
        },
        focus_if_running: {
          type: 'boolean',
          description: 'If the app is already open, reuse and focus its existing window instead of spawning a duplicate instance (default: true).',
        },
      },
      required: ['app'],
    },
  },
  {
    name: 'inspect_svg',
    description:
      '100% deterministic Pure-Rust XML/DOM structural parser for SVG files or raw <svg> markup (No Vision LLM needed). Returns viewBox, dimensions, all <text>/<tspan> elements with exact coordinates, and all shapes/buttons/paths with bounding boxes and center coordinates.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path_or_xml: {
          type: 'string',
          description: 'Absolute/relative path to an .svg file OR raw <svg>...</svg> XML string.',
        },
        include_paths: {
          type: 'boolean',
          description: 'Include unnamed <path> elements with computed bounding boxes (default: true).',
        },
        max_elements: {
          type: 'integer',
          description: 'Maximum number of shape elements to return (default: 500).',
        },
      },
      required: ['file_path_or_xml'],
    },
  },
  {
    name: 'inspect_image_ocr',
    description:
      '100% deterministic Pure-Rust + Native C++ AVX2 Multilingual OCR (Bengali + English + Code) + UI contour box + Dynamic Screen Semantics engine for PNG, JPG, JPEG, WebP, BMP, and SVG files. Returns image dimensions, every text string with confidence, exact pixel bounding box (x, y, width, height), click center (x, y), UI boxes, and dynamic screen semantics.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the image file (.png, .jpg, .jpeg, .webp, .bmp, .svg).',
        },
        run_ocr: {
          type: 'boolean',
          description: 'Run deterministic Bengali + English + Code OCR text extraction (default: true).',
        },
        detect_ui_boxes: {
          type: 'boolean',
          description: 'Run Pure-Rust UI component/button contour box detection (default: true).',
        },
        query_text: {
          type: 'string',
          description: 'Optional text filter to highlight matching OCR blocks.',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'find_text_in_image',
    description:
      'Deterministically locate a specific Bengali, English, or Code text string inside a PNG/JPG screenshot or image using the Pure-Rust + Native C++ AVX2 OCR engine and return exact pixel coordinates (center.x, center.y) and bounding boxes.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the image or screenshot file.',
        },
        query_text: {
          type: 'string',
          description: 'Substring to search for (case-insensitive).',
        },
      },
      required: ['file_path', 'query_text'],
    },
  },
  {
    name: 'screenshot_and_ocr',
    description:
      '100% In-Memory (Zero-Disk-Write) live desktop/window screenshot + Pure-Rust 3x3 Unsharp Mask OCR + UI contour detection + live AT-SPI2 accessibility ground-truth text fusion. Returns all visible screen text, exact clickable pixel coordinates (center.x, center.y), UI boxes, semantics, and OS-level AT-SPI2 ground-truth labels.',
    inputSchema: {
      type: 'object',
      properties: {
        window_id: {
          type: 'integer',
          description: 'Optional target window_id from list_windows.',
        },
        app_id: {
          type: 'string',
          description: 'Optional target application ID or name.',
        },
        title: {
          type: 'string',
          description: 'Optional window title substring.',
        },
        query_text: {
          type: 'string',
          description: 'Optional text to search for on the captured screen.',
        },
        detect_ui_boxes: {
          type: 'boolean',
          description: 'Also detect rectangular UI boxes (default: true).',
        },
      },
    },
  },
  {
    name: 'deep_atspi_tree',
    description:
      'Direct GObject AT-SPI2 deep accessibility tree walker across one or all running desktop applications (Brave, Chrome, Antigravity, Obsidian, VLC, GNOME Shell, etc.). Returns structured nodes with node_path, role, name, text, actions, states, and screen bounds.',
    inputSchema: {
      type: 'object',
      properties: {
        app_query: {
          type: 'string',
          description: 'Application name or window title substring (e.g. "Brave", "antigravity", "obsidian"). Empty string walks all apps.',
        },
        max_depth: {
          type: 'integer',
          description: 'Maximum traversal depth (default: 8).',
        },
        max_nodes: {
          type: 'integer',
          description: 'Maximum nodes to return (default: 400).',
        },
        interactive_only: {
          type: 'boolean',
          description: 'Return only interactive/labeled UI elements (default: true).',
        },
      },
    },
  },
  {
    name: 'atspi_invoke_node',
    description:
      'Directly invoke an AT-SPI2 element action (e.g. click/press/activate) or set editable text via D-Bus using its node_path from deep_atspi_tree, without moving the physical mouse cursor.',
    inputSchema: {
      type: 'object',
      properties: {
        node_path: {
          type: 'string',
          description: 'Slash-separated node path returned by deep_atspi_tree (e.g. "15/0/2/1").',
        },
        action_index: {
          type: 'integer',
          description: 'Index of the AT-SPI action to invoke (default: 0).',
        },
        set_text: {
          type: 'string',
          description: 'Optional text to write into an EditableText element.',
        },
        grab_focus: {
          type: 'boolean',
          description: 'Grab component focus before invoking action (default: true).',
        },
      },
      required: ['node_path'],
    },
  },
];

const ocrCache = new Map();
const inMemoryFrameCache = new Map();
let ocrQueueChain = Promise.resolve();

function withOcrLock(fn) {
  const next = ocrQueueChain.then(() => fn());
  ocrQueueChain = next.catch(() => {});
  return next;
}

function runGsettings(args, env) {
  return new Promise((r) => execFile('gsettings', args, { env }, (err, out) => r(err ? '' : String(out || '').trim())));
}

function ensureScreenAwake(env) {
  return new Promise((r) => {
    execFile(
      'gdbus',
      [
        'call',
        '--session',
        '--dest',
        'org.gnome.ScreenSaver',
        '--object-path',
        '/org/gnome/ScreenSaver',
        '--method',
        'org.gnome.ScreenSaver.SetActive',
        'false',
      ],
      { env, timeout: 1500 },
      () => r()
    );
  });
}

async function withMutedEventSound(fn) {
  const env = resolveDesktopEnv();
  const [soundVal] = await Promise.all([
    runGsettings(['get', 'org.gnome.desktop.sound', 'event-sounds'], env),
    ensureScreenAwake(env),
  ]);
  const soundWasTrue = soundVal === 'true';

  if (soundWasTrue) {
    await runGsettings(['set', 'org.gnome.desktop.sound', 'event-sounds', 'false'], env);
  }

  try {
    return await fn();
  } finally {
    if (soundWasTrue) {
      runGsettings(['set', 'org.gnome.desktop.sound', 'event-sounds', 'true'], env);
    }
  }
}

function getFileCacheKey(filePath) {
  try {
    const abs = path.resolve(filePath);
    const st = fs.statSync(abs);
    return `${abs}:${st.size}:${st.mtimeMs}`;
  } catch {
    return null;
  }
}

function normalizeTextQuery(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ড\u09bc/g, 'ড়')
    .replace(/ঢ\u09bc/g, 'ঢ়')
    .replace(/য\u09bc/g, 'য়');
}

function applyQueryFilter(baseRes, queryText, detectUiBoxes) {
  const clone = JSON.parse(JSON.stringify(baseRes));
  if (!detectUiBoxes) {
    clone.ui_boxes = [];
    if (clone.summary) clone.summary.ui_box_count = 0;
  }
  if (queryText) {
    const normQ = normalizeTextQuery(queryText);
    const matches = (clone.ocr_blocks || []).filter((b) =>
      normalizeTextQuery(b.text || '').includes(normQ)
    );
    clone.matches = matches;
    if (clone.summary) clone.summary.match_count = matches.length;
  } else {
    clone.matches = null;
    if (clone.summary) clone.summary.match_count = null;
  }
  return clone;
}

function runVisionEngine(cmd, target, extraObj = {}) {
  if ((cmd === 'inspect_image' || cmd === 'find_text') && target && target !== '-' && !target.trim().startsWith('<')) {
    const cacheKey = getFileCacheKey(target);
    if (cacheKey && ocrCache.has(cacheKey) && extraObj.run_ocr !== false) {
      const cached = ocrCache.get(cacheKey);
      const wantBoxes = cmd === 'inspect_image' ? extraObj.detect_ui_boxes !== false : false;
      return Promise.resolve(applyQueryFilter(cached, extraObj.query_text || null, wantBoxes));
    }
  }
  return new Promise((resolve) => {
    const invokeCmd = cmd === 'find_text' ? 'inspect_image' : cmd;
    const invokeOpts = cmd === 'find_text'
      ? { run_ocr: true, detect_ui_boxes: true, query_text: extraObj.query_text || '' }
      : extraObj;
    execFile(
      '/usr/bin/nice',
      ['-n', '10', VISION_RS_BIN, invokeCmd, target, JSON.stringify(invokeOpts)],
      {
        env: resolveDesktopEnv(),
        maxBuffer: 16 * 1024 * 1024,
        timeout: 60000,
      },
      (err, stdout, stderr) => {
        if (err && !stdout) {
          return resolve({
            ok: false,
            error: err.message,
            stderr: stderr ? stderr.slice(0, 2000) : '',
          });
        }
        try {
          const parsed = JSON.parse(stdout);
          if (parsed && parsed.ok && (cmd === 'inspect_image' || cmd === 'find_text') && target && target !== '-') {
            const ck = getFileCacheKey(target);
            if (ck && invokeOpts.run_ocr !== false && invokeOpts.detect_ui_boxes !== false) {
              if (ocrCache.size >= 32) {
                const firstKey = ocrCache.keys().next().value;
                ocrCache.delete(firstKey);
              }
              ocrCache.set(ck, parsed);
            }
            const wantBoxes = cmd === 'inspect_image' ? extraObj.detect_ui_boxes !== false : false;
            return resolve(applyQueryFilter(parsed, extraObj.query_text || null, wantBoxes));
          }
          resolve(parsed);
        } catch (parseErr) {
          resolve({
            ok: false,
            error: `Failed to parse desktop-vision-rs output: ${parseErr.message}`,
            raw: (stdout || '').slice(0, 2000),
          });
        }
      }
    );
  });
}

function runVisionEngineInMemory(pngBuffer, extraObj = {}) {
  return withOcrLock(() => new Promise((resolve) => {
    const child = spawn(
      '/usr/bin/nice',
      ['-n', '10', VISION_RS_BIN, 'inspect_image', '-', JSON.stringify(extraObj)],
      {
        env: resolveDesktopEnv(),
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    const outChunks = [];
    const errChunks = [];
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      resolve({ ok: false, error: 'In-memory vision engine timed out after 60s' });
    }, 60000);

    child.stdout.on('data', (d) => outChunks.push(d));
    child.stderr.on('data', (d) => errChunks.push(d));

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });

    child.on('close', () => {
      clearTimeout(timer);
      const stdout = Buffer.concat(outChunks).toString('utf8');
      const stderr = Buffer.concat(errChunks).toString('utf8');
      if (!stdout) {
        return resolve({
          ok: false,
          error: 'Empty output from desktop-vision-rs stdin pipeline',
          stderr: stderr.slice(0, 2000),
        });
      }
      try {
        const parsed = JSON.parse(stdout);
        parsed.pipeline_mode = 'in_memory_zero_disk_write';
        resolve(parsed);
      } catch (parseErr) {
        resolve({
          ok: false,
          error: `Failed to parse desktop-vision-rs stdin output: ${parseErr.message}`,
          raw: stdout.slice(0, 2000),
        });
      }
    });

    child.stdin.on('error', () => {});
    child.stdin.end(pngBuffer);
  }));
}

function runAtspiHelper(cmd, argsObj = {}) {
  return new Promise((resolve) => {
    execFile(
      '/usr/bin/nice',
      ['-n', '10', SYS_PYTHON_BIN, ATSPI_SCRIPT, cmd, JSON.stringify(argsObj)],
      {
        env: resolveDesktopEnv(),
        maxBuffer: 16 * 1024 * 1024,
        timeout: 30000,
      },
      (err, stdout, stderr) => {
        if (err) {
          return resolve({
            ok: false,
            error: err.message,
            stderr: stderr ? stderr.slice(0, 2000) : '',
          });
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (parseErr) {
          resolve({
            ok: false,
            error: `Failed to parse atspi_helper output: ${parseErr.message}`,
            raw: stdout.slice(0, 2000),
          });
        }
      }
    );
  });
}

const CONTAINER_ROLES = new Set([
  'application',
  'frame',
  'window',
  'document web',
  'document frame',
  'panel',
  'scroll pane',
  'filler',
  'split pane',
  'layered pane',
  'root pane',
]);

function fuseAtspiGroundTruth(ocrRes, atspiRes, queryText = null, isWindowShot = true) {
  if (!ocrRes || !ocrRes.ok || !atspiRes || !atspiRes.ok || !Array.isArray(atspiRes.nodes)) {
    return ocrRes;
  }

  const frameNode = atspiRes.nodes.find((n) => (n.role === "frame" || n.role === "window") && n.bounds);
  const frameOffset = isWindowShot && frameNode && frameNode.bounds
    ? { x: frameNode.bounds.x || 0, y: frameNode.bounds.y || 0 }
    : { x: 0, y: 0 };

  const groundTruthNodes = [];
  for (const n of atspiRes.nodes) {
    const label = (n.name || n.text || "").trim();
    if (!label) continue;
    let relBounds = n.bounds || null;
    if (relBounds && (frameOffset.x > 0 || frameOffset.y > 0)) {
      if (relBounds.x >= frameOffset.x && relBounds.y >= frameOffset.y) {
        relBounds = {
          ...relBounds,
          x: relBounds.x - frameOffset.x,
          y: relBounds.y - frameOffset.y,
          center_x: relBounds.center_x - frameOffset.x,
          center_y: relBounds.center_y - frameOffset.y,
        };
      }
    }
    groundTruthNodes.push({
      text: label,
      role: n.role || "",
      node_path: n.node_path,
      actions: n.actions || [],
      bounds: relBounds,
    });
  }

  // Enrich OCR blocks with the best-overlapping leaf/widget AT-SPI2 node
  const ocrBlocks = ocrRes.ocr_blocks || [];
  let fusedCount = 0;
  for (const block of ocrBlocks) {
    if (!block.bbox) continue;
    const bx = block.bbox.x;
    const by = block.bbox.y;
    const bw = block.bbox.width;
    const bh = block.bbox.height;
    const bArea = Math.max(1, bw * bh);

    let bestGt = null;
    let bestScore = 0;

    for (const gt of groundTruthNodes) {
      if (CONTAINER_ROLES.has(gt.role) || gt.role === "landmark") continue;
      if (!gt.bounds || gt.bounds.width <= 0 || gt.bounds.height <= 0) continue;
      if (gt.bounds.width > 500 || gt.bounds.height > 100) continue;

      const gx = gt.bounds.x;
      const gy = gt.bounds.y;
      const gw = gt.bounds.width;
      const gh = gt.bounds.height;
      const gArea = Math.max(1, gw * gh);

      const overlapX = Math.max(0, Math.min(bx + bw, gx + gw) - Math.max(bx, gx));
      const overlapY = Math.max(0, Math.min(by + bh, gy + gh) - Math.max(by, gy));
      const overlapArea = overlapX * overlapY;
      if (overlapArea <= 0) continue;

      const minAreaScore = overlapArea / Math.min(bArea, gArea);
      const unionArea = Math.max(1, bArea + gArea - overlapArea);
      const iouScore = overlapArea / unionArea;
      const score = minAreaScore * 0.7 + iouScore * 0.3;

      if (minAreaScore >= 0.4 && score > bestScore) {
        bestScore = score;
        bestGt = gt;
      }
    }

    if (bestGt) {
      const gtShort = bestGt.text.length <= 120 ? bestGt.text : bestGt.text.slice(0, 120);
      if (gtShort) {
        block.atspi_ground_truth_text = gtShort;
        block.atspi_node_path = bestGt.node_path;
        fusedCount++;
      }
    }
  }

  ocrRes.atspi_ground_truth = {
    matched_apps: atspiRes.matched_apps || [],
    total_labeled_elements: groundTruthNodes.length,
    fused_ocr_blocks: fusedCount,
    elements: groundTruthNodes.slice(0, 200),
  };

  if (queryText) {
    const normQ = normalizeTextQuery(queryText);
    const atspiMatches = groundTruthNodes.filter((g) =>
      normalizeTextQuery(g.text).includes(normQ)
    );
    ocrRes.atspi_query_matches = atspiMatches;
    if (ocrRes.summary) {
      ocrRes.summary.atspi_match_count = atspiMatches.length;
    }
  }

  return ocrRes;
}

export class CulMcpBridge {
  constructor() {
    this.proc = null;
    this.nextId = 1000;
    this.pending = new Map();
    this.buffer = '';
    this.initialized = false;
    this.initPromise = null;
    this.cachedTools = null;
  }

  async ensureStarted() {
    if (this.proc && this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._startInternal();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  async _startInternal() {
    if (this.proc) {
      try { this.proc.kill(); } catch {}
      this.proc = null;
    }
    this.initialized = false;
    this.buffer = '';

    const env = resolveDesktopEnv();
    this.proc = spawn(CUL_BIN, ['mcp'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk;
      let idx;
      while ((idx = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, idx).trim();
        this.buffer = this.buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined && this.pending.has(msg.id)) {
            const { resolve, reject, timer } = this.pending.get(msg.id);
            clearTimeout(timer);
            this.pending.delete(msg.id);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
          }
        } catch {}
      }
    });

    this.proc.on('exit', () => {
      for (const [, { reject, timer }] of this.pending.entries()) {
        clearTimeout(timer);
        reject(new Error('computer-use-linux mcp process exited'));
      }
      this.pending.clear();
      this.proc = null;
      this.initialized = false;
    });

    await this._sendRpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'desktop-ui-mcp-bridge', version: '2.1.0' },
    });
    this._sendNotification('notifications/initialized', {});
    this.initialized = true;
  }

  _sendNotification(method, params) {
    if (!this.proc || !this.proc.stdin.writable) return;
    const msg = JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n';
    this.proc.stdin.write(msg);
  }

  _sendRpc(method, params, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      if (!this.proc || !this.proc.stdin.writable) {
        return reject(new Error('computer-use-linux process not writable'));
      }
      const id = ++this.nextId;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout calling ${method}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
      this.proc.stdin.write(payload);
    });
  }

  async _getCompositorWindows() {
    await this.ensureStarted();
    try {
      const res = await this._sendRpc('tools/call', { name: 'list_windows', arguments: {} });
      const txt = res?.content?.[0]?.text || '[]';
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.windows)) return parsed.windows;
    } catch {}
    return [];
  }

  async listTools() {
    await this.ensureStarted();
    if (!this.cachedTools) {
      const res = await this._sendRpc('tools/list', {});
      this.cachedTools = (res && res.tools) ? res.tools : [];
    }
    return [...this.cachedTools, ...EXTRA_TOOLS];
  }

  async callTool(name, args = {}) {
    if (name === 'ensure_language') {
      const rawLang = String(args.language || '').trim().toLowerCase();
      if (!rawLang) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ ok: false, error: 'Missing language parameter' }) }],
          isError: true,
        };
      }
      const tessDir = path.join(ROOT_DIR, 'native_ocr', 'root', 'usr', 'share', 'tesseract-ocr', '5', 'tessdata');
      fs.mkdirSync(tessDir, { recursive: true });

      if (rawLang === 'list' || rawLang === 'status') {
        const installed = fs.readdirSync(tessDir)
          .filter((f) => f.endsWith('.traineddata'))
          .map((f) => ({
            lang: f.replace(/\.traineddata$/, ''),
            size_bytes: fs.statSync(path.join(tessDir, f)).size,
          }));
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              ok: true,
              installed_languages: installed,
              available_total: 123,
              hint: 'Pass any 3-letter language code (e.g. "ben", "jpn", "spa", "fra", "ara", "hin", "deu", "chi_sim", "kor", "rus") to install in 1 second.',
            }, null, 2),
          }],
          isError: false,
        };
      }
      const langList = rawLang === 'all'
        ? ['afr','amh','ara','asm','aze','aze_cyrl','bel','ben','bod','bos','bre','bul','cat','ceb','ces','chi_sim','chi_tra','chr','cos','cym','dan','dan_frak','deu','deu_frak','dzo','ell','eng','enm','epo','equ','est','eus','fao','fas','fil','fin','fra','frk','frm','fry','gla','gle','glg','grc','guj','hat','heb','hin','hrv','hun','hye','iku','ind','isl','ita','ita_old','jav','jpn','kan','kat','kat_old','kaz','khm','kir','kmr','kor','kor_vert','kur','lao','lat','lav','lit','ltz','mal','mar','mkd','mlt','mon','mri','msa','mya','nep','nld','nor','oci','ori','osd','pan','pol','por','pus','que','ron','rus','san','sin','slk','slk_frak','slv','snd','spa','spa_old','sqi','srp','srp_latn','sun','swa','swe','syr','tam','tat','tel','tgk','tgl','tha','tir','ton','tur','uig','ukr','urd','uzb','uzb_cyrl','vie','yid','yor']
        : [rawLang];

      const results = [];
      for (const lang of langList) {
        const targetFile = path.join(tessDir, `${lang}.traineddata`);
        if (fs.existsSync(targetFile)) {
          results.push({ lang, status: 'already_installed', path: targetFile, size_bytes: fs.statSync(targetFile).size });
          continue;
        }
        const url = `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/${lang}.traineddata`;
        try {
          const resp = await fetch(url);
          if (!resp.ok) {
            results.push({ lang, status: 'download_failed', error: `HTTP ${resp.status} ${resp.statusText}` });
            continue;
          }
          const buf = Buffer.from(await resp.arrayBuffer());
          fs.writeFileSync(targetFile, buf);
          results.push({ lang, status: 'installed', path: targetFile, size_bytes: buf.length });
        } catch (dlErr) {
          results.push({ lang, status: 'download_error', error: dlErr.message });
        }
      }

      if (results.some((r) => r.status === 'installed')) {
        ocrCache.clear();
        inMemoryFrameCache.clear();
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ ok: true, installed_count: results.filter(r => r.status === 'installed').length, details: results }, null, 2) }],
        isError: false,
      };
    }
    if (name === 'launch_app') {
      const appQuery = String(args.app || '').trim();
      if (!appQuery) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ ok: false, error: 'Missing required parameter: app' }) }],
          isError: true,
        };
      }

      const resolved = findDesktopEntryCommand(appQuery);
      const matchKey = (resolved.match || appQuery).toLowerCase().replace(/\.desktop$/i, '');
      const focusIfRunning = args.focus_if_running !== false;
      const waitForWindow = args.wait_for_window !== false;
      const waitTimeoutMs = Number(args.wait_timeout_ms) > 0 ? Number(args.wait_timeout_ms) : 10000;

      const existingWindows = await this._getCompositorWindows();
      const matchFn = (w) => {
        const appId = String(w.app_id || w.app_name || w.wm_class || '').toLowerCase();
        const title = String(w.title || '').toLowerCase();
        const qLow = appQuery.toLowerCase().replace(/\.desktop$/i, '');
        return (
          appId.includes(matchKey) ||
          title.includes(matchKey) ||
          appId.includes(qLow) ||
          title.includes(qLow)
        );
      };
      const isRenderedFn = (w) => {
        if (!w) return false;
        if (!w.bounds) return true;
        return w.bounds.width > 50 && w.bounds.height > 50;
      };

      const alreadyOpen = existingWindows.find((w) => matchFn(w) && isRenderedFn(w)) || existingWindows.find(matchFn);
      if (alreadyOpen && focusIfRunning) {
        try {
          await this._sendRpc('tools/call', {
            name: 'activate_window',
            arguments: { window_id: alreadyOpen.id || alreadyOpen.window_id },
          });
        } catch {}
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ok: true,
                  status: 'already_running',
                  app: appQuery,
                  window: alreadyOpen,
                },
                null,
                2
              ),
            },
          ],
          isError: false,
        };
      }

      const spawnArgs = [...(resolved.args || []), ...(Array.isArray(args.args) ? args.args : [])];
      const env = resolveDesktopEnv();
      let spawnedPid = null;
      try {
        const child = spawn(resolved.bin, spawnArgs, {
          env,
          detached: true,
          stdio: 'ignore',
        });
        spawnedPid = child.pid;
        child.unref();
      } catch (spawnErr) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ok: false,
                  error: `Failed to launch ${resolved.bin}: ${spawnErr.message}`,
                  resolved,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      let foundWindow = null;
      const startTime = Date.now();
      if (waitForWindow) {
        while (Date.now() - startTime < waitTimeoutMs) {
          await new Promise((r) => setTimeout(r, 250));
          const currentWins = await this._getCompositorWindows();
          const candidate = currentWins.find((w) => matchFn(w) && isRenderedFn(w));
          if (candidate) {
            foundWindow = candidate;
            // Allow 350ms for GPU surface paint after window geometry stabilizes
            await new Promise((r) => setTimeout(r, 350));
            break;
          }
          foundWindow = currentWins.find(matchFn) || null;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: true,
                status: 'launched',
                app: appQuery,
                executable: resolved.bin,
                args: spawnArgs,
                pid: spawnedPid,
                elapsed_ms: Date.now() - startTime,
                window: foundWindow,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    }

    if (name === 'inspect_svg') {
      const res = await runVisionEngine('inspect_svg', args.file_path_or_xml || '', {
        include_paths: args.include_paths !== false,
        max_elements: args.max_elements || 500,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        isError: !res.ok,
      };
    }

    if (name === 'inspect_image_ocr') {
      const res = await runVisionEngine('inspect_image', args.file_path || '', {
        run_ocr: args.run_ocr !== false,
        detect_ui_boxes: args.detect_ui_boxes !== false,
        query_text: args.query_text || null,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        isError: !res.ok,
      };
    }

    if (name === 'find_text_in_image') {
      const res = await runVisionEngine('find_text', args.file_path || '', {
        query_text: args.query_text || '',
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        isError: !res.ok,
      };
    }

    if (name === 'deep_atspi_tree') {
      const res = await runAtspiHelper('walk_app_tree', {
        app_query: String(args.app_query || '').replace(/\.desktop$/i, ''),
        max_depth: args.max_depth || 28,
        max_nodes: args.max_nodes || 400,
        interactive_only: args.interactive_only !== false,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        isError: !res.ok,
      };
    }

    if (name === 'atspi_invoke_node') {
      const res = await runAtspiHelper('invoke_node', {
        node_path: args.node_path || '',
        action_index: args.action_index || 0,
        set_text: args.set_text !== undefined ? args.set_text : null,
        grab_focus: args.grab_focus !== false,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        isError: !res.ok,
      };
    }

    if (name === 'screenshot_and_ocr') {
      await this.ensureStarted();
      const shotArgs = { format: 'png' };
      if (args.window_id !== undefined) shotArgs.window_id = args.window_id;
      if (args.app_id !== undefined) shotArgs.app_id = args.app_id;
      if (args.title !== undefined) shotArgs.title = args.title;
      if (!args.window_id && !args.app_id && !args.title) {
        shotArgs.full_screen = true;
      }

      // Resolve target app name and window offset for AT-SPI2 fusion
      let targetAppQuery = String(args.app_id || args.title || '').replace(/\.desktop$/i, '');
      let winOffset = { x: 0, y: 0 };
      const wins = await this._getCompositorWindows();
      let matchedWin = null;
      if (args.window_id !== undefined) {
        matchedWin = wins.find((item) => item.id === args.window_id || item.window_id === args.window_id);
      } else if (targetAppQuery) {
        const qLow = targetAppQuery.toLowerCase();
        matchedWin = wins.find(
          (item) =>
            String(item.app_id || '').toLowerCase().includes(qLow) ||
            String(item.title || '').toLowerCase().includes(qLow)
        );
      }
      if (matchedWin) {
        if (!targetAppQuery) {
          targetAppQuery = String(matchedWin.wm_class || matchedWin.app_id || matchedWin.title || '').replace(/\.desktop$/i, '');
        }
        if (matchedWin.bounds) {
          winOffset = { x: matchedWin.bounds.x || 0, y: matchedWin.bounds.y || 0 };
        }
      }

      const shotRes = await withMutedEventSound(() =>
        this._sendRpc('tools/call', {
          name: 'screenshot',
          arguments: shotArgs,
        })
      );

      const contentList = (shotRes && shotRes.content) || [];
      const imgBlock = contentList.find((c) => c.type === 'image' && c.data);
      const textBlock = contentList.find((c) => c.type === 'text' && c.text);

      if (!imgBlock) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                ok: false,
                error: 'Failed to obtain screenshot image buffer for OCR',
                upstream: textBlock ? textBlock.text : shotRes,
              }),
            },
          ],
          isError: true,
        };
      }

      // 100% In-Memory (Zero-Disk-Write) PNG buffer + SHA-256 Frame Cache + parallel AT-SPI2 Ground-Truth fusion
      const pngBuffer = Buffer.from(imgBlock.data, 'base64');
      const frameHash = crypto.createHash('sha256').update(pngBuffer).digest('hex') + ':' + targetAppQuery;

      let fusedOcrRes;
      if (inMemoryFrameCache.has(frameHash)) {
        const cachedBase = inMemoryFrameCache.get(frameHash);
        fusedOcrRes = applyQueryFilter(cachedBase, args.query_text || null, args.detect_ui_boxes !== false);
        fusedOcrRes.cache_hit = true;
      } else {
        const [rawOcrRes, atspiRes] = await Promise.all([
          runVisionEngineInMemory(pngBuffer, {
            run_ocr: true,
            detect_ui_boxes: true,
            query_text: null,
          }),
          runAtspiHelper('walk_app_tree', {
            app_query: targetAppQuery,
            max_depth: 28,
            max_nodes: 400,
            interactive_only: true,
          }),
        ]);
        const baseFused = fuseAtspiGroundTruth(rawOcrRes, atspiRes, null, !shotArgs.full_screen);
        if (baseFused && baseFused.ok) {
          if (inMemoryFrameCache.size >= 24) {
            const oldestKey = inMemoryFrameCache.keys().next().value;
            inMemoryFrameCache.delete(oldestKey);
          }
          inMemoryFrameCache.set(frameHash, baseFused);
        }
        fusedOcrRes = fuseAtspiGroundTruth(
          applyQueryFilter(baseFused, args.query_text || null, args.detect_ui_boxes !== false),
          atspiRes,
          args.query_text || null,
          !shotArgs.full_screen
        );
        fusedOcrRes.cache_hit = false;
      }

      let shotMeta = {};
      try {
        if (textBlock) shotMeta = JSON.parse(textBlock.text);
      } catch {}

      const combined = {
        ok: fusedOcrRes.ok,
        pipeline: 'in_memory_zero_disk_write + unsharp_mask_3x3 + atspi2_ground_truth_fusion',
        screenshot_metadata: shotMeta,
        ocr_and_ui: fusedOcrRes,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(combined, null, 2) }],
        isError: !fusedOcrRes.ok,
      };
    }

    await this.ensureStarted();
    const upstreamRes =
      name === 'screenshot'
        ? await withMutedEventSound(() => this._sendRpc('tools/call', { name, arguments: args }))
        : await this._sendRpc('tools/call', { name, arguments: args });

    if (name === 'list_windows' || name === 'focused_window') {
      const txt = upstreamRes?.content?.[0]?.text || '';
      if (upstreamRes?.isError || txt.includes('unavailable') || txt.includes('failed')) {
        const fb = await runAtspiHelper(name, args);
        return {
          content: [{ type: 'text', text: JSON.stringify(fb, null, 2) }],
          isError: !fb.ok,
        };
      }
    }

    return upstreamRes;
  }

  async handleJsonRpc(msg) {
    if (!msg || typeof msg !== 'object') return null;

    if (Array.isArray(msg)) {
      const results = [];
      for (const item of msg) {
        const r = await this.handleJsonRpc(item);
        if (r) results.push(r);
      }
      return results.length ? results : null;
    }

    const { id, method, params } = msg;

    if (id === undefined || id === null) {
      return null;
    }

    try {
      if (method === 'initialize') {
        const clientVersion = (params && params.protocolVersion) || '2024-11-05';
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: clientVersion,
            capabilities: {
              tools: { listChanged: false },
            },
            serverInfo: {
              name: 'AxiomVision',
              version: '2.1.0',
            },
          },
        };
      }

      if (method === 'ping') {
        return { jsonrpc: '2.0', id, result: {} };
      }

      if (method === 'tools/list') {
        const tools = await this.listTools();
        return { jsonrpc: '2.0', id, result: { tools } };
      }

      if (method === 'tools/call') {
        const toolName = params && params.name;
        const toolArgs = (params && params.arguments) || {};
        const result = await this.callTool(toolName, toolArgs);
        return { jsonrpc: '2.0', id, result };
      }

      if (method === 'resources/list') {
        return { jsonrpc: '2.0', id, result: { resources: [] } };
      }

      if (method === 'prompts/list') {
        return { jsonrpc: '2.0', id, result: { prompts: [] } };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: err.code || -32000,
          message: err.message || String(err),
        },
      };
    }
  }
}
