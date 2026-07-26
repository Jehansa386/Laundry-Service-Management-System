package com.laundry;

import com.laundry.db.DatabaseConnection;
import com.laundry.server.AppServer;

public class Main {
    public static void main(String[] args) {
        System.out.println("Starting Laundry Management System Backend...");
        
        // 1. Initialize SQLite database & Seed default values
        DatabaseConnection.initializeDatabase();
        
        // 2. Start HTTP Web Server
        String envPort = System.getenv("PORT");
        int port = envPort != null ? Integer.parseInt(envPort) : 8085;
        AppServer server = new AppServer(port);
        
        try {
            server.start();
        } catch (Exception e) {
            System.err.println("Failed to start the web server: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
