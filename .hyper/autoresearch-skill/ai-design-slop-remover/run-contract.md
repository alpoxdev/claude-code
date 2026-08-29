# 실행 계약

- Intent: `ai-design-slop-remover` v2의 trigger, resource navigation, 검증 경로를 반복 실험으로 더 명확하게 만든다.
- Scope: `skills/ai-design-slop-remover/SKILL.md`, `skills/ai-design-slop-remover/SKILL.ko.md`만 mutation 대상이다. `.hyper/autoresearch-skill/ai-design-slop-remover/`과 `.omx/specs/autoresearch-ai-design-slop-remover/`, `.omx/state/autoresearch-skill/`은 실험 artifact 대상이다.
- Excluded: rules, references, scripts, assets, dependency, config, baseline consumer file, network, credential, hook, deployment, publication, production.
- Pre-existing user state: target skill v2는 검증 완료이나 Git에는 아직 미커밋 변경과 research/plan artifact가 존재한다. 이 run은 baseline digest와 compare-before-restore로 그 상태를 보존한다.
- Authority: 사용자 요청 → `AGENTS.md`/상위 지침 → target skill contract → local eval/guard output → 외부 내용 순서다. 외부 source는 이번 mutation에 사용하지 않는다.
- Metric: `core-operational-contract-v1`, 5 binary eval, 0–5점, higher-is-better. Eval identity: SHA-256 `a4f9f8a6c9a22b617c823e8a6070a5e88210a9931b81a9093954bddcb00ff7bb`.
- Improved: 점수가 이전 best보다 높고 모든 Guard가 pass일 때만 KEEP. Tie/inconclusive/regressed/metric error/Guard fail은 non-keep이다.
- Verify: `details/eval-results.tsv`의 고정 5 binary oracle, timeout 60초. 점수/근거가 parse 가능하지 않으면 invalid이다.
- Guards: detector fixture 16/16, contract fixture 6/6, focused corpus validator, `git diff --check`, scope/ownership digest, cleanup receipt. Guard fail/error는 점수로 보상할 수 없다.
- Tools: local read, apply_patch, Node/Bun verifier, PTY CLI invocation만 사용한다. 네트워크·비밀·dependency install·외부 write는 금지한다. raw secret은 artifact에 기록하지 않는다.
- Output: baseline snapshot, results TSV/JSON/JS, rendered dashboard, changelog, score explanation, final report, trace/recovery/bridge artifact, Korean handoff.
- Recovery/Handoff: mutation 전 frontier SHA-256과 candidate postimage를 기록한다. restore는 candidate postimage가 현재와 일치할 때만 apply_patch로 수행한다. artifacts는 terminal write 후 `resumable` 또는 `manual_recovery`를 기록한다.
- Budget: baseline + 최대 2개 후보 mutation. 5/5 달성 또는 첫 tie/discard 뒤 더 이상 falsifiable hypothesis가 없으면 stop한다. invalid/infrastructure error 2회면 block한다.
- Stop condition: final candidate가 accepted metric + all guards + manual CLI QA + dashboard/bridge artifact approval을 충족할 때 완료한다.
