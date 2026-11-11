#!/usr/bin/python3
"""
Direct AT-SPI2 Introspection & Action Engine via GObject Introspection (gi.repository.Atspi)
Works immediately on Ubuntu GNOME Wayland without requiring GNOME Shell restart or pointer portals.
"""

import sys
import json
import gi
gi.require_version('Atspi', '2.0')
from gi.repository import Atspi

WRAPPER_ROLES = {
    "panel",
    "section",
    "filler",
    "scroll pane",
    "split pane",
    "layered pane",
    "root pane",
    "viewport",
    "unknown",
    "redundant object",
}


def _get_states(obj):
    states = []
    try:
        ss = obj.get_state_set()
        for name, st in [
            ("active", Atspi.StateType.ACTIVE),
            ("focused", Atspi.StateType.FOCUSED),
            ("enabled", Atspi.StateType.ENABLED),
            ("sensitive", Atspi.StateType.SENSITIVE),
            ("showing", Atspi.StateType.SHOWING),
            ("visible", Atspi.StateType.VISIBLE),
            ("checked", Atspi.StateType.CHECKED),
            ("selected", Atspi.StateType.SELECTED),
            ("editable", Atspi.StateType.EDITABLE),
            ("focusable", Atspi.StateType.FOCUSABLE),
        ]:
            if ss.contains(st):
                states.append(name)
    except Exception:
        pass
    return states


def _get_bounds(obj):
    try:
        comp = obj.get_component_iface()
        if comp:
            r = comp.get_extents(Atspi.CoordType.SCREEN)
            return {
                "x": int(r.x),
                "y": int(r.y),
                "width": int(r.width),
                "height": int(r.height),
                "center_x": int(r.x + r.width / 2),
                "center_y": int(r.y + r.height / 2),
            }
    except Exception:
        pass
    return None


def _get_actions(obj):
    actions = []
    try:
        act = obj.get_action_iface()
        if act:
            n = act.get_n_actions()
            for i in range(n):
                aname = act.get_action_name(i)
                if aname:
                    actions.append(aname)
    except Exception:
        pass
    return actions


def _get_text(obj):
    try:
        ti = obj.get_text_iface()
        if ti:
            cnt = ti.get_character_count()
            if cnt > 0:
                txt = ti.get_text(0, min(cnt, 500))
                if txt:
                    return txt.replace("\ufffc", "").strip()
    except Exception:
        pass
    return None


def list_windows():
    desktop = Atspi.get_desktop(0)
    windows = []
    wid = 1
    for i in range(desktop.get_child_count()):
        app = desktop.get_child_at_index(i)
        if not app:
            continue
        app_name = app.get_name() or ""
        try:
            pid = app.get_process_id()
        except Exception:
            pid = None
        for j in range(app.get_child_count()):
            win = app.get_child_at_index(j)
            if not win:
                continue
            title = win.get_name() or ""
            role = win.get_role_name() or ""
            states = _get_states(win)
            bounds = _get_bounds(win)
            if not title and role in ("filler", "popup menu") and (not bounds or bounds["width"] == 0):
                continue
            windows.append({
                "window_id": wid,
                "app_index": i,
                "win_index": j,
                "app_name": app_name,
                "pid": pid,
                "title": title,
                "role": role,
                "focused": ("active" in states or "focused" in states),
                "states": states,
                "bounds": bounds,
            })
            wid += 1
    return {
        "ok": True,
        "backend": "atspi2-direct",
        "window_count": len(windows),
        "windows": windows,
    }


def focused_window():
    res = list_windows()
    focused = [w for w in res["windows"] if w["focused"] and w["role"] != "window"]
    if not focused:
        focused = [w for w in res["windows"] if w["focused"]]
    return {
        "ok": True,
        "backend": "atspi2-direct",
        "focused_window": focused[0] if focused else None,
        "all_active_candidates": focused,
    }


def walk_app_tree(app_query="", max_depth=28, max_nodes=400, interactive_only=False):
    desktop = Atspi.get_desktop(0)
    q = (app_query or "").lower().strip()
    nodes = []

    def walk(obj, path_str, depth):
        if len(nodes) >= max_nodes or depth > max_depth or not obj:
            return
        try:
            name = (obj.get_name() or "").replace("\ufffc", "").strip()
            role = obj.get_role_name() or ""
        except Exception:
            return

        # Fast-path skip of unnamed layout containers to avoid unnecessary D-Bus roundtrips
        if interactive_only and depth > 1 and role in WRAPPER_ROLES and not name:
            keep = False
        else:
            text_val = _get_text(obj) if (not name or role in ("entry", "text", "static", "paragraph", "heading", "label")) else None
            if interactive_only and depth > 1 and role in WRAPPER_ROLES and not text_val:
                keep = False
            else:
                actions = _get_actions(obj)
                states = _get_states(obj) if (not name and not text_val) else []
                if interactive_only and depth > 1:
                    real_actions = [a for a in actions if a not in ("showContextMenu", "clickAncestor", "doDefault")]
                    keep = bool(
                        name
                        or text_val
                        or "editable" in states
                        or real_actions
                        or role in (
                            "push button",
                            "button",
                            "toggle button",
                            "check box",
                            "radio button",
                            "menu item",
                            "entry",
                            "password text",
                            "link",
                            "tab",
                            "page tab",
                            "combo box",
                            "heading",
                        )
                    )
                else:
                    keep = True

        if keep:
            bounds = _get_bounds(obj)
            node = {
                "node_path": path_str,
                "depth": depth,
                "role": role,
                "name": name,
            }
            if text_val and text_val != name:
                node["text"] = text_val
            if actions:
                node["actions"] = actions
            if states:
                node["states"] = states
            if bounds and (bounds["width"] > 0 or bounds["height"] > 0):
                node["bounds"] = bounds
            nodes.append(node)

        try:
            cnt = obj.get_child_count()
        except Exception:
            cnt = 0
        for c_idx in range(min(cnt, 150)):
            if len(nodes) >= max_nodes:
                break
            try:
                child = obj.get_child_at_index(c_idx)
            except Exception:
                child = None
            if child:
                walk(child, f"{path_str}/{c_idx}", depth + 1)

    matched_apps = []
    for i in range(desktop.get_child_count()):
        app = desktop.get_child_at_index(i)
        if not app:
            continue
        aname = app.get_name() or ""
        if q and q not in aname.lower():
            title_match = False
            for j in range(app.get_child_count()):
                w = app.get_child_at_index(j)
                if w and q in (w.get_name() or "").lower():
                    title_match = True
                    break
            if not title_match:
                continue
        matched_apps.append(aname)
        walk(app, str(i), 0)

    return {
        "ok": True,
        "query": app_query,
        "matched_apps": matched_apps,
        "node_count": len(nodes),
        "nodes": nodes,
    }


def invoke_node(node_path, action_index=0, set_text=None, grab_focus=True):
    desktop = Atspi.get_desktop(0)
    parts = [int(p) for p in str(node_path).strip("/").split("/") if p.strip().isdigit()]
    if not parts:
        return {"ok": False, "error": f"Invalid node_path: {node_path}"}

    curr = desktop
    for idx in parts:
        curr = curr.get_child_at_index(idx)
        if not curr:
            return {"ok": False, "error": f"Element not found at path {node_path} (stopped at {idx})"}

    results = {
        "ok": True,
        "node_path": node_path,
        "name": curr.get_name() or "",
        "role": curr.get_role_name() or "",
    }

    if grab_focus:
        try:
            comp = curr.get_component_iface()
            if comp:
                results["focused"] = bool(comp.grab_focus())
        except Exception as e:
            results["focus_error"] = str(e)

    if set_text is not None:
        try:
            et = curr.get_editable_text_iface()
            if et:
                results["text_set"] = bool(et.set_text_contents(str(set_text)))
            else:
                return {"ok": False, "error": "Element does not implement EditableText interface", "node": results}
        except Exception as e:
            return {"ok": False, "error": f"Failed to set text: {e}", "node": results}
    else:
        try:
            act = curr.get_action_iface()
            if act and act.get_n_actions() > action_index:
                results["action_name"] = act.get_action_name(action_index)
                results["action_invoked"] = bool(act.do_action(action_index))
            else:
                results["action_invoked"] = False
                results["note"] = "No AT-SPI action at index; focus attempted"
        except Exception as e:
            return {"ok": False, "error": f"Failed to invoke action: {e}", "node": results}

    return results


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list_windows"
    arg_json = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}

    if cmd == "list_windows":
        out = list_windows()
    elif cmd == "focused_window":
        out = focused_window()
    elif cmd == "walk_app_tree":
        out = walk_app_tree(
            app_query=arg_json.get("app_query", ""),
            max_depth=int(arg_json.get("max_depth", 28)),
            max_nodes=int(arg_json.get("max_nodes", 400)),
            interactive_only=bool(arg_json.get("interactive_only", False)),
        )
    elif cmd == "invoke_node":
        out = invoke_node(
            node_path=arg_json.get("node_path", ""),
            action_index=int(arg_json.get("action_index", 0)),
            set_text=arg_json.get("set_text"),
            grab_focus=bool(arg_json.get("grab_focus", True)),
        )
    else:
        out = {"ok": False, "error": f"Unknown command: {cmd}"}

    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
