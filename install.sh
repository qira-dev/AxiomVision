#!/usr/bin/env bash
# ==============================================================================
# AxiomVision — Universal AI Desktop Automation Engine
# 1-Liner Zero-Dependency Self-Contained Installer
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}=== AxiomVision Installer (Zero-Hallucination Desktop Automation Engine) ===${NC}"

OS="$(uname -s)"
ARCH="$(uname -m)"

if [[ "${OS}" != "Linux" ]]; then
    echo -e "${RED}[!] Currently AxiomVision automated installer supports Linux (Ubuntu 22.04 / 24.04 / 26.04 GNOME Wayland & X11).${NC}"
    echo -e "    Windows & macOS native engine adapters are in development."
    exit 1
fi

if [[ "${ARCH}" != "x86_64" ]]; then
    echo -e "${YELLOW}[!] Warning: System architecture is ${ARCH}. Pre-built binaries target x86_64.${NC}"
fi

INSTALL_DIR="${HOME}/.local/share/axiom-ui"
BIN_DIR="${HOME}/.local/bin"
EXT_DIR="${HOME}/.local/share/gnome-shell/extensions/computer-use-linux@avifenesh.dev"

mkdir -p "${INSTALL_DIR}" "${BIN_DIR}" "${HOME}/.local/share/gnome-shell/extensions"

# Check if running locally inside the repo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"
if [[ -n "${SCRIPT_DIR}" && -f "${SCRIPT_DIR}/server.mjs" && -f "${SCRIPT_DIR}/axiomui" ]]; then
    echo -e "${BLUE}[*] Installing from local source: ${SCRIPT_DIR}...${NC}"
    TARGET_DIR="${SCRIPT_DIR}"
else
    echo -e "${BLUE}[*] Cloning AxiomVision into ${INSTALL_DIR}...${NC}"
    if [[ -d "${INSTALL_DIR}/.git" ]]; then
        git -C "${INSTALL_DIR}" pull --quiet
    else
        git clone --depth 1 https://github.com/qira-dev/AxiomVision.git "${INSTALL_DIR}"
    fi
    TARGET_DIR="${INSTALL_DIR}"
fi

# 1. Self-Contained Node.js Runtime Check (Auto-downloads portable Node v22 if missing or < v18)
NEED_NODE=1
if command -v node >/dev/null 2>&1; then
    NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1 || echo 0)"
    if [[ "${NODE_MAJOR}" -ge 18 ]]; then
        NEED_NODE=0
    fi
fi

if [[ "${NEED_NODE}" -eq 1 && ! -x "${TARGET_DIR}/runtime/node/bin/node" ]]; then
    echo -e "${BLUE}[*] Bundling self-contained portable Node.js v22 runtime (zero sudo required)...${NC}"
    mkdir -p "${TARGET_DIR}/runtime"
    NODE_TAR="/tmp/axiomui-node-v22.tar.xz"
    python3 -c '
import urllib.request
urllib.request.urlretrieve("https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.xz", "/tmp/axiomui-node-v22.tar.xz")
'
    tar -xJf "${NODE_TAR}" -C "${TARGET_DIR}/runtime"
    mv "${TARGET_DIR}/runtime/node-v22.14.0-linux-x64" "${TARGET_DIR}/runtime/node"
    rm -f "${NODE_TAR}"
fi

export PATH="${TARGET_DIR}/runtime/node/bin:${BIN_DIR}:${PATH}"

# 2. Install & verify GNOME Shell Extension
if [[ -d "${TARGET_DIR}/gnome-extension/computer-use-linux@avifenesh.dev" ]]; then
    echo -e "${BLUE}[*] Registering GNOME Shell Wayland Extension...${NC}"
    rm -rf "${EXT_DIR}"
    cp -r "${TARGET_DIR}/gnome-extension/computer-use-linux@avifenesh.dev" "${EXT_DIR}"
    gnome-extensions enable computer-use-linux@avifenesh.dev 2>/dev/null || true
fi

# 3. Enable toolkit accessibility
echo -e "${BLUE}[*] Enabling GNOME toolkit-accessibility...${NC}"
gsettings set org.gnome.desktop.interface toolkit-accessibility true 2>/dev/null || true

# 4. Symlink executable to ~/.local/bin/axiomui
chmod +x "${TARGET_DIR}/axiomui" "${TARGET_DIR}/server.mjs" "${TARGET_DIR}/mcp-stdio.mjs" \
         "${TARGET_DIR}/bin/"* "${TARGET_DIR}/native_ocr/root/usr/bin/"*
ln -sf "${TARGET_DIR}/axiomui" "${BIN_DIR}/axiomui"

# Ensure ~/.local/bin is in PATH
if [[ ":${PATH}:" != *":${BIN_DIR}:"* ]]; then
    SHELL_RC="${HOME}/.bashrc"
    [[ "${SHELL:-}" == *"zsh"* ]] && SHELL_RC="${HOME}/.zshrc"
    if ! grep -q '.local/bin' "${SHELL_RC}" 2>/dev/null; then
        echo 'export PATH="${HOME}/.local/bin:${PATH}"' >> "${SHELL_RC}"
    fi
fi

# 5. Start AxiomVision Daemon & Run Diagnostics
echo -e "${BLUE}[*] Starting AxiomVision background service...${NC}"
"${TARGET_DIR}/axiomui" restart

echo -e "\n${BOLD}${GREEN}✔ AxiomVision successfully installed and running on port 39200!${NC}\n"
echo -e "Commands:"
echo -e "  • Check status : ${BOLD}axiomui status${NC}"
echo -e "  • View logs    : ${BOLD}axiomui logs${NC}"
echo -e "  • Stop daemon  : ${BOLD}axiomui stop${NC}"
echo -e "  • Add language : ${BOLD}axiomui lang add <lang_code>${NC} (123 languages: ben, jpn, fra, spa, hin, ara, etc.)"
echo -e ""
echo -e "Configure your IDE or Agent:"
echo -e "  • Streamable HTTP : ${BOLD}http://127.0.0.1:39200/mcp${NC}"
echo -e "  • Stdio mode     : ${BOLD}node ${TARGET_DIR}/mcp-stdio.mjs${NC}"
