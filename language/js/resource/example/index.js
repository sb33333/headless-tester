"use strict";

import { HeadlessTester } from "../module.js";

var tester;
var wsUrl = "write your cdp websocket url here";
(async () => {

	tester = await HeadlessTester.create(wsUrl, "https://www.naver.com");

	await tester.navigate("/");

	var evalResult = await tester.evaluate(`document.title`);
	console.log("evalResult:::", evalResult);

	try {
		await tester.navigate("/not/exist/page");
	} catch {

	}

	// await tester.closeBrowser();

})();