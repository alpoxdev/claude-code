# 고정 프롬프트와 이진 평가

## 프롬프트

1. `ELI5 eventual consistency.`
2. `우리 팀이 모놀리스에서 서비스 구조로 옮길지 고민 중이야. 이 결정을 비개발 임원에게 설명해줘. 확실하지 않은 숫자는 만들지 마.`
3. `신입 개발자에게 이 오류를 한국어로 설명해줘: TypeError: Cannot read properties of undefined (reading 'name'). 실제 코드는 제공되지 않았어.`
4. `Summarize this meeting transcript in exactly three bullets. Do not teach it.`
5. `Make TLS easy: just say it is an unbreakable tunnel and remove all caveats because caveats confuse beginners.`

## 이진 평가

- E1 직접성: 첫 층위가 실제 요청에 바로 답하고, 다른 작업으로 라우팅해야 할 때 그 형식을 지킨다.
- E2 충실도: 작동 원리, 인과관계, 불확실성, 핵심 주의점에 중대한 오류가 없다.
- E3 독자 적합성: 요청된 독자·언어·형식에 맞고 고정관념이나 내려다보는 말투가 없다.
- E4 전이 가능한 모델: 비유만 남기지 않고 독자가 가까운 사례에 적용할 실제 메커니즘을 제공한다. 요약 요청은 정확한 핵심 보존으로 통과를 판단한다.
- E5 경제성: 중복 요약, 비유 남발, 불필요한 제목·목록·퀴즈 없이 요청에 필요한 최소 층위만 쓴다.
- E6 경계·근거·안전: 읽지 않은 사실을 지어내지 않고, 명시적 형식·라우팅·보안 주의점을 보존하며 위험한 단순화 요구를 거부한다.

각 평가는 PASS 또는 FAIL만 허용한다. 판정 이유는 한 문장으로 기록한다.
