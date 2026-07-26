package com.laundry.model;

public class OrderItem {
    private int itemId;
    private int orderId;
    private int serviceId;
    private String serviceName; // Helper for frontend display
    private double price;       // Price at the time of order
    private int quantity;
    private double subtotal;

    public OrderItem() {
    }

    public OrderItem(int itemId, int orderId, int serviceId, String serviceName, double price, int quantity) {
        this.itemId = itemId;
        this.orderId = orderId;
        this.serviceId = serviceId;
        this.serviceName = serviceName;
        this.price = price;
        this.quantity = quantity;
        calculateSubtotal();
    }

    public void calculateSubtotal() {
        this.subtotal = this.price * this.quantity;
    }

    // Getters and Setters
    public int getItemId() {
        return itemId;
    }

    public void setItemId(int itemId) {
        this.itemId = itemId;
    }

    public int getOrderId() {
        return orderId;
    }

    public void setOrderId(int orderId) {
        this.orderId = orderId;
    }

    public int getServiceId() {
        return serviceId;
    }

    public void setServiceId(int serviceId) {
        this.serviceId = serviceId;
        calculateSubtotal();
    }

    public String getServiceName() {
        return serviceName;
    }

    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
        calculateSubtotal();
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
        calculateSubtotal();
    }

    public double getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(double subtotal) {
        this.subtotal = subtotal;
    }
}
