/**
 * @file chrome-devtools-protocol-session.js
 * @description Chrome DevTools Protocol(CDP)과의 WebSocket 연결을 설정하고 관리합니다.
 * @link https://chromedevtools.github.io/devtools-protocol/
 * Chrome Devtools Protocol 세션을 관리하는 모듈입니다.
 */
import { EventJobQueue } from "./job-queue.js";
import * as Promises from "./promises.js";

/**
 * Chrome Devtools Protocol 도메인
 * @enum {string}
 */
const DOMAIN = {
	Page: "Page",
	Runtime: "Runtime",
	Network: "Network",

	Browser: "Browser",
	Debugger: "Debugger",
	DOM: "DOM",
	DOMDebugger: "DOMDebugger",
	Emulation: "Emulation",
	Fetch: "Fetch",
	Input: "Input",
	IO: "IO",
	Log: "Log",
	Performance: "Performance",
	Profiler:"Profiler",
	Security: "Security",
	Target: "Target",
	Tracing: "Tracing"
}

/**
 * CDP WebSocket 세션을 열고 인터페이스를 반환합니다.
 * @param {string} wsUrl - 연결할 WebSocket URL
 * @returns {Promise<Object>} 세션 제어 메서드들을 포함한 객체
 */
var openSession = function (wsUrl) {
	const BINDING = "notifyCDP";

	var sessionPromise = new Promise((session_resolve, session_reject) => {
		var ws;
		try {
			ws = new WebSocket(wsUrl);
		} catch (error) {
			session_reject(error);
		};

		var __sequence__ = 0;

		/**
		 * CDP 명령어를 전송합니다.
		 * @param {string} method - CDP 메서드 명 (예: 'Page.navigate')
		 * @param {Object} params - 메서드에 전달할 파라미터
		 * @returns {Promise} 응답 결과에 대한 Promise
		 */
		var _sendMessage = (method, params) => {
			var payload = {
				id: __sequence__++,
				method,
				params
			};
			// console.log(payload); // debugging
			ws.send(JSON.stringify(payload));
			return _pendingRequests.add(payload);
		};

		/**
		 * 특정 도메인의 활성화 여부를 설정합니다.
		 * @param {keyof DOMAIN} domainName - 활성화할 도메인 키
		 * @param {boolean} bool - 활성화 여부
		 */
		var _enableDomain = (domainName, bool) => {
			if (!DOMAIN[domainName]) throw new Error("illegal domain name");
			return _sendMessage(`${DOMAIN[domainName]}.${bool ? "enable" : "disable"}`, {});
		};

		/**
		 * 런타임 바인딩을 추가합니다.
		 */
		var _bind = () => _sendMessage("Runtime.addBinding", { name: BINDING });

		/**
		 * 대기 중인 요청을 관리하는 객체
		 */
		var _pendingRequests = (() => {
			const _requests = new Map();
			/**
			 * 요청을 대기 큐에 추가하고 타임아웃 처리를 수행합니다.
			 * @param {Object} request - 전송된 요청 페이로드
			 * @param {number} [timeoutMs] - 타임아웃 시간
			 */
			var add = (request, timeoutMs) => {
				var { id } = request;
				var { resolve, reject, promise } = Promises.unwrappedPromise();
				var pendingRequest = {};
				pendingRequest.id = id;
				pendingRequest.sent = window.performance.now();
				pendingRequest.resolve = resolve;
				pendingRequest.reject = reject;
				_requests.set(id, pendingRequest);
				return Promises.timeoutPromise(promise, () => _requests.delete(id), timeoutMs);
			};

			/**
			 * 수신된 응답을 바탕으로 대기 중인 요청을 해결(resolve)하거나 거부(reject)합니다.
			 * @param {Object} response - WebSocket으로 수신된 데이터
			 */
			var resolveRequest = (response) => {
				var { id, result } = response;
				var pendingRequest = _requests.get(id);
				if (!pendingRequest) {
					//
					return;
				}
				if (result.exceptionDetails) {
					pendingRequest.reject(new Error(`[REQUEST ID:::${id}]` + result.result.description, { cause: { exceptionDetails: result.exceptionDetails } }));
				} else {
					pendingRequest.resolve(result);
				}
				_requests.delete(id);
			};
			return {
				// _requests, // debugging
				add,
				resolveRequest
			}
		})();

		var _eventJobQueue = new EventJobQueue();

		ws.onopen = () => {
			_enableDomain(DOMAIN.Page, true);
			_enableDomain(DOMAIN.Network, true);
			_bind();
			_sendMessage("Page.addScriptToEvaluateOnNewDocument", {
				source: `
					console.debug("evaluateOnNewDocument");
					window.waitForCondition = function(timeoutLimit, predicateFunction) {
						var start = window.performance.now();
						return new Promise((res, rej) => {
							(function recursiveCall() {
								console.debug("entry");
								try {
									if((window.performance.now() - start) > timeoutLimit) rej(new Error("[BINDING ERROR]:::waitForCondition timeout("+timeoutLimit+")"));
									if(predicateFunction()) {
										console.debug("resolve");
										res("resolve");
										return;
									}
								} catch (err) {
									console.debug("reject");
									rej( new Error("[BINDING ERROR]:::"+err.stack) );
									return;
								}
								requestAnimationFrame(recursiveCall);
							})();
						});
					}
				`
			});

			// eventHandler 추가
			_eventJobQueue.subscribe(
				"Page.frameNavigated",
				() => {
					// Page.frameNavigated 될 때 binding 실행
					_bind();
					return true;
				}
			);
			_eventJobQueue.subscribe(
				"Page.javascriptDialogOpening",
				(params) => {
					//javascript 대화상자가 열렸을 때 실행.
					// console로 대화상자 내용 출력 후 자동으로 대화상자 닫기
					var { message, type } = params;
					console.log(`[${type.toUpperCase()}]${message}`);
					_sendMessage("Page.handleJavaScriptDialog", { accept: true });
					return true;
				}
			);
			session_resolve(
				{
					sendMessage: _sendMessage,
					enableDomain: _enableDomain,
					close: () => { ws.close(); },
					/**
					 * @param {string} eventName
					 * @param {Function} handler
					 * @param {Function} [condition]
					 */
					addEventHandler: (eventName, handlerFunction, condition) => {
						return _eventJobQueue.subscribe(eventName, handlerFunction, condition);
					},
					DOMAIN,
					BINDING,
				}
			);
		}
		ws.onclose = () => {
			console.info("websocket session closed.");
		}
		ws.onmessage = async msg => {
			var data = JSON.parse(msg.data);
			console.debug(msg, data);
			var { id } = data;
			if (id !== undefined && id !== null) {
				_pendingRequests.resolveRequest(data);
			} else {
				await _eventJobQueue.handle(data);
			}
		};
	});
	return sessionPromise;
}

export default openSession;