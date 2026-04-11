/**
 * @file chrome-devtools-protocol-session.js
 * @description Chrome DevTools Protocol(CDP)과의 WebSocket 연결을 설정하고 관리합니다.
 * @link https://chromedevtools.github.io/devtools-protocol/
 * Chrome Devtools Protocol 세션을 관리하는 모듈입니다.
*/
import * as EventHandlers from "./event-handler.js";
import * as Promises from "./promises.js";

/**
 * Chrome Devtools Protocol 도메인
 * @enum {string}
*/
const DOMAIN = Object.freeze({
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
});

const BINDING = "notifyCDP";

/**
 * CDP WebSocket 세션을 열고 인터페이스를 반환합니다.
 * @param {string} wsUrl - 연결할 WebSocket URL
 * @returns {Promise<Object>} 세션 제어 메서드들을 포함한 객체
*/
export default class CdpSession {
	/**
	 * @constructor
	 * @param {string} wsUrl
	 */
	constructor (wsUrl) {
		this._wsUrl = wsUrl;
		this._ws = null;
		this._sequence = 0;
		this._requests = new Map();
		this._eventHandler = EventHandlers.DefaultEventHandler.create();
		this._unsubscribes = [];
	}

	/**
	 * 요청을 대기 큐에 추가하고 타임아웃 처리를 수행합니다.
	 * @param {Object} request - 전송된 요청 페이로드
	 * @param {number} [timeoutMs] - 타임아웃 시간
	*/
	_addRequest (request, timeoutMs) {
		var {id} = request;
		var {resolve, reject, promise} = Promises.unwrappedPromise();
		var pendingRequest = {
			id,
			sent: window.performance.now(),
			resolve,
			reject
		};
		this._requests.set(id, pendingRequest);
		return Promises.timeoutPromise(promise, () => this._requests.delete(id), timeoutMs);
	}

	/**
	 * 수신된 응답을 바탕으로 대기 중인 요청을 해결(resolve)하거나 거부(reject)합니다.
	 * @param {Object} response - WebSocket으로 수신된 데이터
	*/
	_resolveRequest(response) {
		var {id, result} = response;
		var pendingRequest = this._requests.get(id);
		if (!pendingRequest) return;
		if (result.exceptionDetails) {
			pendingRequest.reject(new Error(`[REQUEST_ID:::${id}]${result.result.description}`, {cause:{exceptionDetails:result.exceptionDetails}}));
		} else {
			//console.log(`id:::${id}\nresponse:::{$response}`); // debugging
			pendingRequest.resolve(result);
		}
		this._requests.delete(id);
	}

	open() {
		return new Promise((session_resolve, session_reject) => {
			var that = this;
			try {
				that._ws = new WebSocket(that._wsUrl);
			} catch (error) {
				session_reject(error);
			}

			that._ws.onclose = () => {
				that._unsubscribes
					.forEach(promise => promise.then(unsubscribe => {
						unsubscribe();
					}));
				console.info("websocket session closed");
			}
			that._ws.onopen = () => {
				that.enableDomain(DOMAIN.Page, true);
				that.enableDomain(DOMAIN.Network, true);
				that._bind();
				that.sendMessage("Page.addScriptToEvaluateOnNewDocument", {
					source:
					`
						console.log("evaluateOnNewDocument");

						window.waitForCondition = function (timeoutLimit, predicateFunction) {
							var start = window.performance.now();
							return new Promise((res, rej) => {
								(function recursiveCall() {
									console.debug("entry");
									try {
										if ((window.performance.now() - start) > timeoutLimit) {
											rej(new Error("[BINDING ERROR]:::waitForCondition timeout("+timeoutLimit+")"));
											return;
										}
										if (predicateFunction()) {
											console.debug("resolve");
											res("resolve");
											return;
										}
									} catch(err) {
										console.debug("reject");
										rej ( new Error("[BINDING ERROR]:::" + err.stack) );
										return;
									}
									requestAnimationFrame(recursiveCall);
								}) ();
							});
						}
					`
				});
				var unsubscribe1 = that._eventHandler.subscribe(
					"Page.frameNavigated",
					() => {
						// Page.frameNavigated 될 때 binding 실행
						that._bind();
						return true;
					}
				);
				var unsubscribe2 =that._eventHandler.subscribe(
					"Page.javascriptDialogOpening",
					(params) => {
						// javascript 대화상자가 열렸을 때 실행
						// console로 대화상자 내용 출력 후 자동으로 대화상자 닫기
						var {message, type} = params;
						console.log(`[${type.toUpperCase()}]${message}`);
						that.sendMessage("Page.handleJavaScriptDialog", {accept: true});
						return true;
					}
				);
				that._unsubscribes.push(unsubscribe1, unsubscribe2);
				session_resolve(that);
			}
			that._ws.onmessage = async msg => {
				var data = JSON.parse(msg.data);
				// console.debug("ws.onmessage:::" + msg, data); // debugging
				var {id} = data;
				if (id !== undefined && id !== null) {
					that._resolveRequest(data);
				} else {
					await that._eventHandler.handle(data);
				}
			}
		});
	}

	close () {
		this._ws.close();
	}

	closeBrowser () {
		return this._session.sendMessage("Browser.close", {});
	}

	_checkSessionStatus() {
		if (!this.isOpen) throw new Error("websocket is not opened");
	}

	/**
	 * 런타임 바인딩을 추가합니다.
	*/
	_bind () {
		this._checkSessionStatus();
		return this.sendMessage("Runtime.addBinding", {name: BINDING});
	}
	get bindingName() {
		return BINDING;
	}
	get isOpen () {
		return (this._ws && this._ws?.readyState === WebSocket.OPEN);
	}

	/**
	 * 특정 도메인의 활성화 여부를 설정합니다.
	 * @param {keyof DOMAIN} domainName - 활성화할 도메인 키
	 * @param {boolean} bool - 활성화 여부
	*/
	enableDomain (domainName, bool) {
		this._checkSessionStatus();
		if (!DOMAIN[domainName]) throw new Error("illegal domain Name");
		return this.sendMessage(`${DOMAIN[domainName]}.${bool ? "enable" : "disable"}`, {});
	}

	/**
	 * CDP 명령어를 전송합니다.
	 * @param {string} method - CDP 메서드 명 (예: 'Page.navigate')
	 * @param {Object} params - 메서드에 전달할 파라미터
	 * @returns {Promise} 응답 결과에 대한 Promise
	*/
	sendMessage (method, params) {
		this._checkSessionStatus();
		var payload = {
			id: this._sequence++,
			method,
			params
		};
		// console.log(payload); // debugging
		this._ws.send(JSON.stringify(payload));
		return this._addRequest(payload);
	}
	addEventHandler (eventName, handlerFunction, condition) {
		return this._eventHandler.subscribe(eventName, handlerFunction, condition);
	}
}