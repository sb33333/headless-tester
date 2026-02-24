# headless-tester

Chrome DevTools Protocol(CDP)을 활용하여 브라우저를 직접 제어하고 자동화된 테스트를 수행할 수 있는 테스트 도구입니다.

CDP 문서 https://chromedevtools.github.io/

## 🚀 주요 특징

- **CDP Session Management**: WebSocket을 통한 브라우저 직접 제어 및 도메인(Page, Runtime, Network) 관리.
- **Event Job Queue**: 이벤트를 순차적으로 처리하는 큐 사용.

## 📂 파일 구조

```text
(root)
├── 📂 exec                       # 샘플 실행을 위한 환경 및 실행 파일
│   ├── resource-server.jar       # 웹 서버 실행 파일 (Java 17 필요)
│   ├── run-web-server.bat        # 웹 서버 구동 스크립트 (localhost:9999)
│   └── run-headless-browser.bat  # 브라우저를 원격 디버깅 모드로 실행하는 스크립트
├── 📂 resource                   # 리소스 폴더
│   ├── 📂 example                # 테스트를 위한 예제 HTML/JS 파일
│   │   ├── index.html
│   │   └── index.js
│   └── 📂 src
│       ├── chrome-devtools-protocol-session.js
│       ├── headless-tester.js
│       ├── job-queue.js
│       └── promises.js
└── README.md
```


## 🛠 사용 방법

### 1. 인스턴스 생성
`HeadlessTester.create` 메서드를 사용하여 브라우저 디버깅 URL에 연결합니다.

```javascript
import { HeadlessTester } from "./headless-tester.js";

const tester = await HeadlessTester.create(
    "ws://localhost:9222/devtools/page/...",
    "[https://example.com](https://example.com)"
);
```


## 🏃 샘플 실행 방법

1) exec 폴더로 이동합니다.
2) run-web-server.bat 파일을 실행합니다.
3) resource-server.jar가 구동되며 9999 포트로 웹 서버가 시작됩니다.
4) run-headless-browser.bat 파일을 실행합니다. 브라우저가 headless 모드로 실행됩니다.
   - CDP websocket 기본 포트 9222
   - bat 파일에서 '--headless' 옵션을 삭제하고 실행하면 테스트 과정을 확인할 수 있습니다.
6) curl http://localhost:9222/json/list 요청 응답에 있는 "webSocketDebuggerUrl" 주소를 확인합니다.
7) 샘플 실행 코드에 WebSocket 연결 주소를 입력합니다.
8) 샘플 파일을 브라우저에서 실행합니다. 
   - 주소: http://localhost:9999/example/index.html
9) 화면에 출력되는 HTML 리포트와 브라우저 콘솔(F12) 로그를 확인합니다.


