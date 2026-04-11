import {Job, JobQueue} from "./job-queue.js";

/**
 * 이벤트를 구독하고 처리하는 class
 * @class
 * @abstract
*/
export class EventHandler {

	/**
	 * 이벤트 발생 시 처리할 수 있도록 이벤트 핸들러를 등록합니다.
	 * @param {string} eventName
	 * @param {Function: boolean} handlerFunction
	 * @param {Function: boolean} condition
	 */
	async subscribe (eventName, handlerFunction, condition) {
		throw new Error("Not implemented");
	}

	/**
	 * 이벤트를 처리합니다.
	 * @param {*} data - 이벤트 데이터.
	*/
	async handle (data) {
		throw new Error("Not implemented");
	}
}

/**
 * 기본 EventHandler 구현체
 * @class
 * @extends EventHandler
*/
export class DefaultEventHandler extends EventHandler {

	/**
	 * 생성자
	 * @param {JobQueue} jobQueue
	*/
	constructor (jobQueue) {
		super();
		if (!JobQueue.prototype.isPrototypeOf(jobQueue))
			throw new Error("jobQueue is not an instance of JobQueue");
		this._jobQueue = jobQueue;
		this._handlers = {};
	}

	static create () {
		var jobQueue = new JobQueue();
		return new DefaultEventHandler(jobQueue);
	}

	/**
	 * 이벤트 발생 시 처리할 수 있도록 이벤트 핸들러를 등록합니다.
	 * @param {string} eventName
	 * @param {Function: boolean} handlerFunction
	 * @param {Function: boolean} [condition = () => true] - 핸들러가 실행될 조건을 정의하는 함수. 기본값은 항상 true를 반환하는 함수입니다.
	 * @returns
	*/
	async subscribe (eventName, handlerFunction, condition = () => true) {
		if (!this._handlers[eventName]) this._handlers[eventName] = [];
		const handler = {
			handle: (params) => handlerFunction(params),
			condition: (params) => condition(params),
		};

		var runnable = () => {
			this._handlers[eventName].push(handler);
		}
		await this._jobQueue.enqueue(new Job(runnable));

		var unsubscribeRunnable = () => {
			this._handlers[eventName] = this._handlers[eventName].filter(h => h !== handler);
		}
		return () =>  this._jobQueue.enqueue(new Job(unsubscribeRunnable));
	}

	/**
	 * 이벤트를 처리합니다.
	 * @param {*} data - 이벤트 데이터. 일반적으로 { method: string, params: any } 형태입니다.
	*/
	async handle (data) {
		const {method, params} = data;
		var runnable = () => {
			const targetHandlers = this._handlers[method];
			if (!targetHandlers || targetHandlers.length === 0) return;
			for (const handler of [...targetHandlers]) {
				if (handler.condition(params)) {
					const retain = handler.handle(params);
					if (retain !== true) {
						this._handlers[method] = this._handlers[method].filter(h => h !== handler);
					}
				}
			}
		}
		await this._jobQueue.enqueue(new Job(runnable));
	}
}