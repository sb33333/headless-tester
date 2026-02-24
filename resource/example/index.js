"use strict";

import { HeadlessTester } from "../src/headless-tester.js";

var tester;
var wsUrl = "write your cdp websocket url here";
(async () => {

	tester = await HeadlessTester.create(wsUrl, "https://www.naver.com");

	await tester.navigate("/");

	var evalResult = await tester.evaluate(`document.title`);
	console.log("evalResult:::", evalResult);


	await tester.navigate("/not/exist/page");
})();