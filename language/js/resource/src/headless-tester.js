import CdpSession from "./chrome-devtools-protocol-session.js";
import * as Promises from "./promises.js";

/**
* Headless 브라우저 테스팅을 위한 래퍼 클래스
*/
export default class HeadlessTester {
	/**
	 * @constructor
	 * @param {CdpSession} cdpSession
	 * @param {string} hostName
	 * @param {string} protocol
	*/
	constructor(cdpSession, hostName, protocol) {

		if (cdpSession === undefined || cdpSession === null || !CdpSession.prototype.isPrototypeOf(cdpSession)) {
			throw new Error("[IllegalArgument] arg[0] should be subtype of CdpSession.", {cause: cdpSession});
		}
		this._session = cdpSession;
		if (hostName.endsWith("/")) {
			hostName = hostName.substring(0, hostName.length - 1);
		}
		if (hostName.includes("://")) {
			var [protocol_split, host_split] = hostName.split("://");
			this._hostName = host_split;
			this._protocol=protocol_split;
		} else {
			this._hostName = hostName;
			this._protocol = protocol;
		}

		if (!this._hostName || !this._protocol) {
			throw new Error("[IllegalArgument] hostName and protocol is required.", {cause: {hostName, protocol}});
		};
	}

	/**
	 * 새로운 HeadlessTester 인스턴스를 생성하는 팩토리 메서드
	 * @param {string} cdpWebSocketUrl - CDP WebSocket URL
	 * @param {string} hostName - 대상 호스트
	 * @returns {Promise<HeadlessTester>}
	*/
	static create (cdpWebSocketUrl, hostName) {
		var session = new CdpSession(cdpWebSocketUrl);
		var sessionOpenPromise = session.open();
		return Promises.timeoutPromise(sessionOpenPromise, () => session._ws.close()).then(s => {
			return new HeadlessTester(s, hostName, "https");
		});
	}

	/**
	 * 리소스 경로를 포함한 전체 URL을 구성합니다.
	 * @private
	 * @param {string} [resourcePath=""]
	 * @returns {string} 완성된 URL
	*/
	_constructUrl (resourcePath = "") {
		if (resourcePath.includes("://")) {
			return resourcePath;
		}
		return this._protocol+"://" + this._hostName+(resourcePath.startsWith("/")? resourcePath:"/"+resourcePath);
	}

	/**
	 * 특정 URL로 페이지를 이동하고 로드가 완료될 때까지 기다립니다.
	 * @param {string} url - 이동할 경로 또는 URL
	 * @returns {Promise<void>}
	*/
	navigate (url) {
		url = this._constructUrl(url);
		this._session.sendMessage("Page.navigate", {url});
		var loadEventPromise = this.waitForEvent(["Page.loadEventFired", "Page.frameStoppedLoading"]);
		var navigatePromise = Promises.unwrappedPromise();
		var unsubscribePromise = this._session.addEventHandler(
			"Network.responseReceived",
			params => {
				var {status} = params.response;
				if(status >= 200 && status < 400) {
					navigatePromise.resolve(params.response);
				} else {
					navigatePromise.reject(new Error(`status[${status}]:::`, {cause:params.response}));
				}
				return false;
			},
			params => {
				var response_url = params.response.url;
				return (url === response_url || url === response_url.substring(0, response_url.length - 1));
			}
		);

		var pp = Promises.timeoutPromise(
			navigatePromise.promise,
			() => {
				unsubscribePromise.then(unsubscribe => unsubscribe());
			}
		);
		return Promise.all([pp, loadEventPromise])
		.then(() => console.log("Page navigated:::"+url));
	}

	/**
	 * 특정 이벤트(들)가 발생할 때까지 대기합니다.
	 * @param {string|string[]} eventNames - 감시할 이벤트 명 또는 배열
	 * @param {number} [timeoutMs] - 제한 시간
	 * @returns {Promise<any[]>} 이벤트 결과 배열
	*/
	waitForEvent(eventNames, timeoutMs) {
		var _events = (Array.isArray(eventNames)? eventNames: [eventNames]);
		var listeners = _events
			.map(eventName => {
				var {resolve, promise} = Promises.unwrappedPromise();
				var unsubscribePromise = this._session.addEventHandler(
					eventName,
					(data) => {
						resolve(data);
						return false;
					}
				);
				return Promises.timeoutPromise(
					promise,
					() => {
						unsubscribePromise.then(unsubscribe =>unsubscribe());
					},
					timeoutMs
				)
			});
		return Promise.all(listeners);
	}

	/**
	 * 브라우저 컨텍스트 내에서 스크립트를 실행합니다.
	 * @param {string|Function} script - 실행할 스크립트 문자열 또는 함수
	 * @param {boolean} awaitPromise - 실행할 스크립트가 promise인 경우 결과 대기 여부
	 * @returns {Promise<Object>} 실행 결과
	*/
	evaluate(script, awaitPromise) {
		script = (typeof script === "function") ? `(${script.toString()})()` : `${script}`;
		script = `{\n${script}\n}`;
		return this._session.sendMessage(
			"Runtime.evaluate",
			{
				expression: script,
				awaitPromise: (awaitPromise === true)
			}
		);
	}

	evaluateWithBinding (script) {
		var bindingId = crypto.randomUUID();
		script = (typeof script === "function")
			? `
				bindingResponse.result = await (${script.toString()})(__bindingId, __binding);
				__binding(JSON.stringify(bindingResponse));
			`
			: `
				${script}
				__binding(JSON.stringify(bindingResponse));
			`
		;
		this.evaluate(`(async () => {
			const __bindingId = "${bindingId}";
			const __bindingName = "${this._session.bindingName}";
			const __binding = globalThis[__bindingName];
			var bindingResponse = { bindingId: __bindingId };
			try {
				${script};
			} catch (err) {
				bindingResponse.error = err.stack
				__binding(JSON.stringify(bindingResponse));
			}
			return __bindingId;
		})()`);

		var {resolve, reject, promise} = Promises.unwrappedPromise();
		var unsubscribePromise = this._session.addEventHandler(
			"Runtime.bindingCalled",
			params => {
				var parsedPayload = JSON.parse(params.payload);
				// console.log("parsedPayload:::", parsedPayload); // debugging
				if (parsedPayload.error) {
					reject (new Error(parsedPayload.error));
				} else {
					resolve(parsedPayload);
				}
				return false;	// single use handler
			},
			params => {
				try {
					var parsedPayload = JSON.parse(params.payload);
					// console.log("parsedPayload:::", parsedPayload); // debugging
					return (bindingId === parsedPayload.bindingId);
				} catch {
						return false;
				}
			}
		);

		return Promises.timeoutPromise (
			promise,
			() => {
				unsubscribePromise.then(unsubscribe => unsubscribe());
			}
		)
	}


	/**
	 * 도메인을 활성화/비활성화합니다.
	 * @param {string} domainName
	 * @param {boolean} bool
	*/
	enableDomain (domainName, bool) {
		return this._session.enableDomain(domainName, bool);
	}
}
