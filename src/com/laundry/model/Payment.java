package com.laundry.model;

public class Payment {
    private int paymentId;
    private int orderId;
    private double amount;
    private String paymentDate;
    private String paymentMethod; // Cash, Card, Mobile, etc.

    public Payment() {
    }

    public Payment(int paymentId, int orderId, double amount, String paymentDate, String paymentMethod) {
        this.paymentId = paymentId;
        this.orderId = orderId;
        this.amount = amount;
        this.paymentDate = paymentDate;
        this.paymentMethod = paymentMethod;
    }

