package com.laundry.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import com.laundry.util.PasswordHasher;

public class DatabaseConnection {
    private static final String MYSQL_URL = "jdbc:mysql://localhost:3306/laundry_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
    private static final String MYSQL_USER = "root";
    private static final String MYSQL_PASS = "";

    private static final String SQLITE_URL = "jdbc:sqlite:laundry.db";

    private static boolean useMySQL = true;

    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("MySQL driver not found, falling back to SQLite: " + e.getMessage());
            useMySQL = false;
        }
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException e) {
            System.err.println("SQLite driver not found: " + e.getMessage());
        }
    }

    public static Connection connect() throws SQLException {
        if (useMySQL) {
            try {
                return DriverManager.getConnection(MYSQL_URL, MYSQL_USER, MYSQL_PASS);
            } catch (SQLException e) {
                System.err.println("MySQL connection failed. Falling back to SQLite: " + e.getMessage());
                useMySQL = false;
            }
        }
        
        Connection conn = DriverManager.getConnection(SQLITE_URL);
        try (Statement stmt = conn.createStatement()) {
            stmt.execute("PRAGMA foreign_keys = ON;");
        }
        return conn;
    }

    public static void initializeDatabase() {
        try (Connection conn = connect()) {
            if (conn != null) {
                System.out.println("Initializing " + (useMySQL ? "MySQL" : "SQLite") + " database...");
                Statement stmt = conn.createStatement();

                String autoInc = useMySQL ? "INT AUTO_INCREMENT PRIMARY KEY" : "INTEGER PRIMARY KEY AUTOINCREMENT";
                String textType = useMySQL ? "VARCHAR(255)" : "TEXT";

                // Create Customer Table
                stmt.execute("CREATE TABLE IF NOT EXISTS Customer (" +
                        "customer_id " + autoInc + ", " +
                        "name " + textType + " NOT NULL, " +
                        "phone VARCHAR(100) NOT NULL UNIQUE, " +
                        "address " + textType + ", " +
                        "password " + textType + " NOT NULL DEFAULT 'fc825562d987d6050b181b53805eb3dbf2c9cb6b515d97f5dbf77c3a0df47a46'" +
                        ");");

                // Create Service Table
                stmt.execute("CREATE TABLE IF NOT EXISTS Service (" +
                        "service_id " + autoInc + ", " +
                        "service_name VARCHAR(100) NOT NULL UNIQUE, " +
                        "price DOUBLE NOT NULL" +
                        ");");

                // Create Laundry_Order Table
                stmt.execute("CREATE TABLE IF NOT EXISTS Laundry_Order (" +
                        "order_id " + autoInc + ", " +
                        "customer_id INT, " +
                        "order_date " + textType + " NOT NULL, " +
                        "total DOUBLE NOT NULL, " +
                        "status VARCHAR(50) NOT NULL, " +
                        "FOREIGN KEY(customer_id) REFERENCES Customer(customer_id) ON DELETE CASCADE" +
                        ");");

                // Create Order_Item Table
                stmt.execute("CREATE TABLE IF NOT EXISTS Order_Item (" +
                        "item_id " + autoInc + ", " +
                        "order_id INT, " +
                        "service_id INT, " +
                        "quantity INT NOT NULL, " +
                        "subtotal DOUBLE NOT NULL, " +
                        "FOREIGN KEY(order_id) REFERENCES Laundry_Order(order_id) ON DELETE CASCADE, " +
                        "FOREIGN KEY(service_id) REFERENCES Service(service_id) ON DELETE SET NULL" +
                        ");");

                // Create Payment Table
                stmt.execute("CREATE TABLE IF NOT EXISTS Payment (" +
                        "payment_id " + autoInc + ", " +
                        "order_id INT, " +
                        "amount DOUBLE NOT NULL, " +
                        "payment_date " + textType + " NOT NULL, " +
                        "payment_method VARCHAR(50) NOT NULL, " +
                        "FOREIGN KEY(order_id) REFERENCES Laundry_Order(order_id) ON DELETE CASCADE" +
                        ");");

                // Create User Table
                stmt.execute("CREATE TABLE IF NOT EXISTS User (" +
                        "user_id " + autoInc + ", " +
                        "username VARCHAR(100) NOT NULL UNIQUE, " +
                        "password VARCHAR(100) NOT NULL" +
                        ");");

                // Seed Default Services
                seedServices(conn);

                // Seed Default Admin User
                seedAdminUser(conn);

                // Auto-upgrade any legacy plaintext passwords to secure SHA-256 hashes
                upgradePlaintextPasswords(conn);

                System.out.println("Database initialization completed successfully.");
            }
        } catch (SQLException e) {
            System.err.println("Database initialization failed: " + e.getMessage());
        }
    }

    private static void upgradePlaintextPasswords(Connection conn) throws SQLException {
        // Upgrade User table passwords
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT user_id, password FROM User")) {
            java.util.List<Object[]> usersToUpdate = new java.util.ArrayList<>();
            while (rs.next()) {
                String pass = rs.getString("password");
                if (pass == null || !pass.matches("^[a-fA-F0-9]{64}$")) {
                    usersToUpdate.add(new Object[]{rs.getInt("user_id"), pass});
                }
            }
            if (!usersToUpdate.isEmpty()) {
                System.out.println("Securing and hashing plaintext Admin passwords in database...");
                try (PreparedStatement pstmt = conn.prepareStatement("UPDATE User SET password = ? WHERE user_id = ?")) {
                    for (Object[] u : usersToUpdate) {
                        pstmt.setString(1, PasswordHasher.hash((String) u[1]));
                        pstmt.setInt(2, (Integer) u[0]);
                        pstmt.executeUpdate();
                    }
                }
            }
        }

        // Upgrade Customer table passwords
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT customer_id, password FROM Customer")) {
            java.util.List<Object[]> custsToUpdate = new java.util.ArrayList<>();
            while (rs.next()) {
                String pass = rs.getString("password");
                if (pass == null || !pass.matches("^[a-fA-F0-9]{64}$")) {
                    custsToUpdate.add(new Object[]{rs.getInt("customer_id"), pass});
                }
            }
            if (!custsToUpdate.isEmpty()) {
                System.out.println("Securing and hashing plaintext Customer passwords in database...");
                try (PreparedStatement pstmt = conn.prepareStatement("UPDATE Customer SET password = ? WHERE customer_id = ?")) {
                    for (Object[] c : custsToUpdate) {
                        String rawPass = c[1] != null ? (String) c[1] : "customer123";
                        pstmt.setString(1, PasswordHasher.hash(rawPass));
                        pstmt.setInt(2, (Integer) c[0]);
                        pstmt.executeUpdate();
                    }
                }
            }
        }
    }

    private static void seedServices(Connection conn) throws SQLException {
        String countQuery = "SELECT COUNT(*) FROM Service";
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(countQuery)) {
            if (rs.next() && rs.getInt(1) == 0) {
                System.out.println("Seeding default services...");
                String insertSQL = "INSERT INTO Service (service_name, price) VALUES (?, ?)";
                try (PreparedStatement pstmt = conn.prepareStatement(insertSQL)) {
                    pstmt.setString(1, "Wash");
                    pstmt.setDouble(2, 2.50);
                    pstmt.executeUpdate();

                    pstmt.setString(1, "Dry Clean");
                    pstmt.setDouble(2, 8.00);
                    pstmt.executeUpdate();

                    pstmt.setString(1, "Iron");
                    pstmt.setDouble(2, 1.50);
                    pstmt.executeUpdate();

                    pstmt.setString(1, "Wash & Iron");
                    pstmt.setDouble(2, 3.50);
                    pstmt.executeUpdate();
                }
            }
        }
    }

    private static void seedAdminUser(Connection conn) throws SQLException {
        // Delete any existing admin user to guarantee it gets updated with the new hashed password
        try (PreparedStatement deleteStmt = conn.prepareStatement("DELETE FROM User WHERE username = 'admin'")) {
            deleteStmt.executeUpdate();
        }
        System.out.println("Seeding default admin user with secure hashed password...");
        String insertSQL = "INSERT INTO User (username, password) VALUES (?, ?)";
        try (PreparedStatement pstmt = conn.prepareStatement(insertSQL)) {
            pstmt.setString(1, "admin");
            pstmt.setString(2, PasswordHasher.hash("admin123"));
            pstmt.executeUpdate();
        }
    }
}
