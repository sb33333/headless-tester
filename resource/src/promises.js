
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Promise에 타임아웃 기능을 추가합니다.
 * @param {Promise} promise - 대상 Promise
 * @param {Function} [timeoutCallback] - 타임아웃 시 실행할 콜백
 * @param {number} [timeoutMs=5000] - 타임아웃 시간
 * @returns {Promise}
 */
const timeoutPromise = (promise, timeoutCallback, timeoutMs = DEFAULT_TIMEOUT_MS) => {
	var timer;
	var stack = new Error(`timeout:::${timeoutMs}`);
	var timeoutPromise = new Promise((timeout_res, timeout_rej) => {
		timer = setTimeout(() => {
			if (timeoutCallback && typeof timeoutCallback === "function") timeoutCallback();
			timeout_rej(stack);
		}, timeoutMs);
		promise
			.then(() => {
				clearTimeout(timer);
				timeout_res("");
			})
			.catch(() => {
				clearTimeout(timer);
				timeout_res("");
			});
	});
	return Promise.race([promise, timeoutPromise]);
}

/**
 * 외부에서 resolve/reject를 제어할 수 있는 "Unwrapped" Promise 객체를 생성합니다.
 * @returns {Object} { promise, resolve, reject, controller }
 */
const unwrappedPromise = () => {
	const unwrapped = {};
	const abortController = new AbortController();
	const signal = abortController.signal;
	var handler;
	var p = new Promise((resolve, reject) => {
		handler = () => {
			reject(new Error("Aborted:::"));
		};
		unwrapped.resolve = resolve;
		unwrapped.reject = reject;
		signal.addEventListener("abort", handler, { once: true });
	});
	unwrapped.promise = p.finally(result => {
		signal.removeEventListener("abort", handler);
		return result;
	});
	unwrapped.controller = abortController;
	return unwrapped;
}
/*
const unwrappedPromise = () => {
const unwrapped = Promise.withResolvers(); // ECMA 2024
const abortController = new AbortController();
const signal = abortController.signal;
var handler = () => {
unwrapped.reject(new Error("Aborted:::"));
};
signal.addEventListener("abort", handler, {once: true});
unwrapped.promise = unwrapped.promise.finally(result => {
signal.removeEventListener("abort", handler);
return result;
});
unwrapped.controller = abortController;
return unwrapped;
}
*/
export { DEFAULT_TIMEOUT_MS, timeoutPromise, unwrappedPromise };