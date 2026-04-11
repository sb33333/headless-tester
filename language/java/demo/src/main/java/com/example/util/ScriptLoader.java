package com.example.util;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public final class ScriptLoader {
    // static private final String BASE_PATH = "src/test/resource/";
    static public String load(String fileName) {
        try {
            String fullFileName = fileName.endsWith(".js") ? fileName : fileName + ".js";
            Path path = Paths.get(fullFileName);
            return Files.readString(path);
        } catch (IOException e) {
            throw new RuntimeException("cannot read file:::"+fileName, e);
        }
    }
}

