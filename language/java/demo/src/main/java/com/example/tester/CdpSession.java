package com.example.tester;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import org.springframework.web.reactive.socket.client.WebSocketClient;

import com.example.cdp.ChromeDevtoolsProtocolRequest;
import com.example.cdp.ChromeDevtoolsProtocolResponse;
import com.example.cdp.ChromeDevtoolsProtocolResponse.Result;
import com.example.cdp.Domain;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

public class CdpSession {
    private static final Logger log = LoggerFactory.getLogger(CdpSession.class);
    private AtomicLong sequence = new AtomicLong(0L);
    private Sinks.Many<String> sink = Sinks.many().unicast().onBackpressureBuffer();
    private WebSocketClient client = new ReactorNettyWebSocketClient();
    final private ObjectMapper om;
    static private final long DEFAULT_TIMEOUT_MS = 5000l;
    static private final String BINDING = "notifyCDP";

    private Map<String, List<EventHandler>> handlers = new ConcurrentHashMap<>();
    private ExecutorService eventHandlerQueue = new ThreadPoolExecutor(1, 1, 0L, TimeUnit.MICROSECONDS, new LinkedBlockingQueue<>(100), new ThreadPoolExecutor.AbortPolicy());

    public CdpSession(String wsUrl) {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true);
        om = objectMapper;
        client.execute(URI.create(wsUrl), session -> {
            Mono<Void> output = session
                .send(sink.asFlux().map(session::textMessage));
            Mono<Void> input = session
                .receive()
                .doOnNext(msg -> {
                    var responsePayload = msg.getPayloadAsText();
                    final ChromeDevtoolsProtocolResponse responseJson;
                    try {
                        responseJson = om.readValue(responsePayload, ChromeDevtoolsProtocolResponse.class);
                    } catch (JsonProcessingException e) {
                        // System.out.println("\n\n\n"+responsePayload);
                        // e.printStackTrace();
                        throw new RuntimeException(e);
                    }
                    log.debug("수신:{}", responseJson); // debugging
                    Long id = responseJson.getId();
                    Result result = responseJson.getResult();
                    String method = responseJson.getMethod();
                    Map<String, Object> params = responseJson.getParams();

                    if (id != null) {
                        resolveRequestOnQueue(id, result);
                    } else {
                        // eventHandlers
                        Runnable runnable = () -> {
                            List<EventHandler> targetHandlers = handlers.get(method);
                            if(targetHandlers == null || targetHandlers.isEmpty()) return;
                            for (EventHandler handler: new ArrayList<>(targetHandlers)) {
                                if(!handler.check(params)) continue;
                                log.debug("resolve eventHandler:::eventName:::{}//handlerUUID:::{}", method, handler.getUuid().toString());
                                boolean retain = handler.run(params);
                                if(!retain) {
                                    handlers.put(method, targetHandlers.stream().filter(h -> h!=handler).collect(Collectors.toList()) );
                                }
                            }
                        };
                        eventHandlerQueue.execute(runnable);
                    }
                })
                .then();
            return Mono.zip(output, input).then();
        }).subscribe();

        // onopen
        enableDomain(Domain.Page, true);
        enableDomain(Domain.Network, true);
        bind();
        addEventHandler(
            "Page.frameNavigated",
            param -> {bind(); return true; }, null
        );
        addEventHandler (
            "Page.javascriptDialogOpening",
            param -> {
                String message = (String)param.get("message");
                String type = (String)param.get("type");
                log.info("[{}]{}", type.toUpperCase(), message);
                sendMessage("Page.handleJavaScriptDialog", Map.of("Accept", true));
                return true;
            },
            null
        );
    }

    public boolean checkSessionStatus() {
        //TODO not implemeted.
        return true;
    }

    public CompletableFuture<Result> sendMessage(String method, Map<String, Object>params) {
        return sendMessage(method, params, null);
    }

    public CompletableFuture<Result> sendMessage(String method, Map<String, Object> params, Long timeoutMs) {
        checkSessionStatus();
        long requestId = sequence.getAndIncrement();
        ChromeDevtoolsProtocolRequest payload = new ChromeDevtoolsProtocolRequest();
        payload.setId(requestId);
        payload.setMethod(method);
        payload.setParams(params);
        try{
            var payloadStr = om.writeValueAsString(payload);
            log.debug("발신:::{}", payloadStr);
            sink.tryEmitNext(payloadStr);
            CompletableFuture<Result> request = addRequestOnQueue(requestId, timeoutMs);
            return request;
        } catch(JsonProcessingException jpe) {
            log.error("failed to sendMessage:::{}", jpe.getMessage());
            throw new RuntimeException(jpe);
        }
    }

    public CompletableFuture<Result> enableDomain(Domain domain, boolean bool) {
        String message = domain.toString() + "." +(bool ? "enable" : "disable");
        return sendMessage(message, Map.of());
    }

    public void close() {
        //browser 종료
        sendMessage("Browser.close", Map.of());
        eventHandlerQueue.shutdown();
        sink.tryEmitComplete();
    }

    private CompletableFuture<Result> bind() { return sendMessage("Runtime.addBinding", Map.of("name", BINDING));}
    private Map<Long, CompletableFuture<Result>> requests = new HashMap<>();

    public CompletableFuture<Result> addRequestOnQueue (long requestId, Long timeoutMs) {
        long _timeoutMs = (timeoutMs == null || timeoutMs < 1) ? DEFAULT_TIMEOUT_MS : timeoutMs;
        CompletableFuture<Result> request = (new CompletableFuture<Result>())
            .orTimeout(_timeoutMs, TimeUnit.MILLISECONDS)
            .exceptionally(ex -> {
                requests.remove(requestId);
                throw new CompletionException(ex);}
            );
        Runnable enqueue = () -> {
            requests.put(requestId, request);
        };
        eventHandlerQueue.execute(enqueue);
        return request;
    }

    private CompletableFuture<Result> resolveRequestOnQueue(long id, Result result) {
        Supplier<CompletableFuture<Result>> resolve = () -> {
            CompletableFuture<Result> request = requests.remove(id);
            if(request == null) {
                throw new RuntimeException("[REQUEST_ID:::"+ id + "] not found");
            }
            Map<String, Object> exceptionDetails = result.getExceptionDetails();
            if (exceptionDetails!=null) {
                var error = new RuntimeException("[REQUEST_ID:::"+id+"]" + exceptionDetails.toString());
                request.completeExceptionally(error);
            } else {
                request.complete(result);
            }
            return request;
        };
        return CompletableFuture.supplyAsync(resolve, eventHandlerQueue).thenCompose(f -> f);
    }

    static private final Function<Map<String, Object>, Boolean> ALWAYS_TRUE = param -> true;

    /* event handle */
    public Runnable addEventHandler(String eventName, Function<Map<String, Object>, Boolean> handlerFunction, Function<Map<String, Object>, Boolean> predicate) {
        EventHandler handler = new EventHandler(handlerFunction, (predicate != null ? predicate : ALWAYS_TRUE));

        Runnable job = () -> {
            List<EventHandler> hs = handlers.computeIfAbsent(eventName, k -> new ArrayList<>());
            hs.add(handler);
            log.debug("addEventHandler:::eventName:::{}//handlerUUID:::{}", eventName, handler.getUuid().toString());
        };
        eventHandlerQueue.execute(job);

        Runnable unsubscribe = () -> {
            eventHandlerQueue.execute(() -> {
                handlers.put(eventName, handlers.get(eventName).stream().filter(h -> h != handler).collect(Collectors.toList()));
            });
        };
        return unsubscribe;
    }
    /* event handle */
}

    class EventHandler {
        private final UUID uuid = UUID.randomUUID();
        private Function<Map<String, Object>, Boolean> handler;
        private Function<Map<String, Object>, Boolean> condition;

        public EventHandler(Function<Map<String, Object>, Boolean> handler, Function<Map<String, Object>, Boolean> condition) {
            this.handler = handler;
            this.condition = condition;
        }

        public UUID getUuid() {
            return uuid;
        }

        public Function<Map<String, Object>, Boolean> getHandler() {
            return handler;
        }

        public Function<Map<String, Object>, Boolean> getCondition() {
            return condition;
        }

        public boolean check(Map<String, Object> param) {return condition.apply(param);}
        public boolean run (Map<String, Object> param) {
            try {
                return handler.apply(param);
            } catch (Exception e) {
                // e.printStackTrace();
                throw new RuntimeException(e);
            }
        }

    }