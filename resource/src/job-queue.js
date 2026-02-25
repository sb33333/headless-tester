/** 
 * JobQueue 에 담길 작업 단위
 * @class
 * @property {string} type 작업 유형
 * @property {*} payload 작업 데이터
*/
class Job {
	constructor(type, payload) {
		this._type = type;
		this._payload = payload;
	}

	get type () {
		return this._type;
	}
	get payload () {
		return this._payload;
	}
}

/**
 * 작업을 순서대로 처리하기 위한 queue.
 * @class
 * @abstract
 * 
*/
class JobQueue {
	/**
 * JobQueue에서 처리할 수 있는 작업 유형을 반환.
 * @abstract
 * @returns {Object} 작업 유형을 property로 갖는 object 반환
*/
get type () {
		throw new Error("Not implemented");
	}
	static get THRESHOLD () {
		return 1000;
	}

/**
 * @constructor
*/
	constructor() {
		this._handlers = {};
		this._queue = [];
		this._isProcessing = false;
	}

	/**
	 * 하위 클래스에서 구현해야 할 실제 작업 실행 로직
	 * @abstract
	 * @param {Job} job
	 */
	async _executeJob (job) {
		throw new Error("Not implemented::_executeJob");
	}

	/**
	 * 큐에 여유 공간이 생길 때까지 대기
	 */
	_waitForSpace () {
		return new Promise(resolve => {
			const check = () => {
				if (this._queue.length < JobQueue.THRESHOLD) resolve();
				else setTimeout(check, 10);
			}
			check();
		});
	}

	/**
	 * 작업을 큐에 추가
	 * @param {string} type - 작업 유형
	 * @param {Object} payload - 작업에 대한 데이터
	 */
	async enqueue (type, payload) {
		if (this._queue.length > JobQueue.THRESHOLD) {
			await this._waitForSpace();
		}
		this._queue.push({ type, payload });
		await this._processQueue();
	};

	/** 큐에 쌓인 작업을 순차적으로 처리 */
	async _processQueue () {
		if (this._isProcessing) return;
		this._isProcessing = true;
		try {
			while (this._queue.length > 0) {
				const job = this._queue.shift();
				await this._executeJob(job);
			}
		} catch (err) {
			throw new Error("[EXECUTION FAILED]" + err.message, { cause: job });
		} finally {
			this._isProcessing = false;
		}
	}

	

}


/**
 * EventJobQueue에서 처리하는 작업 유형
 * @enum {string}
 */
const EventJobType = Object.freeze({
	SUBSCRIBE: "SUBSCRIBE",
	UNSUBSCRIBE: "UNSUBSCRIBE",
	HANDLE: "HANDLE",
});


/**
 * CDP 이벤트를 처리하기 위한 큐
 * @extends
*/
class EventJobQueue extends JobQueue {
    get type () {
        return EventJobType;
    }
	async _executeJob (job) {
		const { type, payload } = job;
		switch (type) {
			case this.type.SUBSCRIBE: {
				const { eventName, handler } = payload;
				if (!this._handlers[eventName]) this._handlers[eventName] = [];
				this._handlers[eventName].push(handler);
				break;
			}
			case this.type.UNSUBSCRIBE: {
				const { eventName, handler } = payload;
				if (this._handlers[eventName]) {
					this._handlers[eventName] = this._handlers[eventName].filter(h => h !== handler);
				}
				break;
			}
			case this.type.HANDLE: {
				const { method, params } = payload;
				const targetHandlers = this._handlers[method];
				if (!targetHandlers || targetHandlers.length === 0) break;
				for (const handler of [...targetHandlers]) {
					if (handler.condition(params)) {
						const retain = handler.handle(params);
						if (retain !== true) {
							this._handlers[method] = this._handlers[method].filter(h => h !== handler);
						}
					}
				}
				break;
			}
		}
	}

/**
	 * 이벤트 구독을 등록합니다.
	 * @param {string} eventName
	 * @param {Function} handlerFunction
	 * @param {Function} [condition] - 처리 조건 함수
	 * @returns {Promise<Function>} 구독 해제(unsubscribe) 함수
	 */
	async subscribe (eventName, handlerFunction, condition = () => true) {
		const handler = {
			handle: (params) => handlerFunction(params),
			condition: (params) => condition(params),
		};
		await this.enqueue(JobQueue.TYPE.SUBSCRIBE, { eventName, handler });
		return () => {
			this.enqueue(JobQueue.TYPE.UNSUBSCRIBE, { eventName, handler });
		}
	}

	/** 수신된 데이터를 큐에 넣고 핸들링 */
	async handle(data) {
		await this.enqueue(JobQueue.TYPE.HANDLE, data);
	}

}

export {JobQueue, EventJobQueue};