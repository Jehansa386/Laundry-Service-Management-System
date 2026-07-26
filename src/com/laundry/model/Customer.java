package com.laundry.model;

public class Customer extends Person {
    private String password;
    
    public Customer() {
        super();
        this.password = "customer123";
    }

    public Customer(int id, String name, String phone, String address) {
        super(id, name, phone, address);
        this.password = "customer123";
    }

    public Customer(int id, String name, String phone, String address, String password) {
        super(id, name, phone, address);
        this.password = password;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
    
    @Override
    public String toString() {
        return "Customer{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", phone='" + phone + '\'' +
                ", address='" + address + '\'' +
                ", password='" + password + '\'' +
                '}';
    }
}
