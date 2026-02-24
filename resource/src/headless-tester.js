import openSession from "./chrome-devtools-protocol-session.js";
import * as Promises from "./promises.js";

/**
 * Headless 브라우저 테스팅을 위한 래퍼 클래스
 */
class HeadlessTester {
	/**
	 * @constructor
	 * @param {ChromeDevtoolsProtocolSession} chromeDevtoolsProtocolSession
	 * @param {string} hostName
	 */
	constructor(chromeDevtoolsProtocolSession, hostName) {
		this._session = chromeDevtoolsProtocolSession;
		if (hostName.endsWith("/")) {
			hostName = hostName.substring(0, hostName.length - 1);
		}
		if (hostName.includes("://")) {
			var [protocol, host] = hostName.split("://");
			this._hostName = host;
			this._protocol=protocol;
		} else {
			this._hostName = hostName;
			if(hostName.includes("localhost")) {
				this._protocol = "http";
			} else {
				this._protocol="https";
			}
		}
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
	 * 새로운 HeadlessTester 인스턴스를 생성하는 팩토리 메서드
	 * @param {string} cdpWebSocketUrl - CDP WebSocket URL
	 * @param {string} hostName - 대상 호스트
	 * @returns {Promise<HeadlessTester>}
	 */
	static async create (cdpWebSocketUrl, hostName) {
		var session = await openSession(cdpWebSocketUrl);
		return new HeadlessTester(session, hostName);
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
	 * @param {...(string|Function)} script - 실행할 스크립트 문자열 또는 함수
	 * @returns {Promise<Object>} 실행 결과
	 */
	evaluate(...script) {
		var concat = script.map(s => {
			var str = (typeof s ==="function")?s.toString():s;
			return (str.endsWith(";")) ? str : str + ";";
		}).join("\n");
		return this._session.sendMessage("Runtime.evaluate", {expression:concat});
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

export {HeadlessTester};