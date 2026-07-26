package com.laundry.server.handler;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.laundry.db.DatabaseConnection;
import com.laundry.model.*;
import com.laundry.util.PasswordHasher;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ApiHandler implements HttpHandler {
    private final Gson gson = new Gson();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();
        Map<String, String> queryParams = parseQueryParams(exchange.getRequestURI().getQuery());

        // Set CORS headers so it works smoothly
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type,Authorization");

        if ("OPTIONS".equalsIgnoreCase(method)) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        try {
            if (path.equals("/api/login") && "POST".equalsIgnoreCase(method)) {
                handleLogin(exchange);
            } else if (path.equals("/api/register") && "POST".equalsIgnoreCase(method)) {
                handleRegister(exchange);
            } else if (path.equals("/api/customers")) {
                if ("GET".equalsIgnoreCase(method)) handleGetCustomers(exchange);
                else if ("POST".equalsIgnoreCase(method)) handleCreateCustomer(exchange);
                else if ("PUT".equalsIgnoreCase(method)) handleUpdateCustomer(exchange);
                else if ("DELETE".equalsIgnoreCase(method)) handleDeleteCustomer(exchange, queryParams);
                else sendResponse(exchange, 405, "Method Not Allowed");
            } else if (path.equals("/api/services")) {
                if ("GET".equalsIgnoreCase(method)) handleGetServices(exchange);
                else if ("POST".equalsIgnoreCase(method)) handleCreateService(exchange);
                else if ("PUT".equalsIgnoreCase(method)) handleUpdateService(exchange);
                else if ("DELETE".equalsIgnoreCase(method)) handleDeleteService(exchange, queryParams);
                else sendResponse(exchange, 405, "Method Not Allowed");
            } else if (path.equals("/api/orders")) {
                if ("GET".equalsIgnoreCase(method)) handleGetOrders(exchange, queryParams);
                else if ("POST".equalsIgnoreCase(method)) handleCreateOrder(exchange);
                else if ("PUT".equalsIgnoreCase(method)) handleUpdateOrder(exchange);
                else sendResponse(exchange, 405, "Method Not Allowed");
            } else if (path.equals("/api/payments")) {
                if ("GET".equalsIgnoreCase(method)) handleGetPayments(exchange, queryParams);
                else if ("POST".equalsIgnoreCase(method)) handleCreatePayment(exchange);
                else sendResponse(exchange, 405, "Method Not Allowed");
            } else if (path.equals("/api/dashboard-stats") && "GET".equalsIgnoreCase(method)) {
                handleGetDashboardStats(exchange);
            } else {
                sendResponse(exchange, 404, "Not Found");
            }
        } catch (Exception e) {
            e.printStackTrace();
            sendErrorResponse(exchange, 500, "Internal Server Error: " + e.getMessage());
        }
    }

    // --- Authentication & Registration Handlers ---
    private void handleLogin(HttpExchange exchange) throws IOException {
        Reader reader = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
        JsonObject loginData = null;
        try {
            loginData = JsonParser.parseReader(reader).getAsJsonObject();
        } catch (Exception e) {
            sendErrorResponse(exchange, 400, "Invalid JSON payload");
            return;
        }

        if (loginData == null || !loginData.has("username") || !loginData.has("password")) {
            sendErrorResponse(exchange, 400, "Username and Password are required");
            return;
        }

        String username = loginData.get("username").getAsString().trim();
        String password = loginData.get("password").getAsString().trim();
        String hashedPassword = PasswordHasher.hash(password);

        try (Connection conn = DatabaseConnection.connect()) {
            // 1. Check User (Staff) table
            try (PreparedStatement pstmt = conn.prepareStatement("SELECT * FROM User WHERE username = ? AND password = ?")) {
                pstmt.setString(1, username);
                pstmt.setString(2, hashedPassword);
                try (ResultSet rs = pstmt.executeQuery()) {
                    if (rs.next()) {
                        JsonObject resp = new JsonObject();
                        resp.addProperty("success", true);
                        resp.addProperty("role", "staff");
                        resp.addProperty("username", rs.getString("username"));
                        sendJsonResponse(exchange, 200, resp.toString());
                        return;
                    }
                }
            }

            // 2. Check Customer table (log in using phone number as username)
            try (PreparedStatement pstmt = conn.prepareStatement("SELECT * FROM Customer WHERE phone = ? AND password = ?")) {
                pstmt.setString(1, username);
                pstmt.setString(2, hashedPassword);
                try (ResultSet rs = pstmt.executeQuery()) {
                    if (rs.next()) {
                        JsonObject resp = new JsonObject();
                        resp.addProperty("success", true);
                        resp.addProperty("role", "customer");
                        resp.addProperty("customerId", rs.getInt("customer_id"));
                        resp.addProperty("username", rs.getString("name"));
                        sendJsonResponse(exchange, 200, resp.toString());
                        return;
                    }
                }
            }

            // 3. Login failed
            JsonObject resp = new JsonObject();
            resp.addProperty("success", false);
            resp.addProperty("message", "Invalid credentials. Staff use username; Customers use Phone Number.");
            sendJsonResponse(exchange, 401, resp.toString());

        } catch (SQLException e) {
            sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleRegister(HttpExchange exchange) throws IOException {
        Reader reader = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
        Customer customer = gson.fromJson(reader, Customer.class);

        if (customer == null || customer.getName() == null || customer.getName().trim().isEmpty() ||
            customer.getPhone() == null || customer.getPhone().trim().isEmpty() ||
            customer.getPassword() == null || customer.getPassword().trim().isEmpty()) {
            sendErrorResponse(exchange, 400, "Name, Phone Number, and Password are required");
            return;
        }

        String phone = customer.getPhone().trim();
        if (phone.length() != 10 || !phone.matches("\\d+")) {
            sendErrorResponse(exchange, 400, "Invalid Phone Number! It must be exactly 10 digits.");
            return;
        }

        try (Connection conn = DatabaseConnection.connect()) {
            int nextId = getNextAvailableCustomerId(conn);
            String sql = "INSERT INTO Customer (customer_id, name, phone, address, password) VALUES (?, ?, ?, ?, ?)";
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setInt(1, nextId);
                pstmt.setString(2, customer.getName());
                pstmt.setString(3, customer.getPhone());
                pstmt.setString(4, customer.getAddress());
                pstmt.setString(5, PasswordHasher.hash(customer.getPassword()));
                pstmt.executeUpdate();
                customer.setId(nextId);
            }
            
            JsonObject resp = new JsonObject();
            resp.addProperty("success", true);
            resp.addProperty("customerId", customer.getId());
            resp.addProperty("username", customer.getName());
            resp.addProperty("role", "customer");
            sendJsonResponse(exchange, 201, resp.toString());
        } catch (SQLException e) {
            if (e.getMessage().contains("UNIQUE") || e.getMessage().contains("constraint")) {
                sendErrorResponse(exchange, 409, "A customer with this phone number is already registered.");
            } else {
                sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
            }
        }
    }

    // --- Customer Handlers ---
    private void handleGetCustomers(HttpExchange exchange) throws IOException {
        List<Customer> list = new ArrayList<>();
        try (Connection conn = DatabaseConnection.connect();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT * FROM Customer ORDER BY customer_id ASC")) {
            while (rs.next()) {
                list.add(new Customer(
                        rs.getInt("customer_id"),
                        rs.getString("name"),
                        rs.getString("phone"),
                        rs.getString("address"),
                        rs.getString("password")
                ));
            }
            sendJsonResponse(exchange, 200, gson.toJson(list));
        } catch (SQLException e) {
            sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private int getNextAvailableCustomerId(Connection conn) throws SQLException {
        String sql = "SELECT customer_id FROM Customer ORDER BY customer_id ASC";
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            int candidateId = 1;
            while (rs.next()) {
                int existingId = rs.getInt("customer_id");
                if (existingId == candidateId) {
                    candidateId++;
                } else if (existingId > candidateId) {
                    return candidateId;
                }
            }
            return candidateId;
        }
    }

    private void handleCreateCustomer(HttpExchange exchange) throws IOException {
        Reader reader = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
        Customer customer = gson.fromJson(reader, Customer.class);

        if (customer == null || customer.getName() == null || customer.getName().trim().isEmpty() ||
            customer.getPhone() == null || customer.getPhone().trim().isEmpty()) {
            sendErrorResponse(exchange, 400, "Customer name and phone are required");
            return;
        }

        String phone = customer.getPhone().trim();
        if (phone.length() != 10 || !phone.matches("\\d+")) {
            sendErrorResponse(exchange, 400, "Invalid Phone Number! It must be exactly 10 digits.");
            return;
        }

        try (Connection conn = DatabaseConnection.connect()) {
            int nextId = getNextAvailableCustomerId(conn);
            String sql = "INSERT INTO Customer (customer_id, name, phone, address, password) VALUES (?, ?, ?, ?, ?)";
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setInt(1, nextId);
                pstmt.setString(2, customer.getName());
                pstmt.setString(3, customer.getPhone());
                pstmt.setString(4, customer.getAddress());
                
                String rawPassword = customer.getPassword() != null && !customer.getPassword().isEmpty() ? customer.getPassword() : "customer123";
                String securePass = rawPassword.matches("^[a-fA-F0-9]{64}$") ? rawPassword : PasswordHasher.hash(rawPassword);
                pstmt.setString(5, securePass);
                
                pstmt.executeUpdate();
                customer.setId(nextId);
            }
            sendJsonResponse(exchange, 201, gson.toJson(customer));
        } catch (SQLException e) {
            if (e.getMessage().contains("UNIQUE") || e.getMessage().contains("constraint")) {
                sendErrorResponse(exchange, 409, "A customer with this phone number is already registered.");
            } else {
                sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
            }
        }
    }

    private void handleUpdateCustomer(HttpExchange exchange) throws IOException {
        Reader reader = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
        Customer customer = gson.fromJson(reader, Customer.class);

        if (customer == null || customer.getId() <= 0 || customer.getName() == null || customer.getName().trim().isEmpty() ||
            customer.getPhone() == null || customer.getPhone().trim().isEmpty()) {
            sendErrorResponse(exchange, 400, "Valid Customer ID, Name, and Phone are required");
            return;
        }

        String phone = customer.getPhone().trim();
        if (phone.length() != 10 || !phone.matches("\\d+")) {
            sendErrorResponse(exchange, 400, "Invalid Phone Number! It must be exactly 10 digits.");
            return;
        }

        String sql = "UPDATE Customer SET name = ?, phone = ?, address = ?, password = ? WHERE customer_id = ?";
        try (Connection conn = DatabaseConnection.connect();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, customer.getName());
            pstmt.setString(2, customer.getPhone());
            pstmt.setString(3, customer.getAddress());
            
            String rawPassword = customer.getPassword() != null && !customer.getPassword().isEmpty() ? customer.getPassword() : "customer123";
            String securePass = rawPassword.matches("^[a-fA-F0-9]{64}$") ? rawPassword : PasswordHasher.hash(rawPassword);
            pstmt.setString(4, securePass);
            
            pstmt.setInt(5, customer.getId());
            int rows = pstmt.executeUpdate();
            if (rows > 0) {
                sendJsonResponse(exchange, 200, gson.toJson(customer));
            } else {
                sendErrorResponse(exchange, 404, "Customer not found");
            }
        } catch (SQLException e) {
            if (e.getMessage().contains("UNIQUE") || e.getMessage().contains("constraint")) {
                sendErrorResponse(exchange, 409, "A customer with this phone number is already registered.");
            } else {
                sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
            }
        }
    }

    private void handleDeleteCustomer(HttpExchange exchange, Map<String, String> queryParams) throws IOException {
        String idStr = queryParams.get("id");
        if (idStr == null) {
            sendErrorResponse(exchange, 400, "Customer ID is required");
            return;
        }
        int customerId = Integer.parseInt(idStr);

        try (Connection conn = DatabaseConnection.connect();
             PreparedStatement pstmt = conn.prepareStatement("DELETE FROM Customer WHERE customer_id = ?")) {
            pstmt.setInt(1, customerId);
            int rows = pstmt.executeUpdate();
            if (rows > 0) {
                JsonObject resp = new JsonObject();
                resp.addProperty("success", true);
                sendJsonResponse(exchange, 200, resp.toString());
            } else {
                sendErrorResponse(exchange, 404, "Customer not found");
            }
        } catch (SQLException e) {
            sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    // --- Service Handlers ---
    private void handleGetServices(HttpExchange exchange) throws IOException {
        List<Service> list = new ArrayList<>();
        try (Connection conn = DatabaseConnection.connect();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT * FROM Service ORDER BY service_name ASC")) {
            while (rs.next()) {
                list.add(new Service(
                        rs.getInt("service_id"),
                        rs.getString("service_name"),
                        rs.getDouble("price")
                ));
            }
            sendJsonResponse(exchange, 200, gson.toJson(list));
        } catch (SQLException e) {
            sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleCreateService(HttpExchange exchange) throws IOException {
        Reader reader = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
        Service service = gson.fromJson(reader, Service.class);

        if (service == null || service.getServiceName() == null || service.getServiceName().trim().isEmpty() || service.getPrice() < 0) {
            sendErrorResponse(exchange, 400, "Valid Service Name and positive Price are required");
            return;
        }

        String sql = "INSERT INTO Service (service_name, price) VALUES (?, ?)";
        try (Connection conn = DatabaseConnection.connect();
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            pstmt.setString(1, service.getServiceName());
            pstmt.setDouble(2, service.getPrice());
            pstmt.executeUpdate();

            try (ResultSet generatedKeys = pstmt.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    service.setServiceId(generatedKeys.getInt(1));
                }
            }
            sendJsonResponse(exchange, 201, gson.toJson(service));
        } catch (SQLException e) {
            sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleUpdateService(HttpExchange exchange) throws IOException {
        Reader reader = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
        Service service = gson.fromJson(reader, Service.class);

        if (service == null || service.getServiceId() <= 0 || service.getServiceName() == null || service.getServiceName().trim().isEmpty() || service.getPrice() < 0) {
            sendErrorResponse(exchange, 400, "Valid Service ID, Name, and positive Price are required");
            return;
        }

        String sql = "UPDATE Service SET service_name = ?, price = ? WHERE service_id = ?";
        try (Connection conn = DatabaseConnection.connect();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, service.getServiceName());
            pstmt.setDouble(2, service.getPrice());
            pstmt.setInt(3, service.getServiceId());
            int rows = pstmt.executeUpdate();
            if (rows > 0) {
                sendJsonResponse(exchange, 200, gson.toJson(service));
            } else {
                sendErrorResponse(exchange, 404, "Service not found");
            }
        } catch (SQLException e) {
            sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleDeleteService(HttpExchange exchange, Map<String, String> queryParams) throws IOException {
        String idStr = queryParams.get("id");
        if (idStr == null) {
            sendErrorResponse(exchange, 400, "Service ID is required");
            return;
        }
        int serviceId = Integer.parseInt(idStr);

        try (Connection conn = DatabaseConnection.connect();
             PreparedStatement pstmt = conn.prepareStatement("DELETE FROM Service WHERE service_id = ?")) {
            pstmt.setInt(1, serviceId);
            int rows = pstmt.executeUpdate();
            if (rows > 0) {
                JsonObject resp = new JsonObject();
                resp.addProperty("success", true);
                sendJsonResponse(exchange, 200, resp.toString());
            } else {
                sendErrorResponse(exchange, 404, "Service not found");
            }
        } catch (SQLException e) {
            sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    // --- Order Handlers ---
    private void handleGetOrders(HttpExchange exchange, Map<String, String> queryParams) throws IOException {
        List<Order> orders = new ArrayList<>();
        String idParam = queryParams.get("id");
        String customerIdParam = queryParams.get("customerId");

        String sql = "SELECT o.*, c.name as customer_name FROM Laundry_Order o " +
                "LEFT JOIN Customer c ON o.customer_id = c.customer_id ";
        if (idParam != null) {
            sql += "WHERE o.order_id = ? ";
        } else if (customerIdParam != null) {
            sql += "WHERE o.customer_id = ? ";
        }
        sql += "ORDER BY o.order_id DESC";

        try (Connection conn = DatabaseConnection.connect();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            if (idParam != null) {
                pstmt.setInt(1, Integer.parseInt(idParam));
            } else if (customerIdParam != null) {
                pstmt.setInt(1, Integer.parseInt(customerIdParam));
            }

            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Order order = new Order(
                            rs.getInt("order_id"),
                            rs.getInt("customer_id"),
                            rs.getString("customer_name"),
                            rs.getString("order_date"),
                            rs.getString("status")
                    );
                    order.setTotalAmount(rs.getDouble("total"));

                    // Fetch items for this order
                    List<OrderItem> items = getOrderItems(conn, order.getOrderId());
                    order.setItems(items);
                    orders.add(order);
                }
            }
            sendJsonResponse(exchange, 200, gson.toJson(orders));
        } catch (SQLException e) {
            sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private List<OrderItem> getOrderItems(Connection conn, int orderId) throws SQLException {
        List<OrderItem> list = new ArrayList<>();
        String sql = "SELECT i.*, s.service_name FROM Order_Item i " +
                "LEFT JOIN Service s ON i.service_id = s.service_id " +
                "WHERE i.order_id = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, orderId);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new OrderItem(
                            rs.getInt("item_id"),
                            rs.getInt("order_id"),
                            rs.getInt("service_id"),
                            rs.getString("service_name"),
                            rs.getDouble("subtotal") / rs.getInt("quantity"), // Price at order
                            rs.getInt("quantity")
                    ));
                }
            }
        }
        return list;
    }

    private void handleCreateOrder(HttpExchange exchange) throws IOException {
        Reader reader = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
        Order rawOrder = gson.fromJson(reader, Order.class);

        if (rawOrder == null || rawOrder.getCustomerId() <= 0 || rawOrder.getItems() == null || rawOrder.getItems().isEmpty()) {
            sendErrorResponse(exchange, 400, "Customer ID and order items are required");
            return;
        }

        try (Connection conn = DatabaseConnection.connect()) {
            conn.setAutoCommit(false); // Transaction boundaries

            try {
                // Determine prices, calculate subtotals, and total amount
                double totalAmount = 0.0;
                List<OrderItem> verifiedItems = new ArrayList<>();

                for (OrderItem item : rawOrder.getItems()) {
                    // Fetch service price from database
                    try (PreparedStatement priceStmt = conn.prepareStatement("SELECT service_name, price FROM Service WHERE service_id = ?")) {
                        priceStmt.setInt(1, item.getServiceId());
                        try (ResultSet rs = priceStmt.executeQuery()) {
                            if (rs.next()) {
                                String sName = rs.getString("service_name");
                                double price = rs.getDouble("price");
                                item.setServiceName(sName);
                                item.setPrice(price);
                                item.calculateSubtotal();
                                totalAmount += item.getSubtotal();
                                verifiedItems.add(item);
                            } else {
                                throw new SQLException("Service ID " + item.getServiceId() + " not found");
                            }
                        }
                    }
                }

                // Get Current Date
                String orderDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

                // Insert Laundry_Order
                String orderSQL = "INSERT INTO Laundry_Order (customer_id, order_date, total, status) VALUES (?, ?, ?, ?)";
                int orderId = -1;
                try (PreparedStatement pstmt = conn.prepareStatement(orderSQL, Statement.RETURN_GENERATED_KEYS)) {
                    pstmt.setInt(1, rawOrder.getCustomerId());
                    pstmt.setString(2, orderDate);
                    pstmt.setDouble(3, totalAmount);
                    pstmt.setString(4, "Pending");
                    pstmt.executeUpdate();

                    try (ResultSet generatedKeys = pstmt.getGeneratedKeys()) {
                        if (generatedKeys.next()) {
                            orderId = generatedKeys.getInt(1);
                        }
                    }
                }

                if (orderId == -1) {
                    throw new SQLException("Failed to create laundry order row");
                }

                // Insert Order Items
                String itemSQL = "INSERT INTO Order_Item (order_id, service_id, quantity, subtotal) VALUES (?, ?, ?, ?)";
                try (PreparedStatement pstmt = conn.prepareStatement(itemSQL, Statement.RETURN_GENERATED_KEYS)) {
                    for (OrderItem item : verifiedItems) {
                        pstmt.setInt(1, orderId);
                        pstmt.setInt(2, item.getServiceId());
                        pstmt.setInt(3, item.getQuantity());
                        pstmt.setDouble(4, item.getSubtotal());
                        pstmt.executeUpdate();

                        try (ResultSet rs = pstmt.getGeneratedKeys()) {
                            if (rs.next()) {
                                item.setItemId(rs.getInt(1));
                            }
                        }
                        item.setOrderId(orderId);
                    }
                }

                conn.commit(); // Commit transaction

                // Fetch details for the return object
                String cName = "";
                try (PreparedStatement custStmt = conn.prepareStatement("SELECT name FROM Customer WHERE customer_id = ?")) {
                    custStmt.setInt(1, rawOrder.getCustomerId());
                    try (ResultSet rs = custStmt.executeQuery()) {
                        if (rs.next()) {
                            cName = rs.getString("name");
                        }
                    }
                }

                Order completedOrder = new Order(orderId, rawOrder.getCustomerId(), cName, orderDate, "Pending");
                completedOrder.setTotalAmount(totalAmount);
                completedOrder.setItems(verifiedItems);

                sendJsonResponse(exchange, 201, gson.toJson(completedOrder));

            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (Exception e) {
            sendErrorResponse(exchange, 500, "Order creation transaction failed: " + e.getMessage());
        }
    }

    private void handleUpdateOrder(HttpExchange exchange) throws IOException {
        Reader reader = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
        Order order = gson.fromJson(reader, Order.class);

        if (order == null || order.getOrderId() <= 0 || order.getStatus() == null) {
            sendErrorResponse(exchange, 400, "Valid Order ID and Status are required");
            return;
        }

        String sql = "UPDATE Laundry_Order SET status = ? WHERE order_id = ?";
        try (Connection conn = DatabaseConnection.connect();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, order.getStatus());
            pstmt.setInt(2, order.getOrderId());
            int rows = pstmt.executeUpdate();
            if (rows > 0) {
                JsonObject resp = new JsonObject();
                resp.addProperty("success", true);
                resp.addProperty("orderId", order.getOrderId());
                resp.addProperty("status", order.getStatus());
                sendJsonResponse(exchange, 200, resp.toString());
            } else {
                sendErrorResponse(exchange, 404, "Order not found");
            }
        } catch (SQLException e) {
            sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    // --- Payment Handlers ---
    private void handleGetPayments(HttpExchange exchange, Map<String, String> queryParams) throws IOException {
        List<JsonObject> payments = new ArrayList<>();
        String customerIdParam = queryParams.get("customerId");
        Integer targetCustomerId = null;
        if (customerIdParam != null && !customerIdParam.trim().isEmpty()) {
            try {
                targetCustomerId = Integer.parseInt(customerIdParam.trim());
            } catch (NumberFormatException ignored) {}
        }

        String sql = "SELECT p.*, o.customer_id, c.name as customer_name FROM Payment p " +
                "LEFT JOIN Laundry_Order o ON p.order_id = o.order_id " +
                "LEFT JOIN Customer c ON o.customer_id = c.customer_id ";
        if (targetCustomerId != null) {
            sql += "WHERE o.customer_id = ? ";
        }
        sql += "ORDER BY p.payment_id DESC";

        try (Connection conn = DatabaseConnection.connect();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            if (targetCustomerId != null) {
                pstmt.setInt(1, targetCustomerId);
            }
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    JsonObject obj = new JsonObject();
                    obj.addProperty("paymentId", rs.getInt("payment_id"));
                    obj.addProperty("orderId", rs.getInt("order_id"));
                    obj.addProperty("customerId", rs.getInt("customer_id"));
                    obj.addProperty("amount", rs.getDouble("amount"));
                    obj.addProperty("paymentDate", rs.getString("payment_date"));
                    obj.addProperty("paymentMethod", rs.getString("payment_method"));
                    obj.addProperty("customerName", rs.getString("customer_name"));
                    payments.add(obj);
                }
            }
            sendJsonResponse(exchange, 200, gson.toJson(payments));
        } catch (SQLException e) {
            sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleCreatePayment(HttpExchange exchange) throws IOException {
        Reader reader = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
        Payment payment = gson.fromJson(reader, Payment.class);

        if (payment == null || payment.getOrderId() <= 0 || payment.getAmount() <= 0 || payment.getPaymentMethod() == null) {
            sendErrorResponse(exchange, 400, "Valid Order ID, positive Amount, and Payment Method are required");
            return;
        }

        try (Connection conn = DatabaseConnection.connect()) {
            conn.setAutoCommit(false);
            try {
                // Verify order exists
                double orderTotal = 0.0;
                try (PreparedStatement checkOrder = conn.prepareStatement("SELECT total FROM Laundry_Order WHERE order_id = ?")) {
                    checkOrder.setInt(1, payment.getOrderId());
                    try (ResultSet rs = checkOrder.executeQuery()) {
                        if (rs.next()) {
                            orderTotal = rs.getDouble("total");
                        } else {
                            throw new SQLException("Order ID " + payment.getOrderId() + " not found");
                        }
                    }
                }

                // Check already paid amount
                double alreadyPaid = 0.0;
                try (PreparedStatement paidQuery = conn.prepareStatement("SELECT SUM(amount) FROM Payment WHERE order_id = ?")) {
                    paidQuery.setInt(1, payment.getOrderId());
                    try (ResultSet rs = paidQuery.executeQuery()) {
                        if (rs.next()) {
                            alreadyPaid = rs.getDouble(1);
                        }
                    }
                }

                // Record payment
                String paymentDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                String sql = "INSERT INTO Payment (order_id, amount, payment_date, payment_method) VALUES (?, ?, ?, ?)";
                try (PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                    pstmt.setInt(1, payment.getOrderId());
                    pstmt.setDouble(2, payment.getAmount());
                    pstmt.setString(3, paymentDate);
                    pstmt.setString(4, payment.getPaymentMethod());
                    pstmt.executeUpdate();
                    try (ResultSet generatedKeys = pstmt.getGeneratedKeys()) {
                        if (generatedKeys.next()) {
                            payment.setPaymentId(generatedKeys.getInt(1));
                        }
                    }
                }
                payment.setPaymentDate(paymentDate);

                // Update order status if fully paid (or just keep as is, but completed state makes sense)
                // In laundry business, if fully paid and order status was 'Ready for Pickup', it goes to 'Completed'.
                // If it is any other state, it stays in that status.
                double newPaidTotal = alreadyPaid + payment.getAmount();
                if (newPaidTotal >= orderTotal) {
                    // Update status if currently ready for pickup or pending (auto complete on full payment + ready)
                    String selectStatusSQL = "SELECT status FROM Laundry_Order WHERE order_id = ?";
                    String currentStatus = "";
                    try (PreparedStatement checkStatus = conn.prepareStatement(selectStatusSQL)) {
                        checkStatus.setInt(1, payment.getOrderId());
                        try (ResultSet rs = checkStatus.executeQuery()) {
                            if (rs.next()) {
                                currentStatus = rs.getString("status");
                            }
                        }
                    }

                    if ("Ready for Pickup".equalsIgnoreCase(currentStatus)) {
                        String updateStatusSQL = "UPDATE Laundry_Order SET status = 'Completed' WHERE order_id = ?";
                        try (PreparedStatement updateStatus = conn.prepareStatement(updateStatusSQL)) {
                            updateStatus.setInt(1, payment.getOrderId());
                            updateStatus.executeUpdate();
                        }
                    }
                }

                conn.commit();
                sendJsonResponse(exchange, 201, gson.toJson(payment));
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (Exception e) {
            sendErrorResponse(exchange, 500, "Payment creation failed: " + e.getMessage());
        }
    }

    // --- Dashboard Analytics Handler ---
    private void handleGetDashboardStats(HttpExchange exchange) throws IOException {
        try (Connection conn = DatabaseConnection.connect()) {
            JsonObject stats = new JsonObject();

            // 1. Total Customers
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM Customer")) {
                if (rs.next()) stats.addProperty("totalCustomers", rs.getInt(1));
            }

            // 2. Active Orders (All status except Completed)
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM Laundry_Order WHERE status != 'Completed'")) {
                if (rs.next()) stats.addProperty("activeOrders", rs.getInt(1));
            }

            // 3. Total Revenue (sum of all payments)
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT SUM(amount) FROM Payment")) {
                double revenue = 0.0;
                if (rs.next()) revenue = rs.getDouble(1);
                stats.addProperty("totalRevenue", revenue);
            }

            // 4. Services Count
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM Service")) {
                if (rs.next()) stats.addProperty("totalServices", rs.getInt(1));
            }

            // 5. Order Status Breakup
            JsonObject statusBreakup = new JsonObject();
            // initialize status categories
            statusBreakup.addProperty("Pending", 0);
            statusBreakup.addProperty("Washing", 0);
            statusBreakup.addProperty("Drying", 0);
            statusBreakup.addProperty("Ironing", 0);
            statusBreakup.addProperty("Ready for Pickup", 0);
            statusBreakup.addProperty("Completed", 0);

            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT status, COUNT(*) FROM Laundry_Order GROUP BY status")) {
                while (rs.next()) {
                    statusBreakup.addProperty(rs.getString(1), rs.getInt(2));
                }
            }
            stats.add("statusBreakup", statusBreakup);

            // 6. Payment Methods counts
            JsonObject paymentMethods = new JsonObject();
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT payment_method, COUNT(*), SUM(amount) FROM Payment GROUP BY payment_method")) {
                while (rs.next()) {
                    JsonObject methodObj = new JsonObject();
                    methodObj.addProperty("count", rs.getInt(2));
                    methodObj.addProperty("amount", rs.getDouble(3));
                    paymentMethods.add(rs.getString(1), methodObj);
                }
            }
            stats.add("paymentMethods", paymentMethods);

            // 7. Recent Orders (limit 5)
            List<JsonObject> recent = new ArrayList<>();
            String sql = "SELECT o.*, c.name as customer_name FROM Laundry_Order o " +
                    "LEFT JOIN Customer c ON o.customer_id = c.customer_id " +
                    "ORDER BY o.order_id DESC LIMIT 5";
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(sql)) {
                while (rs.next()) {
                    JsonObject r = new JsonObject();
                    r.addProperty("orderId", rs.getInt("order_id"));
                    r.addProperty("customerName", rs.getString("customer_name"));
                    r.addProperty("orderDate", rs.getString("order_date"));
                    r.addProperty("totalAmount", rs.getDouble("total"));
                    r.addProperty("status", rs.getString("status"));
                    recent.add(r);
                }
            }
            stats.add("recentOrders", gson.toJsonTree(recent));

            sendJsonResponse(exchange, 200, stats.toString());
        } catch (SQLException e) {
            sendErrorResponse(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    // --- Utility Methods ---
    private Map<String, String> parseQueryParams(String query) {
        Map<String, String> result = new HashMap<>();
        if (query == null || query.trim().isEmpty()) {
            return result;
        }
        for (String param : query.split("&")) {
            String[] entry = param.split("=");
            if (entry.length > 1) {
                try {
                    result.put(URLDecoder.decode(entry[0], "UTF-8"), URLDecoder.decode(entry[1], "UTF-8"));
                } catch (UnsupportedEncodingException e) {
                    result.put(entry[0], entry[1]);
                }
            } else {
                result.put(entry[0], "");
            }
        }
        return result;
    }

    private void sendJsonResponse(HttpExchange exchange, int statusCode, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private void sendErrorResponse(HttpExchange exchange, int statusCode, String message) throws IOException {
        JsonObject err = new JsonObject();
        err.addProperty("error", message);
        sendJsonResponse(exchange, statusCode, err.toString());
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String text) throws IOException {
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
