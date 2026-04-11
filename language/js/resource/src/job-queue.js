/**
 * JobQueue 에 담길 작업 단위
 * @class
 * @property {Function} _runnable - 실행할 함수
*/
export class Job {
	constructor(runnable) {
		if (typeof runnable !== "function") {
			throw new Error("Runnable must be a function");
		}
		this._runnable = runnable;
	}

	async execute () {
		await this._runnable();
	}
}

/**
 * 작업을 순서대로 처리하기 위한 queue.
 * @class
 * @property {Array<Job>} _queue - 작업 대기열
*/
export class JobQueue {

	static get THRESHOLD () {
		return 1000;
	}

	/**
	 * @constructor
	*/
	constructor() {
		this._queue = [];
		this._isProcessing = false;
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
	 * @param {Job} job - 실행할 작업 객체
	*/
	async enqueue (job) {
		if (!Job.prototype.isPrototypeOf(job))
			throw new Error("Invalid job type");

		if (this._queue.length > JobQueue.THRESHOLD) {
			await this._waitForSpace();
		}
		this._queue.push(job);
		await this._processQueue();
	};

	/** 큐에 쌓인 작업을 순차적으로 처리 */
	async _processQueue () {
		if (this._isProcessing) return;
		this._isProcessing = true;
		try {
			while (this._queue.length > 0) {
				const job = this._queue.shift();
				await job.execute();
			}
		} catch (err) {
			throw new Error("[EXECUTION FAILED]" + err.message, { cause: job });
		} finally {
			this._isProcessing = false;
		}
	}
}