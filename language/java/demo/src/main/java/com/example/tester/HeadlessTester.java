package com.example.tester;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.example.cdp.CdpDomainEvent;
import com.example.cdp.ChromeDevtoolsProtocolResponse.Result;
import com.example.cdp.PageEvent;

public class HeadlessTester {
    private static final Logger log = LoggerFactory.getLogger(HeadlessTester.class);
    private CdpSession cdpSession;
    private String hostName;
    private String protocol;
    public HeadlessTester(CdpSession cdpSession, String hostName, String protocol) {
        super();
        this.cdpSession = cdpSession;
        if(hostName.endsWith("/")) {
            hostName = hostName.substring(0, hostName.length() -1);
        }
        if(hostName.contains("://")) {
        String[] split = hostName.split("://");
        this.protocol = split[0];
        this.hostName = split[1];
    } else {
        this.hostName = hostName;
        this.protocol = protocol;
    }
    if (this.hostName == null || this.hostName.isEmpty() || this.protocol == null || this.protocol.isEmpty()) {
        throw new IllegalArgumentException("[IllegalArgument] hostName and protocol is required.");
    }
}

private String constructUrl( String resourcePath) {
    if (resourcePath.contains("://")) return resourcePath;
    return protocol + "://" + hostName + (resourcePath.startsWith("/")? resourcePath : "/" + resourcePath);
}

public CompletableFuture<Map<String, Object>> waitForEvent(String eventName) { return waitForEvent(eventName, null);
}

public CompletableFuture<Map<String, Object>> waitForEvent(CdpDomainEvent eventType) {
    if (eventType == null) throw new IllegalArgumentException("eventType cannot be null.");
    return waitForEvent(eventType.eventName(), null);
}
public CompletableFuture<Map<String, Object>> waitForEvent(CdpDomainEvent eventType, Long timeoutMs) {
    if (eventType == null) throw new IllegalArgumentException("eventType cannot be null.");
    return waitForEvent(eventType.eventName(), timeoutMs);
}

public CompletableFuture<Map<String, Object>> waitForEvent (String eventName, Long timeoutMs) {
    long _timeoutMs = (timeoutMs == null ? 5000: timeoutMs);
    CompletableFuture<Map<String, Object>> future = (new CompletableFuture<Map<String, Object>>()).orTimeout(_timeoutMs, TimeUnit.MILLISECONDS);

    Runnable unsubscriber = cdpSession.addEventHandler (eventName, param -> {future.complete(param);
        return false;
    }, null);
    future.exceptionally(err -> {
        log.error("waitForEvent timeout:::{}", eventName);
        // err.printStackTrace();
        unsubscriber.run();
        return null;
    });

    return future;
}

public CompletableFuture<Map<String, Object>> navigate (String url) {
    String _url = constructUrl(url);
    cdpSession.sendMessage("Page.navigate", Map.of("url", _url));
    var future1 = waitForEvent(PageEvent.LOAD_EVENT_FIRED);
    var future2 = waitForEvent(PageEvent.FRAME_STOPPED_LOADING);
    var navigatePromise = new CompletableFuture<Map<String, Object>>();
    Runnable unsubscribe = cdpSession.addEventHandler("Network.responseReceived",
    (Map<String, Object> param) -> {
        Map<String, Object> response = (Map<String, Object>) param.get("response");
        Integer status = (Integer) response.get("status");
        if (status >= 200 && status <400) {
            navigatePromise.complete(response);
        } else {
            navigatePromise.completeExceptionally(new RuntimeException("status["+status+"]:::" + response.toString()));
        }
        return false;
    },
    param -> {
        String responseUrl = (String)(((Map<String, Object>)param.get("response")).get("url"));
        var condition = _url.equals(responseUrl) || _url.equals(responseUrl.substring(0, responseUrl.length() - 1));
        log.debug("condition::::::::::{}\n{}", responseUrl, condition);
        return condition;
    }
);
return CompletableFuture
.allOf(future1, future2, navigatePromise)
.thenCompose(nothing -> CompletableFuture.supplyAsync(() -> navigatePromise.join())
)
.orTimeout(5000, TimeUnit.MILLISECONDS)
.exceptionally(err -> {
    unsubscribe.run();
    throw new RuntimeException(err);
});
}

public CompletableFuture<Result> evaluate(String script, boolean awaitPromise) {
    String _script = "{\n" + script + "\n}";
    return cdpSession.sendMessage("Runtime.evaluate", Map.of("expression", _script, "awaitPromise" ,awaitPromise));
}

public CompletableFuture<Result> evaluate(String script, boolean awaitPromise, long timeoutMs) {
    String _script = "{\n" + script + "\n}";
    return cdpSession.sendMessage("Runtime.evaluate", Map.of("expression", _script, "awaitPromise" ,awaitPromise), timeoutMs);
}

}