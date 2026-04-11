package com.example.cdp;

import java.util.Map;

// ChromeDevtoolsProtocolRequest {
public class ChromeDevtoolsProtocolRequest {
    private Long id;
    private String method;
    private Map<String, ? extends Object> params;

    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }
    public String getMethod() {
        return method;
    }
    public void setMethod(String method) {
        this.method = method;
    }
    public Map<String, ? extends Object> getParams() {
        return params;
    }
    public void setParams(Map<String, ? extends Object> params) {
        this.params = params;
    }
}