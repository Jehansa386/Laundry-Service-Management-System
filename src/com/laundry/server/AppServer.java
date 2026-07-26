package com.laundry.server;

import com.laundry.server.handler.ApiHandler;
import com.laundry.server.handler.StaticHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class AppServer {
    private final int port;
    private HttpServer server;

    public AppServer(int port) {
        this.port = port;
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);
        
        // Setup contexts
        server.createContext("/api", new ApiHandler());
        server.createContext("/", new StaticHandler("web"));
        
        // Multi-threaded executor
        server.setExecutor(Executors.newFixedThreadPool(10));
        
        server.start();
        System.out.println("==========================================================");
        System.out.println("  LAUNDRY MANAGEMENT SYSTEM - SERVER RUNNING");
        System.out.println("==========================================================");
        System.out.println("  Port: " + port);
        System.out.println("  URL:  http://localhost:" + port);
        System.out.println("  Default Login:");
        System.out.println("    Username: admin");
        System.out.println("    Password: admin123");
        System.out.println("==========================================================");
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
            System.out.println("Server stopped.");
        }
    }
}
