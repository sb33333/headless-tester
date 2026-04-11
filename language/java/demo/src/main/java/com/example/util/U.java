package com.example.util;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.ObjectMapper;


final public class U {
    static private final Logger log = LoggerFactory.getLogger(U.class);
    static private final Base64.Decoder decoder = Base64.getDecoder();

    private static final ObjectMapper om = new ObjectMapper() ;
    final public static String retrieveWebSocketEndpointUrl (String cdpUrl) {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder().uri(URI.create(cdpUrl + "/json/list")).header("Accept", "application/json").GET().build();
        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                String responseBody = response.body();
                List<Map<String, Object>> body = om.readValue(responseBody, List.class);
                if (body != null && !body.isEmpty()) {
                    String debuggerUrl = body.stream().filter(map -> { return "page".equals(map.get("type"));}).map(map->map.get("webSocketDebuggerUrl")).filter(wsDebuggerUrl -> wsDebuggerUrl != null).map(str -> (String) str).filter(str ->!str.isEmpty()).findAny().orElseThrow(IllegalStateException::new)
                    ;
                    return debuggerUrl;
                }
            }
            return null;
        }catch (Exception e) {
            log.error(e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
    public static String decodeBase64 (String maybeBase64EncodedString) {
        try {
            return new String(decoder.decode(maybeBase64EncodedString), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return maybeBase64EncodedString;
        }
    }
}
