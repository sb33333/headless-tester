package com.example.cdp;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ChromeDevtoolsProtocolResponse{
    private Long id;
    private String method;
    private Map<String, Object> params;
    private Result result;
    private Map<String, Object> error;

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
    public Map<String, Object> getParams() {
        return params;
    }
    public void setParams(Map<String, Object> params) {
        this.params = params;
    }
    public Result getResult() {
        return result;
    }
    public void setResult(Result result) {
        this.result = result;
    }
    public Map<String, Object> getError() {
        return error;
    }
    public void setError(Map<String, Object> error) {
        this.error = error;
    }

    public static class Result {
        private String type;
        private String subtype;
        private String className;
        private String description;
        private String frameId;
        private String objectId;
        private String value;
        private Map<String, Object> exceptionDetails;
        private String loaderId;
        @JsonProperty("isDownload")
        private boolean download;
        @JsonProperty("result")
        private Result result;
        private String errorText;
        public String getType() {
            return type;
        }
        public void setType(String type) {
            this.type = type;
        }
        public String getSubtype() {
            return subtype;
        }
        public void setSubtype(String subtype) {
            this.subtype = subtype;
        }
        public String getClassName() {
            return className;
        }
        public void setClassName(String className) {
            this.className = className;
        }
        public String getDescription() {
            return description;
        }
        public void setDescription(String description) {
            this.description = description;
        }
        public String getFrameId() {
            return frameId;
        }
        public void setFrameId(String frameId) {
            this.frameId = frameId;
        }
        public String getObjectId() {
            return objectId;
        }
        public void setObjectId(String objectId) {
            this.objectId = objectId;
        }
        public String getValue() {
            return value;
        }
        public void setValue(String value) {
            this.value = value;
        }
        public Map<String, Object> getExceptionDetails() {
            return exceptionDetails;
        }
        public void setExceptionDetails(Map<String, Object> exceptionDetails) {
            this.exceptionDetails = exceptionDetails;
        }
        public String getLoaderId() {
            return loaderId;
        }
        public void setLoaderId(String loaderId) {
            this.loaderId = loaderId;
        }
        public boolean isDownload() {
            return download;
        }
        public void setDownload(boolean download) {
            this.download = download;
        }
        public Result getResult() {
            return result;
        }
        public void setResult(Result result) {
            this.result = result;
        }
        public String getErrorText() {
            return errorText;
        }
        public void setErrorText(String errorText) {
            this.errorText = errorText;
        }

    }

    public static class Params {
        private String requestId;
        private String loaderId;
        private String documentURL;
        private String resourceIPAddressSpace;
        private int statusCode;
        private String headersText;
        private Map<String, Object> request;
        private String timestamp;
        private double wallTime;
        private Map<String, Object> initiator;
        private boolean redirectHasExtraInfo;
        private String type;
        private String frameId;
        private boolean hasUserGesture;
        private String url;
        private String navigationType;
        private List<?> associatedCookies;
        private List<?> blockedCookies;
        private List<?> exemptedCookies;
        private boolean cookiePartitionKeyOpaque;
        private Map<String, Object> cookiePartitionKey;
        private Map<String, Object> headers;
        private Map<String, Object> connectTiming;
        private boolean siteHasCookieInOtherPartition;
        private boolean hasExtraInfo;
        private Map<String, Object> response;
        private Map<String, Object> frame;
        private long dataLength;
        private long encodedDataLength;
        public String getRequestId() {
            return requestId;
        }
        public void setRequestId(String requestId) {
            this.requestId = requestId;
        }
        public String getLoaderId() {
            return loaderId;
        }
        public void setLoaderId(String loaderId) {
            this.loaderId = loaderId;
        }
        public String getDocumentURL() {
            return documentURL;
        }
        public void setDocumentURL(String documentURL) {
            this.documentURL = documentURL;
        }
        public String getResourceIPAddressSpace() {
            return resourceIPAddressSpace;
        }
        public void setResourceIPAddressSpace(String resourceIPAddressSpace) {
            this.resourceIPAddressSpace = resourceIPAddressSpace;
        }
        public int getStatusCode() {
            return statusCode;
        }
        public void setStatusCode(int statusCode) {
            this.statusCode = statusCode;
        }
        public String getHeadersText() {
            return headersText;
        }
        public void setHeadersText(String headersText) {
            this.headersText = headersText;
        }
        public Map<String, Object> getRequest() {
            return request;
        }
        public void setRequest(Map<String, Object> request) {
            this.request = request;
        }
        public String getTimestamp() {
            return timestamp;
        }
        public void setTimestamp(String timestamp) {
            this.timestamp = timestamp;
        }
        public double getWallTime() {
            return wallTime;
        }
        public void setWallTime(double wallTime) {
            this.wallTime = wallTime;
        }
        public Map<String, Object> getInitiator() {
            return initiator;
        }
        public void setInitiator(Map<String, Object> initiator) {
            this.initiator = initiator;
        }
        public boolean isRedirectHasExtraInfo() {
            return redirectHasExtraInfo;
        }
        public void setRedirectHasExtraInfo(boolean redirectHasExtraInfo) {
            this.redirectHasExtraInfo = redirectHasExtraInfo;
        }
        public String getType() {
            return type;
        }
        public void setType(String type) {
            this.type = type;
        }
        public String getFrameId() {
            return frameId;
        }
        public void setFrameId(String frameId) {
            this.frameId = frameId;
        }
        public boolean isHasUserGesture() {
            return hasUserGesture;
        }
        public void setHasUserGesture(boolean hasUserGesture) {
            this.hasUserGesture = hasUserGesture;
        }
        public String getUrl() {
            return url;
        }
        public void setUrl(String url) {
            this.url = url;
        }
        public String getNavigationType() {
            return navigationType;
        }
        public void setNavigationType(String navigationType) {
            this.navigationType = navigationType;
        }
        public List<?> getAssociatedCookies() {
            return associatedCookies;
        }
        public void setAssociatedCookies(List<?> associatedCookies) {
            this.associatedCookies = associatedCookies;
        }
        public List<?> getBlockedCookies() {
            return blockedCookies;
        }
        public void setBlockedCookies(List<?> blockedCookies) {
            this.blockedCookies = blockedCookies;
        }
        public List<?> getExemptedCookies() {
            return exemptedCookies;
        }
        public void setExemptedCookies(List<?> exemptedCookies) {
            this.exemptedCookies = exemptedCookies;
        }
        public boolean isCookiePartitionKeyOpaque() {
            return cookiePartitionKeyOpaque;
        }
        public void setCookiePartitionKeyOpaque(boolean cookiePartitionKeyOpaque) {
            this.cookiePartitionKeyOpaque = cookiePartitionKeyOpaque;
        }
        public Map<String, Object> getCookiePartitionKey() {
            return cookiePartitionKey;
        }
        public void setCookiePartitionKey(Map<String, Object> cookiePartitionKey) {
            this.cookiePartitionKey = cookiePartitionKey;
        }
        public Map<String, Object> getHeaders() {
            return headers;
        }
        public void setHeaders(Map<String, Object> headers) {
            this.headers = headers;
        }
        public Map<String, Object> getConnectTiming() {
            return connectTiming;
        }
        public void setConnectTiming(Map<String, Object> connectTiming) {
            this.connectTiming = connectTiming;
        }
        public boolean isSiteHasCookieInOtherPartition() {
            return siteHasCookieInOtherPartition;
        }
        public void setSiteHasCookieInOtherPartition(boolean siteHasCookieInOtherPartition) {
            this.siteHasCookieInOtherPartition = siteHasCookieInOtherPartition;
        }
        public boolean isHasExtraInfo() {
            return hasExtraInfo;
        }
        public void setHasExtraInfo(boolean hasExtraInfo) {
            this.hasExtraInfo = hasExtraInfo;
        }
        public Map<String, Object> getResponse() {
            return response;
        }
        public void setResponse(Map<String, Object> response) {
            this.response = response;
        }
        public Map<String, Object> getFrame() {
            return frame;
        }
        public void setFrame(Map<String, Object> frame) {
            this.frame = frame;
        }
        public long getDataLength() {
            return dataLength;
        }
        public void setDataLength(long dataLength) {
            this.dataLength = dataLength;
        }
        public long getEncodedDataLength() {
            return encodedDataLength;
        }
        public void setEncodedDataLength(long encodedDataLength) {
            this.encodedDataLength = encodedDataLength;
        }

    }
}
