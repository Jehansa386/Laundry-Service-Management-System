package com.laundry.model;

import java.util.ArrayList;
import java.util.List;

public class Order {
    private int orderId;
    private int customerId;
    private String customerName; // Helper for UI display
    private String orderDate;
    private String status;        // Pending, Washing, Drying, Ironing, Ready for Pickup, Completed
    private double totalAmount;
    private List<OrderItem> items = new ArrayList<>();

    public Order() {
        this.status = "Pending";
    }

    public Order(int orderId, int customerId, String customerName, String orderDate, String status) {
        this.orderId = orderId;
        this.customerId = customerId;
        this.customerName = customerName;
        this.orderDate = orderDate;
        this.status = status;
        this.totalAmount = 0.0;
    }

    public void calculateTotal() {
        double sum = 0.0;
        for (OrderItem item : items) {
            sum += item.getSubtotal();
        }
        this.totalAmount = sum;
    }

    public void addItem(OrderItem item) {
        this.items.add(item);
        calculateTotal();
    }

    // Getters and Setters
    public int getOrderId() {
        return orderId;
    }

    public void setOrderId(int orderId) {
        this.orderId = orderId;
    }

    public int getCustomerId() {
        return customerId;
    }

    public void setCustomerId(int customerId) {
        this.customerId = customerId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(String orderDate) {
        this.orderDate = orderDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public void setItems(List<OrderItem> items) {
        this.items = items;
        calculateTotal();
    }
}
