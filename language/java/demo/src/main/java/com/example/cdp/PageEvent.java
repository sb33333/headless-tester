package com.example.cdp;

public enum PageEvent implements CdpDomainEvent {
    LOAD_EVENT_FIRED,
    FRAME_STOPPED_LOADING,
    FRAME_NAVIGATED,
    JAVASCRIPT_DIALOG_OPENING
    ;
    static private final Domain DOMAIN = Domain.Page;
    @Override
    public String eventName() {
        return DOMAIN.toString() + "." + convertUpperSnakeToCamelCase(this.toString());
    }

    private static String convertUpperSnakeToCamelCase(String source) {
        if(source == null || source.isEmpty()) return source;
        char[] chars = source.toCharArray();
        int sourceLength = chars.length;
        char separator = '_';
        char[] converted = new char[sourceLength];
        int lastIndex = 0;
        boolean nextUpper = false;
        for (int i = 0; i < sourceLength; i++ ) {
            char c = chars[i];
            if (c == separator) {
                nextUpper = true;
                continue;
            }
            if (nextUpper) {
                converted[lastIndex++] = Character.toUpperCase(c);
                nextUpper = false;
            } else {
                converted[lastIndex++] = Character.toLowerCase(c);
            }
        }
        return String.valueOf(converted, 0, lastIndex);
    }
}
