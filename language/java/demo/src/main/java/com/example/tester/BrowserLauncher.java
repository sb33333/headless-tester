package com.example.tester;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;

public class BrowserLauncher {
    private final Logger log = org.slf4j.LoggerFactory.getLogger(BrowserLauncher.class);
    private Process browserProcess;
    private Future<?> logFuture;
    private final String executablePath;
    private final int port;
    private final Path userDataDir;
    private final ExecutorService executorService;
    public boolean isRunning() {
        return browserProcess != null && browserProcess.isAlive();
    }
    public BrowserLauncher(String executablePath, int port, String userDataDirPath, ExecutorService executorService) {
        super();
        this.executablePath = executablePath;
        this.port =port;
        this.userDataDir = Paths.get(userDataDirPath);
        this.executorService = executorService;
    }
    public BrowserLauncher(String executablePath, int port, String userDataDirPath) {
        super();
        this.executablePath = executablePath;
        this.port = port;
        this.userDataDir = Paths.get(userDataDirPath);
        this.executorService = Executors.newFixedThreadPool(1);
    }

    private void deleteUserData() {
        if(!Files.exists(userDataDir)) return;
        try (var stream = Files.walk(userDataDir)) {
            stream.sorted(Comparator.reverseOrder())
            .forEach(path -> {
                try {Files.delete(path);} catch (IOException e) {
                    log.error(e.getLocalizedMessage());
                }
            })
            ;
            log.info("{}", "remove user data.");
        } catch (Exception e) {
            log.error("{}", e.getMessage());
        }
    }

    public CompletableFuture<Boolean> launch (String targetUrl) {
        Callable<Boolean> l = () -> {
            if(isRunning()) return true;

            // 1. 기존 프로필이 있는 경우 삭제
            deleteUserData();
            Files.createDirectories(userDataDir);

            // 2. 실행 인자 설정
            List<String> command = List.of (
                executablePath,
                //"--headless",
                "--remote-debugging-port="+port,
                "--remote-allow-origins=*",
                "--user-data-dir="+userDataDir.toAbsolutePath(),

                "--no-first-run",
                "--no-default-browser-check",
                "--password-store=basic",
                "--disable-features=Translate,NetworkService,NetworkServiceInProcess",
                "--disable-sync",
                "--no-first-run",
                "--disable-background-networking",
                "--disable-component-update",
                "--dsiable-extensions",
                "--disable-gpu",
                targetUrl
            );
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);

            this.browserProcess = pb.start();
            this.browserProcess
                .onExit()
                .thenAccept(
                    p -> {
                        log.info("onExit() handler:::");
                    }
                );
            // 3.브라우저 로그 출력
            logFuture = executorService.submit(this::readBrowserLogs);
            boolean isRunning = waitForBrowserReady(20, 500);
            log.info ("browser process is running on :::{}", this.browserProcess.pid());
            return isRunning;
        };
        return CompletableFuture.supplyAsync(() -> {
            try { return l.call();} catch (Exception e) {
                log.error("failed to launch browser:::{}", e.getMessage());
                e.printStackTrace();
                throw new RuntimeException(e);
            }
        }).orTimeout(5000, TimeUnit.MILLISECONDS);
    }
    private void readBrowserLogs() {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(browserProcess.getInputStream()))) {
            String line;
            while((line = reader.readLine()) != null) {
                System.out.println("[BROWSER-LOG] " + line);
            }
        } catch (IOException e) {
            log.error("{}", e.getMessage());
        }
    }
    private boolean waitForBrowserReady(int retryCount, int intervalMs) throws InterruptedException {
        for(int i = 0; i <retryCount; i++) {
            if (isPortOpen("localhost", port)) {
                return true;
            }
            Thread.sleep(intervalMs);
        }
        return false;
    }
    private boolean isPortOpen (String host, int port) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port ), 200);
            return true;
        } catch (IOException e) {
            return false;
        }
    }
} // end of class definition

