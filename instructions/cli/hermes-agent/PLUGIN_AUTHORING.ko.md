# Hermes 네이티브 플러그인 작성

> English version: [PLUGIN_AUTHORING.md](PLUGIN_AUTHORING.md)  
> 개념, 수명 주기, 이식 플러그인, 보안: [PLUGINS.ko.md](PLUGINS.ko.md)  
> 조사 기준일: **2026-08-20**.

## 출처 및 아키텍처

- [Hermes 플러그인 만들기](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins)
- [이벤트 훅 카탈로그](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks)
- [플러그인 개요](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins)
- [Hermes Agent 저장소](https://github.com/NousResearch/hermes-agent)

네이티브 플러그인은 매니페스트, 모델 대상 스키마, 핸들러, 시작 등록을 분리한다.

```text
calculator/
├── plugin.yaml
├── __init__.py
├── schemas.py
└── tools.py
```

`register(ctx)`는 시작 시 한 번 실행된다. 문서화된 표면을 등록하며 예외가 나면 해당 플러그인을 비활성화하지만 Hermes는 계속 동작한다. import와 등록을 결정적으로 유지한다. 네트워크 접근, 자격 증명 읽기, 백그라운드 작업, 변경은 핸들러로 미룬다.

## 매니페스트

```yaml
name: calculator
version: 1.0.0
description: Evaluate basic arithmetic expressions
provides_tools:
  - calculate
provides_hooks:
  - post_tool_call
```

`provides_tools`와 `provides_hooks`는 Doctor가 실제 등록과 비교하는 내용을 문서화한다. v2 매니페스트에는 `manifest_version: 2`, `api_version`, `license`, `homepage`, `tags`, 권고적 `requires_plugins`, 선언형 `python_dependencies`, `config_schema`를 추가할 수 있다. `manifest_version`이 없으면 v1이다. 알 수 없는 필드는 경고하지만 로드를 막지 않는다.

필수 자격 증명과 권한 있는 호스트 표면을 명시적으로 선언한다.

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

`requires_env` 값이 없으면 플러그인은 안전하게 비활성화된다. `python_dependencies`는 선언 전용이다. Hermes는 없는 패키지를 알리지만 자동 설치하지 않는다. 범위 제한 버전을 쓰고 제3자 의존성은 자체 pip extras로 패키징한다.

## 완전한 계산기 예제

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

스키마 설명은 모델이 보는 내용이므로 목적, 입력, 경계를 정확히 쓴다. 핸들러는 인수 사전을 받고 성공과 예상 실패에 JSON **문자열**을 반환하며 예상 예외를 잡고 추가적 호환성을 위해 `**kwargs`를 허용한다. 모델/사용자 입력에 `eval`을 쓰지 않는다. 이 예제는 작은 숫자 AST만 허용한다.

## 도구와 훅

`ctx.register_tool(name=..., toolset=..., schema=..., handler=...)`을 사용한다. `toolset`은 소유권 네임스페이스다. `check_fn`은 사용할 수 없는 선택 도구를 숨길 수 있다. 충돌 이름에는 `override=True`가 필요하고, 내장 도구를 재정의하는 비번들 플러그인에는 선언되고 부여된 `tools.override`도 필요하다.

`ctx.register_hook(event, callback)`을 사용한다. 이벤트 타이밍, 페이로드, 개인정보, 반환은 훅 카탈로그가 기준이다. 대부분의 훅은 관찰만 한다. `pre_tool_call`은 문서화된 차단/승인 지시문을 반환할 수 있고 `pre_llm_call`은 현재 턴 컨텍스트를 주입할 수 있다. 훅은 빨라야 하고, 비식별화·제한을 적용하며, 없는 선택 필드를 견디고 `**kwargs`를 허용해야 한다.

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

훅으로 작업을 조용히 승인하지 않는다. 하드 차단, 승인 바인딩, 최종 인가는 Hermes의 책임이다.

## 명령, 스킬, 데이터, 설정, 상태

슬래시 명령은 세션 내부의 `/name` 명령(CLI와 게이트웨이)이고, CLI 명령은 터미널 전용 `hermes name ...`이다.

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

내장 슬래시 이름이 충돌보다 우선한다. 슬래시 핸들러는 원시 문자열을 받고 비동기일 수 있으며 CLI 핸들러는 `argparse.Namespace`를 받는다. 명령에서 도구를 호출할 때는 부모 컨텍스트, 승인, 비식별화, 예산을 유지하는 `ctx.dispatch_tool(name, args)`를 쓴다.

`Path(__file__).parent / "data" / "file.json"` 상대 경로에서 변경 불가능한 배포 데이터를 읽는다. `skills/<name>/SKILL.md`는 `ctx.register_skill`로 등록한다. 스킬은 읽기 전용이며 `plugin-id:skill-name`으로 네임스페이스된다. 사용자에게 보이는 플러그인 설정에는 `ctx.get_config`/`ctx.set_config`만 쓴다. 런타임 상태에는 `ctx.state` 또는 문서화된 프로필별 데이터 루트를 사용한다. 설치 트리에 변경 가능한 상태나 시크릿을 쓰지 않는다.

## Doctor, 디버깅, 배포, 호환성

```bash
# Doctor는 Hermes의 탐색, import, register, 레지스트리 검사를 사용한다.
hermes plugins doctor . --ci

# 탐색 및 로드 실패를 진단한다.
HERMES_PLUGINS_DEBUG=1 hermes plugins list
hermes logs --level WARNING
```

Doctor는 탐색, 파싱, 네임스페이스 import, `register(ctx)`, 훅/도구 레지스트리, 잘못된 훅, 누락된 콜백 `**kwargs`, 선언/등록 불일치를 검사한다. 임시 `HERMES_HOME`을 사용하고 등록 상태를 복원하며 등록 중 직접 Python 소켓을 차단한다. 그래도 프로세스 내 코드를 import하므로 **샌드박스가 아니며**, 신뢰하는 코드에만 실행한다.

디렉터리 플러그인은 독립 저장소에 공개하고 가능하면 변경 불가능한 커밋으로 설치한다. pip 패키지는 엔트리 포인트를 사용한다.

```toml
[project.entry-points."hermes_agent.plugins"]
calculator = "hermes_calculator:register"

[project.entry-points."hermes_agent.plugin_capabilities"]
"calculator.tools.override" = "hermes_calculator:register"
```

지원 Hermes 버전, 요청 기능, 환경 변수, 데이터 보존, 네트워크 엔드포인트, 업그레이드를 문서화한다.

**호환성 사실:** 문서화된 `PluginContext` 메서드는 추가적으로 발전한다. 새 매개변수는 선택 사항/기본값이고 가급적 keyword-only다. 훅 페이로드는 키워드 필드를 추가한다. 알 수 없는 매니페스트 필드는 경고한다. 프로바이더 인터페이스는 기본 구현을 추가한다. 저장 상태/설정과 재개 가능한 데이터는 계속 읽을 수 있거나 명시적 마이그레이션이 있어야 한다.

문서화된 동작은 대체/마이그레이션 안내, 가장 이른 제거 릴리스를 명시한 프로세스당 한 번 경고, 최소 두 번의 후속 minor 릴리스 지원, 기존/대체 경로의 커버리지가 있을 때만 제거할 수 있다. **권장:** 문서화된 API를 사용하고 `**kwargs`를 허용하며 내부 import를 피하고 wire/영속 형식을 로컬에서 버전 관리하며 외부 호환성 fixture를 유지한다.
