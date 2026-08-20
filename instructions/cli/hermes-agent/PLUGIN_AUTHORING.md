# Hermes Native Plugin Authoring

> Korean version: [PLUGIN_AUTHORING.ko.md](PLUGIN_AUTHORING.ko.md)  
> Concepts, lifecycle, portable plugins, and security: [PLUGINS.md](PLUGINS.md)  
> Research date: **2026-08-20**.

## Sources and architecture

- [Build a Hermes Plugin](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins)
- [Event Hooks catalog](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks)
- [Plugins overview](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins)
- [Hermes Agent repository](https://github.com/NousResearch/hermes-agent)

A native plugin separates the manifest, model-facing schemas, handlers, and startup wiring:

```text
calculator/
├── plugin.yaml
├── __init__.py
├── schemas.py
└── tools.py
```

`register(ctx)` runs once at startup. It registers documented surfaces; an exception disables that plugin while Hermes continues. Keep imports and registration deterministic: defer network access, credential reads, background work, and mutations to handlers.

## Manifest

```yaml
name: calculator
version: 1.0.0
description: Evaluate basic arithmetic expressions
provides_tools:
  - calculate
provides_hooks:
  - post_tool_call
```

`provides_tools` and `provides_hooks` document what Doctor compares with actual registration. A v2 manifest can add `manifest_version: 2`, `api_version`, `license`, `homepage`, `tags`, advisory `requires_plugins`, declared `python_dependencies`, and `config_schema`. No `manifest_version` means v1. Unknown fields warn but do not prevent loading.

Declare required credentials and privileged host surfaces explicitly:

```yaml
requires_env:
  - name: WEATHER_API_KEY
    description: API key for the weather service
    url: https://example.com/keys
    secret: true
capabilities:
  - tools.override
  - llm.model_override
```

A missing `requires_env` value disables the plugin cleanly. `python_dependencies` is declaration-only: Hermes reports missing packages but never auto-installs them. Use bounded versions and package third-party dependencies as your own pip extras.

## Complete calculator example

### `schemas.py`

```python
"""Model-facing tool schema."""

CALCULATE = {
    "name": "calculate",
    "description": "Evaluate a basic arithmetic expression such as '2 * (3 + 4)'.",
    "parameters": {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "Expression using numbers, +, -, *, /, parentheses, and **.",
            }
        },
        "required": ["expression"],
    },
}
```

### `tools.py`

```python
"""Calculator handler."""

import ast
import json
import operator

_BINARY = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
    ast.Div: operator.truediv, ast.Pow: operator.pow,
}
_UNARY = {ast.UAdd: operator.pos, ast.USub: operator.neg}


def _evaluate(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _BINARY:
        return _BINARY[type(node.op)](_evaluate(node.left), _evaluate(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY:
        return _UNARY[type(node.op)](_evaluate(node.operand))
    raise ValueError("Only numeric arithmetic is allowed")


def calculate(args: dict, **kwargs) -> str:
    """Return JSON on both success and failure; never expose eval()."""
    del kwargs
    expression = str(args.get("expression", "")).strip()
    if not expression:
        return json.dumps({"error": "expression is required"})
    try:
        value = _evaluate(ast.parse(expression, mode="eval").body)
        return json.dumps({"expression": expression, "result": value})
    except (SyntaxError, ValueError, ZeroDivisionError, OverflowError) as exc:
        return json.dumps({"expression": expression, "error": str(exc)})
```

### `__init__.py`

```python
"""Calculator registration."""

import logging
from .schemas import CALCULATE
from .tools import calculate

logger = logging.getLogger(__name__)


def _after_tool(tool_name, args, result, task_id, **kwargs):
    del args, result, kwargs
    logger.debug("tool=%s task_id=%s", tool_name, task_id)


def register(ctx):
    ctx.register_tool(
        name="calculate", toolset="calculator", schema=CALCULATE,
        handler=calculate,
    )
    ctx.register_hook("post_tool_call", _after_tool)
```

The schema description is what the model sees; state purpose, inputs, and boundaries precisely. Handlers receive an argument dictionary, return a JSON **string** for success and expected failure, catch expected exceptions, and accept `**kwargs` for additive compatibility. Do not use `eval` on model/user input; this example permits only a small numeric AST.

## Tools and hooks

Use `ctx.register_tool(name=..., toolset=..., schema=..., handler=...)`. `toolset` is the ownership namespace. `check_fn` can hide an unavailable optional tool. A conflicting name needs `override=True`; a non-bundled plugin overriding a built-in also needs declared and granted `tools.override`.

Use `ctx.register_hook(event, callback)`. The hooks catalog is authoritative for event timing, payloads, privacy, and returns. Most hooks observe only. `pre_tool_call` can return a documented block/approval directive, and `pre_llm_call` can inject current-turn context. Hooks must be quick, redacted, bounded, resilient to absent optional fields, and accept `**kwargs`.

```python
def audit(tool_name, args, result, task_id, **kwargs):
    logger.info("tool=%s task=%s", tool_name, task_id)

def reject_empty(tool_name, args, task_id, **kwargs):
    if tool_name == "calculate" and not args.get("expression"):
        return {"action": "block", "message": "expression is required"}
    return None

def register(ctx):
    ctx.register_hook("post_tool_call", audit)
    ctx.register_hook("pre_tool_call", reject_empty)
```

Do not use hooks to silently approve actions. Hermes owns hard blocks, approval binding, and final authorization.

## Commands, skills, data, configuration, and state

A slash command is an in-session `/name` command (CLI and gateway); a CLI command is terminal-only `hermes name ...`.

```python
def status(raw_args: str) -> str:
    return "Usage: /calc-status" if raw_args.strip() else "calculator ready"

def setup(subparser):
    subparser.add_parser("status", help="Show calculator status")

def cli_handler(args):
    print("calculator ready")

def register(ctx):
    ctx.register_command("calc-status", status, description="Show calculator status")
    ctx.register_cli_command(
        name="calculator", help="Calculator administration",
        setup_fn=setup, handler_fn=cli_handler,
    )
```

Built-in slash names win over conflicts. Slash handlers receive a raw string and may be async; CLI handlers receive an `argparse.Namespace`. To invoke a tool from a command, use `ctx.dispatch_tool(name, args)`, which retains parent context, approval, redaction, and budgets.

Read immutable shipped data relative to `Path(__file__).parent / "data" / "file.json"`. Register `skills/<name>/SKILL.md` with `ctx.register_skill`; skills are read-only and namespaced as `plugin-id:skill-name`. Use `ctx.get_config`/`ctx.set_config` only for user-visible plugin settings. Use `ctx.state` or the documented profile-scoped data root for runtime state; never write mutable state or secrets to the install tree.

## Doctor, debugging, distribution, and compatibility

```bash
# Doctor uses Hermes discovery, import, register, and registry checks.
hermes plugins doctor . --ci

# Diagnose discovery and load failures.
HERMES_PLUGINS_DEBUG=1 hermes plugins list
hermes logs --level WARNING
```

Doctor checks discovery, parsing, namespaced import, `register(ctx)`, hook/tool registries, invalid hooks, missing callback `**kwargs`, and declared/registered drift. It uses temporary `HERMES_HOME`, restores registration state, and blocks direct Python sockets during registration. It still imports in-process code and is **not a sandbox**; run it only for trusted code.

Publish directory plugins in a standalone repository, preferably installed by immutable commit. A pip package uses entry points:

```toml
[project.entry-points."hermes_agent.plugins"]
calculator = "hermes_calculator:register"

[project.entry-points."hermes_agent.plugin_capabilities"]
"calculator.tools.override" = "hermes_calculator:register"
```

Document supported Hermes versions, requested capabilities, environment variables, data retention, network endpoints, and upgrades.

**Compatibility facts:** documented `PluginContext` methods evolve additively; new parameters are optional/defaulted and preferably keyword-only; hook payloads add keyword fields; unknown manifest fields warn; provider interfaces add defaults. Persisted state/config and resumable data must remain readable or have an explicit migration.

A documented behavior may be removed only with a replacement/migration guide, a once-per-process warning naming the earliest removal release, support through at least two subsequent minor releases, and coverage for old and replacement paths. **Recommendation:** use documented APIs, accept `**kwargs`, avoid internal imports, locally version wire/persisted formats, and keep an external compatibility fixture.
