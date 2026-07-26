// CleanCycles Laundry Management System - SPA Frontend App Engine

const API_BASE = "/api";
let currentRole = "guest"; // guest, staff, customer
let currentUsername = "";
let currentCustomerId = null;
let currentView = "home"; // home, login, register, dashboard, etc.

let customersCache = [];
let servicesCache = [];
let ordersCache = [];
let paymentsCache = [];

// App Startup
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    setupEventListeners();
    checkAuth();
    loadPublicCatalog();
}

// 1. PUBLIC AND ROUTING STATE CONTROLLERS
function checkAuth() {
    const role = localStorage.getItem("laundry_role");
    const username = localStorage.getItem("laundry_username");
    const customerId = localStorage.getItem("laundry_customer_id");

    const publicContainer = document.getElementById("public-container");
    const appContainer = document.getElementById("app-container");

    if (role && username) {
        currentRole = role;
        currentUsername = username;
        currentCustomerId = customerId ? parseInt(customerId) : null;
        
        publicContainer.style.display = "none";
        appContainer.style.display = "flex";
        
        document.getElementById("current-username").textContent = currentUsername;
        document.getElementById("current-user-role").textContent = currentRole === "staff" ? "Administrator" : "Valued Customer";
        document.getElementById("current-user-avatar").textContent = currentUsername.substring(0, 1).toUpperCase();

        // Build navigation menu dynamically based on role
        buildSidebarNavigation();

        // Load default view
        if (currentRole === "staff") {
            loadView("dashboard");
        } else {
            loadView("customer-dashboard");
        }
    } else {
        currentRole = "guest";
        currentUsername = "";
        currentCustomerId = null;
        
        publicContainer.style.display = "block";
        appContainer.style.display = "none";
        
        showPublicView("home");
    }
}

function handleLogoClick() {
    const publicContainer = document.getElementById("public-container");
    const appContainer = document.getElementById("app-container");
    
    publicContainer.style.display = "block";
    appContainer.style.display = "none";
    
    updateHeaderAuthButtons();
    showPublicView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function returnToWorkspace() {
    const publicContainer = document.getElementById("public-container");
    const appContainer = document.getElementById("app-container");
    
    if (currentRole === "staff" || currentRole === "customer") {
        publicContainer.style.display = "none";
        appContainer.style.display = "flex";
        if (currentRole === "staff") {
            loadView("dashboard");
        } else {
            loadView("customer-dashboard");
        }
    } else {
        showPublicView("login");
    }
}

function updateHeaderAuthButtons() {
    const authBtnContainer = document.getElementById("header-auth-buttons");
    if (!authBtnContainer) return;

    authBtnContainer.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="showPublicView('login')" style="padding: 0.5rem 1.25rem;">Log In</button>
        <button class="btn btn-sm" onclick="showPublicView('register')" style="padding: 0.5rem 1.25rem;">Register</button>
    `;
}

function showPublicView(view) {
    currentView = view;
    updateHeaderAuthButtons();
    document.querySelectorAll(".public-subview").forEach(el => {
        el.style.display = "none";
    });
    document.getElementById(`public-${view}-view`).style.display = "block";
    if (view === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

function loadPublicCatalog() {
    fetch(`${API_BASE}/services`)
        .then(res => res.json())
        .then(data => {
            servicesCache = data;
            renderPublicPricingGrid(data);
        })
        .catch(() => {
            document.getElementById("public-pricing-grid").innerHTML = 
                `<div style="grid-column: 1/-1; text-align: center; color: var(--text-danger);">Failed to load pricing catalog.</div>`;
        });
}

function renderPublicPricingGrid(services) {
    const grid = document.getElementById("public-pricing-grid");
    grid.innerHTML = "";
    
    if (services.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted);">No services configured.</div>`;
        return;
    }

    services.forEach(s => {
        const card = document.createElement("div");
        card.className = "glass-panel glass-card";
        card.style = "padding: 1.5rem; text-align: center; display: flex; flex-direction: column; justify-content: space-between; height: 160px;";
        
        let emoji = "🧼";
        if (s.serviceName.toLowerCase().includes("dry")) emoji = "🧥";
        if (s.serviceName.toLowerCase().includes("iron")) emoji = "💨";
        if (s.serviceName.toLowerCase().includes("wash")) emoji = "🫧";

        card.innerHTML = `
            <div style="font-size:2rem; margin-bottom:0.5rem;">${emoji}</div>
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${escapeHTML(s.serviceName)}</h3>
            <p style="font-size: 1.35rem; font-weight: 800; color: var(--color-secondary);">LKR ${s.price.toFixed(2)}</p>
        `;
        grid.appendChild(card);
    });
}

function buildSidebarNavigation() {
    const ul = document.getElementById("sidebar-navigation-list");
    ul.innerHTML = "";

    const staffMenu = [
        { view: "dashboard", label: "Dashboard", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
        { view: "customers", label: "Customers", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
        { view: "add-order", label: "Add Order", icon: "M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" },
        { view: "orders", label: "View Orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
        { view: "services", label: "Services", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
        { view: "payments", label: "Payments", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
        { view: "reports", label: "Reports", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" }
    ];

    const customerMenu = [
        { view: "customer-dashboard", label: "My Dashboard", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" },
        { view: "add-order", label: "Place Order", icon: "M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" },
        { view: "orders", label: "My Orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" },
        { view: "services", label: "Catalog & Pricing", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94" },
        { view: "payments", label: "My Payments", icon: "M3 10h18M7 15h1m4 0h1" }
    ];

    const menu = currentRole === "staff" ? staffMenu : customerMenu;

    menu.forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `
            <a class="menu-item" data-view="${item.view}">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" d="${item.icon || 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2'}"></path>
                </svg>
                <span>${item.label}</span>
            </a>
        `;
        // Setup click listener
        li.querySelector(".menu-item").addEventListener("click", () => {
            loadView(item.view);
        });
        ul.appendChild(li);
    });
}

function loadView(viewName) {
    currentView = viewName;
    
    // Manage active state on sidebar links
    document.querySelectorAll(".menu-item").forEach(item => {
        if (item.getAttribute("data-view") === viewName) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Toggle panels
    document.querySelectorAll(".app-view").forEach(panel => {
        if (panel.id === `view-${viewName}`) {
            panel.classList.add("active");
        } else {
            panel.classList.remove("active");
        }
    });

    // Configure Header Details & Load specific data
    const heading = document.getElementById("page-heading");
    const desc = document.getElementById("page-description");
    const quickBar = document.getElementById("quick-actions-bar");

    quickBar.innerHTML = ""; // Clear quick bar actions

    switch (viewName) {
        case "dashboard":
            heading.textContent = "Staff Dashboard";
            desc.textContent = "Welcome to CleanCycles portal overview.";
            fetchDashboardStats();
            break;
        case "customer-dashboard":
            heading.textContent = "My Laundry Space";
            desc.textContent = `Hello, ${currentUsername}! Track your active wash cycles here.`;
            fetchCustomerDashboardStats();
            break;
        case "customers":
            heading.textContent = "Customer Management";
            desc.textContent = "Register, edit, and search client records.";
            fetchCustomers();
            break;
        case "add-order":
            heading.textContent = currentRole === "customer" ? "Place Laundry Order" : "Create New Laundry Order";
            desc.textContent = "Select services and build order line items.";
            initOrderForm();
            break;
        case "orders":
            heading.textContent = currentRole === "customer" ? "My Orders" : "Laundry Order Management";
            desc.textContent = "Track status, record milestones, and print invoices.";
            fetchOrders();
            break;
        case "services":
            heading.textContent = currentRole === "customer" ? "Services & Prices Catalog" : "Manage Configured Laundry Services";
            desc.textContent = "Current list of laundry offerings and rates.";
            const addSvcBtn = document.getElementById("btn-add-service-trigger");
            if (addSvcBtn) addSvcBtn.style.display = currentRole === "staff" ? "inline-flex" : "none";
            if (currentRole === "staff") {
                quickBar.innerHTML = `<button class="btn btn-sm" id="btn-add-service-trigger-qb">🧼 Add Service</button>`;
                document.getElementById("btn-add-service-trigger-qb").addEventListener("click", () => openServiceModal());
            }
            fetchServices();
            break;
        case "payments":
            heading.textContent = currentRole === "customer" ? "My Payments Log" : "Payment Transaction Records";
            desc.textContent = "History of payments recorded.";
            const addPayBtn = document.getElementById("btn-add-payment-trigger");
            if (addPayBtn) addPayBtn.style.display = currentRole === "staff" ? "inline-flex" : "none";
            if (currentRole === "staff") {
                quickBar.innerHTML = `<button class="btn btn-sm btn-success" id="btn-add-payment-trigger-qb">💰 Record Payment</button>`;
                document.getElementById("btn-add-payment-trigger-qb").addEventListener("click", () => openPaymentModal());
            }
            fetchPayments();
            break;
        case "reports":
            heading.textContent = "Performance Reports";
            desc.textContent = "View aggregated collections and order status counts.";
            fetchReports();
            break;
    }
}

// 2. AUTHENTICATION CLIENT CONTROLLERS
function handleLoginSubmit(e) {
    e.preventDefault();
    const uInput = document.getElementById("username").value.trim();
    const pInput = document.getElementById("password").value.trim();

    fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: uInput, password: pInput })
    })
    .then(res => {
        if (!res.ok) throw new Error("Invalid login specifications.");
        return res.json();
    })
    .then(data => {
        if (data.success) {
            localStorage.setItem("laundry_role", data.role);
            localStorage.setItem("laundry_username", data.username);
            if (data.customerId) {
                localStorage.setItem("laundry_customer_id", data.customerId);
            }
            showToast("Login successful!", "success");
            checkAuth();
        } else {
            showToast(data.message || "Login failed", "error");
        }
    })
    .catch(err => {
        showToast(err.message || "Authentication failed", "error");
    });
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const address = document.getElementById("reg-address").value.trim();
    const password = document.getElementById("reg-password").value.trim();

    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        showToast("Invalid Phone Number! It must be exactly 10 digits.", "error");
        return;
    }

    fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address, password })
    })
    .then(res => {
        if (res.status === 409) throw new Error("This phone number is already registered!");
        if (!res.ok) throw new Error("Registration failed.");
        return res.json();
    })
    .then(data => {
        if (data.success) {
            localStorage.setItem("laundry_role", data.role);
            localStorage.setItem("laundry_username", data.username);
            localStorage.setItem("laundry_customer_id", data.customerId);
            showToast("Account registered and logged in!", "success");
            checkAuth();
        }
    })
    .catch(err => {
        showToast(err.message, "error");
    });
}

function handleLogout() {
    localStorage.removeItem("laundry_role");
    localStorage.removeItem("laundry_username");
    localStorage.removeItem("laundry_customer_id");
    showToast("Logged out successfully.", "info");
    checkAuth();
}

// 3. EVENT LISTENERS SETUP
function setupEventListeners() {
    document.getElementById("login-form").addEventListener("submit", handleLoginSubmit);
    document.getElementById("register-form").addEventListener("submit", handleRegisterSubmit);
    document.getElementById("btn-logout-trigger").addEventListener("click", handleLogout);

    document.getElementById("customer-search-input").addEventListener("input", filterCustomers);
    document.getElementById("order-search-input").addEventListener("input", filterOrders);

    document.getElementById("btn-add-customer-trigger").addEventListener("click", () => openCustomerModal());
    document.getElementById("btn-order-new-customer").addEventListener("click", () => openCustomerModal());
    document.getElementById("customer-form").addEventListener("submit", saveCustomer);

    document.getElementById("order-customer-select").addEventListener("change", updateSelectedCustomerPreview);

    document.getElementById("btn-add-service-trigger").addEventListener("click", () => openServiceModal());
    document.getElementById("service-form").addEventListener("submit", saveService);

    document.getElementById("btn-add-payment-trigger").addEventListener("click", () => openPaymentModal());
    document.getElementById("payment-form").addEventListener("submit", savePayment);
    document.getElementById("payment-order-select").addEventListener("change", updatePaymentDueHint);

    document.getElementById("btn-add-item-row").addEventListener("click", () => addOrderRow());
    document.getElementById("order-creation-form").addEventListener("submit", submitOrder);
    document.getElementById("btn-cancel-order").addEventListener("click", () => {
        if (currentRole === "customer") {
            loadView("customer-dashboard");
        } else {
            loadView("orders");
        }
    });
}

// 4. TOAST ALERTS
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let emoji = "ℹ️";
    if (type === "success") emoji = "✅";
    if (type === "error") emoji = "❌";
    
    toast.innerHTML = `<span>${emoji}</span> <div>${message}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Modals
function openModal(id) { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

// 5. CUSTOMER ADMIN ACTIONS
function fetchCustomers() {
    fetch(`${API_BASE}/customers`)
        .then(res => res.json())
        .then(data => {
            customersCache = data;
            renderCustomersTable(data);
        })
        .catch(() => showToast("Error loading clients", "error"));
}

function renderCustomersTable(customers) {
    const tbody = document.getElementById("customers-list-body");
    tbody.innerHTML = "";

    if (customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No customers saved.</td></tr>`;
        return;
    }

    customers.forEach((c, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <span style="font-weight:700;">#${index + 1}</span>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top:2px;">(ID: #${c.id})</span>
            </td>
            <td style="font-weight:600;">${escapeHTML(c.name)}</td>
            <td>${escapeHTML(c.phone)}</td>
            <td>${escapeHTML(c.address || '-')}</td>
            <td style="text-align: right;">
                <button class="btn btn-sm btn-secondary" onclick="openCustomerModal(${c.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterCustomers() {
    const q = document.getElementById("customer-search-input").value.toLowerCase().trim();
    if (!q) {
        renderCustomersTable(customersCache);
        return;
    }
    const filtered = customersCache.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.phone.includes(q) || 
        (c.address && c.address.toLowerCase().includes(q))
    );
    renderCustomersTable(filtered);
}

function openCustomerModal(id = null) {
    const form = document.getElementById("customer-form");
    form.reset();

    if (id) {
        document.getElementById("modal-customer-title").textContent = "Modify Customer Details";
        const c = customersCache.find(x => x.id === id);
        if (c) {
            document.getElementById("customer-id-input").value = c.id;
            document.getElementById("customer-name-input").value = c.name;
            document.getElementById("customer-phone-input").value = c.phone;
            document.getElementById("customer-address-input").value = c.address;
            document.getElementById("customer-password-input").value = c.password;
        }
    } else {
        document.getElementById("modal-customer-title").textContent = "Register New Customer";
        document.getElementById("customer-id-input").value = "";
    }

    openModal("modal-customer");
}

function saveCustomer(e) {
    e.preventDefault();
    const id = document.getElementById("customer-id-input").value;
    const name = document.getElementById("customer-name-input").value.trim();
    const phone = document.getElementById("customer-phone-input").value.trim();
    const address = document.getElementById("customer-address-input").value.trim();
    const password = document.getElementById("customer-password-input").value.trim();

    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        showToast("Invalid Phone Number! It must be exactly 10 digits.", "error");
        return;
    }

    const payload = { name, phone, address };
    if (password) payload.password = password;
    let method = "POST";

    if (id) {
        payload.id = parseInt(id);
        method = "PUT";
    }

    fetch(`${API_BASE}/customers`, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (res.status === 409) throw new Error("A customer with this phone number already exists.");
        if (!res.ok) throw new Error("Saving customer failed.");
        return res.json();
    })
    .then(() => {
        showToast("Customer record saved!", "success");
        closeModal("modal-customer");
        if (currentView === "add-order") {
            fetch(`${API_BASE}/customers`).then(r=>r.json()).then(cList => {
                customersCache = cList;
                populateCustomersDropdown();
            });
        } else {
            fetchCustomers();
        }
    })
    .catch(err => showToast(err.message, "error"));
}

function deleteCustomer(id) {
    if (!confirm("Delete customer profile? This will wipe all orders associated with this account.")) return;

    fetch(`${API_BASE}/customers?id=${id}`, { method: "DELETE" })
    .then(res => {
        if (!res.ok) throw new Error("Deleting customer failed");
        return res.json();
    })
    .then(() => {
        showToast("Customer deleted.", "success");
        fetchCustomers();
    })
    .catch(err => showToast(err.message, "error"));
}

// 6. SERVICES CONFIGURATION
function fetchServices() {
    fetch(`${API_BASE}/services`)
        .then(res => res.json())
        .then(data => {
            servicesCache = data;
            renderServicesGrid(data);
        })
        .catch(() => showToast("Error fetching services", "error"));
}

function renderServicesGrid(services) {
    const list = document.getElementById("services-config-list");
    list.innerHTML = "";

    if (services.length === 0) {
        list.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No services configured.</div>`;
        return;
    }

    services.forEach(s => {
        const card = document.createElement("div");
        card.className = "glass-panel glass-card service-config-card";
        
        let emoji = "🧼";
        if (s.serviceName.toLowerCase().includes("dry")) emoji = "🧥";
        if (s.serviceName.toLowerCase().includes("iron")) emoji = "💨";
        if (s.serviceName.toLowerCase().includes("wash")) emoji = "🫧";

        let actionsHtml = "";
        if (currentRole === "staff") {
            actionsHtml = `
                <div class="service-card-actions">
                    <button class="btn btn-sm btn-secondary" onclick="openServiceModal(${s.serviceId})">Edit Rate</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteService(${s.serviceId})">Delete</button>
                </div>
            `;
            card.style.height = "160px";
        } else {
            card.style.height = "110px";
        }

        card.innerHTML = `
            <div class="service-card-info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>${escapeHTML(s.serviceName)}</h3>
                    <span style="font-size:1.5rem;">${emoji}</span>
                </div>
                <p>LKR ${s.price.toFixed(2)}</p>
            </div>
            ${actionsHtml}
        `;
        list.appendChild(card);
    });
}

function openServiceModal(id = null) {
    const form = document.getElementById("service-form");
    form.reset();

    if (id) {
        document.getElementById("modal-service-title").textContent = "Modify Service Pricing";
        const s = servicesCache.find(x => x.serviceId === id);
        if (s) {
            document.getElementById("service-id-input").value = s.serviceId;
            document.getElementById("service-name-input").value = s.serviceName;
            document.getElementById("service-price-input").value = s.price;
        }
    } else {
        document.getElementById("modal-service-title").textContent = "Configure New Service";
        document.getElementById("service-id-input").value = "";
    }

    openModal("modal-service");
}

function saveService(e) {
    e.preventDefault();
    const id = document.getElementById("service-id-input").value;
    const serviceName = document.getElementById("service-name-input").value.trim();
    const price = parseFloat(document.getElementById("service-price-input").value);

    const payload = { serviceName, price };
    let method = "POST";

    if (id) {
        payload.serviceId = parseInt(id);
        method = "PUT";
    }

    fetch(`${API_BASE}/services`, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Saving service config failed");
        return res.json();
    })
    .then(() => {
        showToast("Service settings updated!", "success");
        closeModal("modal-service");
        fetchServices();
    })
    .catch(err => showToast(err.message, "error"));
}

function deleteService(id) {
    if (!confirm("Are you sure you want to delete this service type?")) return;

    fetch(`${API_BASE}/services?id=${id}`, { method: "DELETE" })
    .then(res => {
        if (!res.ok) throw new Error("Deleting service failed");
        return res.json();
    })
    .then(() => {
        showToast("Service deleted.", "success");
        fetchServices();
    })
    .catch(err => showToast(err.message, "error"));
}

// 7. ORDER WORKFLOWS
function initOrderForm() {
    const form = document.getElementById("order-creation-form");
    form.reset();
    document.getElementById("order-items-rows-container").innerHTML = "";
    document.getElementById("order-total-price-display").textContent = "LKR 0.00";
    
    const previewBox = document.getElementById("selected-customer-preview-box");
    if (previewBox) previewBox.style.display = "none";

    const staffGroup = document.getElementById("order-customer-select-group");
    const customerGroup = document.getElementById("order-customer-locked-group");

    if (currentRole === "customer") {
        staffGroup.style.display = "none";
        customerGroup.style.display = "block";
        document.getElementById("order-customer-locked-name").textContent = currentUsername;
        document.getElementById("order-customer-locked-details").textContent = `Logged in customer session ID: #${currentCustomerId}`;
        document.getElementById("order-form-title").textContent = "Place Laundry Order";
    } else {
        staffGroup.style.display = "block";
        customerGroup.style.display = "none";
        document.getElementById("order-form-title").textContent = "Create New Laundry Order";
    }

    Promise.all([
        fetch(`${API_BASE}/customers`).then(r => r.json()),
        fetch(`${API_BASE}/services`).then(r => r.json())
    ])
    .then(([customers, services]) => {
        customersCache = customers;
        servicesCache = services;

        if (currentRole === "staff") {
            populateCustomersDropdown();
        }
        addOrderRow();
    })
    .catch(() => showToast("Error loading catalog settings", "error"));
}

function updateSelectedCustomerPreview() {
    const select = document.getElementById("order-customer-select");
    const previewBox = document.getElementById("selected-customer-preview-box");
    const nameEl = document.getElementById("selected-cust-preview-name");
    const detailsEl = document.getElementById("selected-cust-preview-details");

    if (!select || !previewBox) return;

    const selectedId = parseInt(select.value);
    if (!selectedId) {
        previewBox.style.display = "none";
        return;
    }

    const customer = customersCache.find(c => ((c.id && c.id === selectedId) || (c.customerId && c.customerId === selectedId)));
    if (customer) {
        nameEl.textContent = customer.name;
        detailsEl.textContent = `📞 Phone: ${customer.phone}  |  📍 Address: ${customer.address || 'N/A'}`;
        previewBox.style.display = "block";
    } else {
        previewBox.style.display = "none";
    }
}

function populateCustomersDropdown() {
    const select = document.getElementById("order-customer-select");
    if (!select) return;

    if (!customersCache || customersCache.length === 0) {
        fetch(`${API_BASE}/customers`)
            .then(res => res.json())
            .then(data => {
                customersCache = data;
                renderSelectOptions(data);
            })
            .catch(() => {
                select.innerHTML = `<option value="" disabled selected>Error loading customers.</option>`;
            });
    } else {
        renderSelectOptions(customersCache);
    }

    function renderSelectOptions(list) {
        select.innerHTML = `<option value="" disabled selected>-- Select Customer --</option>`;
        if (!list || list.length === 0) {
            select.innerHTML = `<option value="" disabled selected>No registered customers found. Click "+ New" to add one!</option>`;
            return;
        }
        list.forEach(c => {
            const cid = c.id || c.customerId;
            const opt = document.createElement("option");
            opt.value = cid;
            opt.textContent = `${c.name} (${c.phone})`;
            select.appendChild(opt);
        });
    }
}

function addOrderRow() {
    const container = document.getElementById("order-items-rows-container");
    const rowId = 'row-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    
    const row = document.createElement("div");
    row.className = "builder-row";
    row.id = rowId;

    let serviceOptions = `<option value="" disabled selected>-- Select Service --</option>`;
    servicesCache.forEach(s => {
        serviceOptions += `<option value="${s.serviceId}" data-price="${s.price}">${escapeHTML(s.serviceName)} (LKR ${s.price.toFixed(2)})</option>`;
    });

    row.innerHTML = `
        <select class="service-select" required onchange="calculateOrderTotals()">
            ${serviceOptions}
        </select>
        <input type="number" class="qty-input" min="1" value="1" required oninput="calculateOrderTotals()">
        <span style="font-size:0.9rem; color:var(--text-muted);">x Price</span>
        <span class="subtotal-val" style="font-weight:600; color:var(--color-secondary); min-width:80px; text-align:right;">LKR 0.00</span>
        <button type="button" class="btn-delete-row" onclick="deleteOrderRow('${rowId}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
        </button>
    `;
    container.appendChild(row);
    calculateOrderTotals();
}

function deleteOrderRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        calculateOrderTotals();
    }
}

function calculateOrderTotals() {
    let orderTotal = 0;
    const rows = document.querySelectorAll("#order-items-rows-container .builder-row");
    
    rows.forEach(row => {
        const select = row.querySelector(".service-select");
        const qtyInput = row.querySelector(".qty-input");
        const subtotalSpan = row.querySelector(".subtotal-val");
        
        let subtotal = 0;
        const selectedOpt = select.options[select.selectedIndex];
        
        if (selectedOpt && selectedOpt.value) {
            const price = parseFloat(selectedOpt.getAttribute("data-price"));
            const qty = parseInt(qtyInput.value) || 0;
            subtotal = price * qty;
        }
        
        subtotalSpan.textContent = `LKR ${subtotal.toFixed(2)}`;
        orderTotal += subtotal;
    });

    document.getElementById("order-total-price-display").textContent = `LKR ${orderTotal.toFixed(2)}`;
}

function submitOrder(e) {
    e.preventDefault();
    
    let customerId = null;
    if (currentRole === "customer") {
        customerId = currentCustomerId;
    } else {
        customerId = parseInt(document.getElementById("order-customer-select").value);
    }

    if (!customerId) {
        showToast("Please select a customer.", "error");
        return;
    }

    const items = [];
    const rows = document.querySelectorAll("#order-items-rows-container .builder-row");
    
    rows.forEach(row => {
        const serviceSelect = row.querySelector(".service-select");
        const qtyInput = row.querySelector(".qty-input");
        
        const serviceId = parseInt(serviceSelect.value);
        const quantity = parseInt(qtyInput.value) || 0;
        
        if (serviceId && quantity > 0) {
            items.push({ serviceId, quantity });
        }
    });

    if (items.length === 0) {
        showToast("Add at least one service item line.", "error");
        return;
    }

    const payload = { customerId, items };

    fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Order creation failed.");
        return res.json();
    })
    .then(() => {
        showToast("Laundry order submitted!", "success");
        loadView("orders");
    })
    .catch(err => showToast(err.message, "error"));
}

function fetchOrders() {
    let url = `${API_BASE}/orders`;
    if (currentRole === "customer") {
        url += `?customerId=${currentCustomerId}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            ordersCache = data;
            renderOrdersTable(data);
        })
        .catch(() => showToast("Error loading orders registers", "error"));
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById("orders-list-body");
    tbody.innerHTML = "";

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No orders recorded.</td></tr>`;
        return;
    }

    orders.forEach(o => {
        const tr = document.createElement("tr");
        
        let detailsHtml = "";
        o.items.forEach(it => {
            detailsHtml += `<div style="font-size:0.85rem;"><span style="color:var(--text-secondary); font-weight:600;">${it.quantity}x</span> ${escapeHTML(it.serviceName)}</div>`;
        });

        let actionControlHtml = "";
        if (currentRole === "staff") {
            const statuses = ["Pending", "Washing", "Drying", "Ironing", "Ready for Pickup", "Completed"];
            let statusSelect = `<select onchange="updateOrderStatus(${o.orderId}, this.value)" class="form-input" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; width: auto; background: rgba(30,41,59,0.7); border-radius: var(--radius-sm);">`;
            statuses.forEach(st => {
                const isSelected = st === o.status ? "selected" : "";
                statusSelect += `<option value="${st}" ${isSelected}>${st}</option>`;
            });
            statusSelect += `</select>`;
            
            actionControlHtml = `
                <div style="display:flex; gap:0.5rem; justify-content:flex-end; align-items:center;">
                    ${statusSelect}
                    <button class="btn btn-sm btn-secondary" onclick="openReceiptModal(${o.orderId})">Receipt</button>
                </div>
            `;
        } else {
            // Customer role view (read only select, status is a badge, receipt link only)
            actionControlHtml = `
                <div style="display:flex; gap:0.5rem; justify-content:flex-end; align-items:center;">
                    <button class="btn btn-sm btn-secondary" onclick="openReceiptModal(${o.orderId})">View Receipt</button>
                </div>
            `;
        }

        tr.innerHTML = `
            <td style="font-weight:600;">#${o.orderId}</td>
            <td>
                <div style="font-weight:600;">${escapeHTML(o.customerName)}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">Client ID: #${o.customerId}</div>
            </td>
            <td style="font-size:0.85rem; color:var(--text-secondary);">${o.orderDate}</td>
            <td>${detailsHtml}</td>
            <td style="font-weight:700; color:var(--color-secondary);">LKR ${o.totalAmount.toFixed(2)}</td>
            <td>
                <span class="badge badge-${o.status.toLowerCase().replace(/\s/g, '-')}">${o.status}</span>
            </td>
            <td style="text-align: right;">
                ${actionControlHtml}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterOrders() {
    const q = document.getElementById("order-search-input").value.toLowerCase().trim();
    if (!q) {
        renderOrdersTable(ordersCache);
        return;
    }
    const filtered = ordersCache.filter(o => 
        o.orderId.toString().includes(q) || 
        o.customerName.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q)
    );
    renderOrdersTable(filtered);
}

function updateOrderStatus(orderId, newStatus) {
    fetch(`${API_BASE}/orders`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus })
    })
    .then(res => {
        if (!res.ok) throw new Error("Order update failed");
        return res.json();
    })
    .then(() => {
        showToast(`Order #${orderId} status set to ${newStatus}`, "success");
        fetchOrders();
    })
    .catch(err => showToast(err.message, "error"));
}

// 8. PAYMENT RECORDS AND ACCOUNT DUE BALANCES
function fetchPayments() {
    let url = `${API_BASE}/payments`;
    if (currentRole === "customer" && currentCustomerId) {
        url += `?customerId=${currentCustomerId}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            paymentsCache = data;
            renderPaymentsTable(data);
        })
        .catch(() => showToast("Error loading payment transaction registers", "error"));
}

function renderPaymentsTable(payments) {
    const tbody = document.getElementById("payments-list-body");
    tbody.innerHTML = "";

    if (currentRole === "customer" && currentCustomerId) {
        payments = payments.filter(p => (p.customerId && p.customerId === currentCustomerId) || (p.customer_id && p.customer_id === currentCustomerId));
    }

    if (!payments || payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No payment records found.</td></tr>`;
        return;
    }

    payments.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>#${p.paymentId}</td>
            <td style="font-weight:600;">#${p.orderId}</td>
            <td>${escapeHTML(p.customerName)}</td>
            <td style="font-size:0.85rem; color:var(--text-muted);">${p.paymentDate}</td>
            <td>
                <span class="badge" style="background:rgba(255,255,255,0.05); border:1px solid var(--border-glass);">${p.paymentMethod}</span>
            </td>
            <td style="text-align: right; font-weight: 700; color: var(--color-success);">LKR ${p.amount.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openPaymentModal() {
    const select = document.getElementById("payment-order-select");
    select.innerHTML = `<option value="" disabled selected>-- Select Order --</option>`;
    document.getElementById("payment-amount-input").value = "";
    document.getElementById("payment-due-hint").textContent = "Select an order to view pending balance.";

    Promise.all([
        fetch(`${API_BASE}/orders`).then(r => r.json()),
        fetch(`${API_BASE}/payments`).then(r => r.json())
    ])
    .then(([orders, payments]) => {
        const paidTotals = {};
        payments.forEach(p => {
            paidTotals[p.orderId] = (paidTotals[p.orderId] || 0) + p.amount;
        });

        const pendingOrders = orders.filter(o => {
            const paid = paidTotals[o.orderId] || 0;
            return o.totalAmount > paid;
        });

        if (pendingOrders.length === 0) {
            select.innerHTML = `<option value="" disabled selected>No orders with pending balance.</option>`;
        } else {
            pendingOrders.forEach(o => {
                const paid = paidTotals[o.orderId] || 0;
                const due = o.totalAmount - paid;
                const opt = document.createElement("option");
                opt.value = o.orderId;
                opt.setAttribute("data-due", due);
                opt.textContent = `Order #${o.orderId} - ${o.customerName} (Total: LKR ${o.totalAmount.toFixed(2)}, Due: LKR ${due.toFixed(2)})`;
                select.appendChild(opt);
            });
        }
        openModal("modal-payment");
    })
    .catch(() => showToast("Error rendering payments form components", "error"));
}

function updatePaymentDueHint() {
    const select = document.getElementById("payment-order-select");
    const opt = select.options[select.selectedIndex];
    const hint = document.getElementById("payment-due-hint");
    const amountInput = document.getElementById("payment-amount-input");

    if (opt && opt.value) {
        const due = parseFloat(opt.getAttribute("data-due"));
        hint.textContent = `Outstanding balance due: LKR ${due.toFixed(2)}`;
        amountInput.value = due.toFixed(2);
        amountInput.max = due;
    }
}

function savePayment(e) {
    e.preventDefault();
    const orderId = parseInt(document.getElementById("payment-order-select").value);
    const amount = parseFloat(document.getElementById("payment-amount-input").value);
    const paymentMethod = document.getElementById("payment-method-select").value;

    if (!orderId || !amount || amount <= 0) {
        showToast("Enter a valid order and amount.", "error");
        return;
    }

    fetch(`${API_BASE}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, amount, paymentMethod })
    })
    .then(res => {
        if (!res.ok) throw new Error("Payment record transaction failed.");
        return res.json();
    })
    .then(() => {
        showToast("Payment transaction saved!", "success");
        closeModal("modal-payment");
        fetchPayments();
    })
    .catch(err => showToast(err.message, "error"));
}

// 9. MONOSPACE RECEIPT DRAWER
function openReceiptModal(orderId) {
    Promise.all([
        fetch(`${API_BASE}/orders?id=${orderId}`).then(r => r.json()),
        fetch(`${API_BASE}/payments`).then(r => r.json()),
        fetch(`${API_BASE}/customers`).then(r => r.json())
    ])
    .then(([orders, payments, customers]) => {
        const order = orders.find(x => x.orderId === orderId);
        if (!order) {
            showToast("Order specifications not found.", "error");
            return;
        }

        const orderPayments = payments.filter(p => p.orderId === orderId);
        const totalPaid = orderPayments.reduce((sum, p) => sum + p.amount, 0);
        const balanceDue = Math.max(0, order.totalAmount - totalPaid);

        const customer = customers.find(x => x.id === order.customerId);
        const printArea = document.getElementById("receipt-modal-content-area");
        
        let itemsRows = "";
        order.items.forEach(it => {
            const price = it.price || (it.subtotal / it.quantity);
            itemsRows += `
                <tr>
                    <td>${escapeHTML(it.serviceName)}</td>
                    <td>${it.quantity}</td>
                    <td>LKR ${price.toFixed(2)}</td>
                    <td style="text-align:right;">LKR ${it.subtotal.toFixed(2)}</td>
                </tr>
            `;
        });

        let paymentsHistory = "";
        if (orderPayments.length > 0) {
            paymentsHistory += `<div class="divider"></div><div style="font-weight:700; margin-bottom:0.25rem;">COLLECTIONS LOG:</div>`;
            orderPayments.forEach(p => {
                paymentsHistory += `
                    <div class="receipt-row">
                      <span>  Date: ${p.paymentDate} (${p.paymentMethod})</span>
                      <span style="font-weight:600;">-LKR ${p.amount.toFixed(2)}</span>
                    </div>
                `;
            });
        }

        printArea.innerHTML = `
            <h2>CleanCycles Laundry</h2>
            <div class="divider"></div>
            
            <div class="receipt-row">
                <span><strong>RECEIPT ID:</strong> #${order.orderId}</span>
                <span><strong>DATE:</strong> ${order.orderDate}</span>
            </div>
            <div class="divider"></div>
            
            <div><strong>CLIENT DETAILS:</strong></div>
            <div>Name: ${escapeHTML(order.customerName)}</div>
            <div>Phone: ${escapeHTML(customer ? customer.phone : '-')}</div>
            <div>Address: ${escapeHTML(customer ? customer.address : '-')}</div>
            <div class="divider"></div>

            <table class="receipt-table">
                <thead>
                    <tr>
                        <th style="text-align:left;">Service</th>
                        <th style="text-align:left;">Qty</th>
                        <th style="text-align:left;">Rate</th>
                        <th style="text-align:right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>
            
            <div class="divider"></div>
            <div class="receipt-row">
                <span>SUBTOTAL:</span>
                <span>LKR ${order.totalAmount.toFixed(2)}</span>
            </div>
            <div class="receipt-total">
                TOTAL AMOUNT: LKR ${order.totalAmount.toFixed(2)}
            </div>
            
            ${paymentsHistory}
            
            <div class="divider"></div>
            <div class="receipt-row" style="font-size:1.1rem; font-weight:700;">
                <span>BALANCE DUE:</span>
                <span style="${balanceDue > 0 ? 'color:var(--color-danger);' : 'color:var(--color-success);'}">LKR ${balanceDue.toFixed(2)}</span>
            </div>
            
            <div class="divider"></div>
            <div style="text-align:center; font-size:0.75rem; font-style:italic; color:#64748b; margin-top:1rem;">
                Thank you for your business! Please collect your laundry within 7 days of ready notification.
            </div>
        `;
        
        openModal("modal-receipt");
    })
    .catch(() => showToast("Error compiling print invoice", "error"));
}

// 10. STATISTICS ENGINE - STAFF
function fetchDashboardStats() {
    fetch(`${API_BASE}/dashboard-stats`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("stat-customers").textContent = data.totalCustomers;
            document.getElementById("stat-orders").textContent = data.activeOrders;
            document.getElementById("stat-revenue").textContent = `LKR ${data.totalRevenue.toFixed(2)}`;
            document.getElementById("stat-services").textContent = data.totalServices;

            renderRecentOrdersList(data.recentOrders);
            renderDashboardPieChart(data.statusBreakup);
            renderPaymentMethodsList(data.paymentMethods);
        })
        .catch(() => showToast("Error pulling metrics stats", "error"));
}

function renderRecentOrdersList(orders) {
    const tbody = document.getElementById("recent-orders-list");
    tbody.innerHTML = "";

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No orders found.</td></tr>`;
        return;
    }

    orders.forEach(o => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight:600;">#${o.orderId}</td>
            <td>${escapeHTML(o.customerName)}</td>
            <td style="font-size:0.8rem; color:var(--text-secondary);">${o.orderDate}</td>
            <td style="font-weight:600; color:var(--color-secondary);">LKR ${o.totalAmount.toFixed(2)}</td>
            <td>
                <span class="badge badge-${o.status.toLowerCase().replace(/\s/g, '-')}">${o.status}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPaymentMethodsList(methods) {
    const container = document.getElementById("payment-methods-breakdown");
    container.innerHTML = "";

    const keys = Object.keys(methods);
    if (keys.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem; text-align:center;">No payment records.</div>`;
        return;
    }

    keys.forEach(method => {
        const m = methods[method];
        const row = document.createElement("div");
        row.style = "display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; padding: 0.25rem 0;";
        row.innerHTML = `
            <span>💳 <strong>${method}</strong> (${m.count} logs)</span>
            <span style="font-weight:700; color:var(--color-success);">LKR ${m.amount.toFixed(2)}</span>
        `;
        container.appendChild(row);
    });
}

// 11. STATISTICS ENGINE - CLIENT/CUSTOMER SPACE
function fetchCustomerDashboardStats() {
    Promise.all([
        fetch(`${API_BASE}/orders?customerId=${currentCustomerId}`).then(r => r.json()),
        fetch(`${API_BASE}/payments?customerId=${currentCustomerId}`).then(r => r.json())
    ])
    .then(([orders, payments]) => {
        // Calculate totals
        const activeOrders = orders.filter(o => o.status !== "Completed");
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        const totalCost = orders.reduce((sum, o) => sum + o.totalAmount, 0);
        const dueBalance = Math.max(0, totalCost - totalPayments);

        document.getElementById("cust-stat-active").textContent = activeOrders.length;
        document.getElementById("cust-stat-revenue").textContent = `LKR ${totalPayments.toFixed(2)}`;
        document.getElementById("cust-stat-balance").textContent = `LKR ${dueBalance.toFixed(2)}`;

        // Render customer active orders list in table
        const tbody = document.getElementById("cust-active-orders-tbody");
        tbody.innerHTML = "";

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding:2rem;">No orders registered. Click "Place Order" above to schedule!</td></tr>`;
            return;
        }

        orders.forEach(o => {
            let details = "";
            o.items.forEach(it => {
                details += `<div style="font-size:0.8rem;"><span style="font-weight:600;">${it.quantity}x</span> ${escapeHTML(it.serviceName)}</div>`;
            });

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight:600;">#${o.orderId}</td>
                <td style="font-size:0.8rem; color:var(--text-muted);">${o.orderDate}</td>
                <td>${details}</td>
                <td style="font-weight:700; color:var(--color-secondary);">LKR ${o.totalAmount.toFixed(2)}</td>
                <td>
                    <span class="badge badge-${o.status.toLowerCase().replace(/\s/g, '-')}">${o.status}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="openReceiptModal(${o.orderId})">Receipt</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(() => showToast("Error compiling your dashboard space details", "error"));
}

function fetchReports() {
    fetch(`${API_BASE}/dashboard-stats`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("report-gross-revenue").textContent = `LKR ${data.totalRevenue.toFixed(2)}`;
            document.getElementById("report-total-clients").textContent = data.totalCustomers;
            document.getElementById("report-active-orders").textContent = data.activeOrders;
            document.getElementById("report-services-count").textContent = data.totalServices;

            renderReportsCharts(data);
        })
        .catch(() => showToast("Error pulling performance analytics", "error"));
}

// 12. CANVAS GRAPHICS ENGINE (Bar Charts and Circular Pie Charts)
function renderDashboardPieChart(statusData) {
    const canvas = document.getElementById("canvas-status-pie");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const values = Object.values(statusData);
    const keys = Object.keys(statusData);
    const total = values.reduce((s, v) => s + v, 0);

    const colors = {
        "Pending": "#ef4444",
        "Washing": "#3b82f6",
        "Drying": "#f59e0b",
        "Ironing": "#a855f7",
        "Ready for Pickup": "#06b6d4",
        "Completed": "#10b981"
    };

    if (total === 0) {
        ctx.fillStyle = "#64748b";
        ctx.font = "14px 'Outfit', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("No order status data available.", width / 2, height / 2);
        return;
    }

    const centerX = width * 0.3;
    const centerY = height / 2;
    const radius = Math.min(width * 0.22, height * 0.35);

    let startAngle = 0;
    keys.forEach(status => {
        const val = statusData[status] || 0;
        if (val === 0) return;

        const sliceAngle = (val / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[status] || "#94a3b8";
        ctx.fill();
        startAngle += sliceAngle;
    });

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let legendY = centerY - (keys.length * 10);
    
    keys.forEach(status => {
        const val = statusData[status] || 0;
        ctx.beginPath();
        ctx.rect(width * 0.58, legendY - 6, 12, 12);
        ctx.fillStyle = colors[status] || "#94a3b8";
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.font = "600 11px 'Outfit', sans-serif";
        ctx.fillText(`${status}: ${val}`, width * 0.58 + 18, legendY);
        legendY += 20;
    });
}

function renderReportsCharts(data) {
    const canvasStatus = document.getElementById("canvas-status-chart");
    if (canvasStatus) {
        const ctx = canvasStatus.getContext("2d");
        drawBarChart(canvasStatus, ctx, data.statusBreakup, "Count", {
            "Pending": "#ef4444",
            "Washing": "#3b82f6",
            "Drying": "#f59e0b",
            "Ironing": "#a855f7",
            "Ready for Pickup": "#06b6d4",
            "Completed": "#10b981"
        });
    }

    const canvasPayments = document.getElementById("canvas-payments-chart");
    if (canvasPayments) {
        const ctx = canvasPayments.getContext("2d");
        const payData = {};
        Object.keys(data.paymentMethods).forEach(k => {
            payData[k] = data.paymentMethods[k].amount;
        });
        drawBarChart(canvasPayments, ctx, payData, "Revenue (LKR)", {
            "Cash": "#10b981",
            "Card": "#3b82f6",
            "Mobile": "#06b6d4"
        });
    }
}

function drawBarChart(canvas, ctx, chartData, unitLabel, customColors = {}) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const keys = Object.keys(chartData);
    const values = Object.values(chartData);
    const maxVal = Math.max(...values, 1);

    if (keys.length === 0) {
        ctx.fillStyle = "#64748b";
        ctx.font = "14px 'Outfit', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("No data available to display.", width / 2, height / 2);
        return;
    }

    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;
    
    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#334155";
    ctx.font = "600 10px 'Outfit', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
        const yVal = (maxVal / gridLines) * i;
        const yPos = paddingTop + graphHeight - ((yVal / maxVal) * graphHeight);
        
        ctx.beginPath();
        ctx.moveTo(paddingLeft, yPos);
        ctx.lineTo(paddingLeft + graphWidth, yPos);
        ctx.stroke();

        ctx.fillText(unitLabel.includes("LKR") ? `LKR ${yVal.toFixed(2)}` : yVal.toFixed(0), paddingLeft - 8, yPos);
    }

    const barSpacing = graphWidth / keys.length;
    const barWidth = barSpacing * 0.6;

    keys.forEach((key, index) => {
        const val = chartData[key] || 0;
        const barHeight = (val / maxVal) * graphHeight;
        
        const xPos = paddingLeft + (index * barSpacing) + (barSpacing - barWidth) / 2;
        const yPos = paddingTop + graphHeight - barHeight;

        ctx.beginPath();
        const gradient = ctx.createLinearGradient(xPos, yPos, xPos, yPos + barHeight);
        const baseColor = customColors[key] || "#6366f1";
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, "rgba(99, 102, 241, 0.1)");
        ctx.fillStyle = gradient;
        ctx.fillRect(xPos, yPos, barWidth, barHeight);
        
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xPos, yPos);
        ctx.lineTo(xPos + barWidth, yPos);
        ctx.stroke();

        ctx.fillStyle = "#334155";
        ctx.font = "600 10px 'Outfit', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(key, xPos + barWidth / 2, paddingTop + graphHeight + 6);
    });
}

// 13. UTILS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
