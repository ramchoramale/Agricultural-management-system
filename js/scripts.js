// =========================================================================
//                          UTILITIES & DATABASE
// =========================================================================
const utils = {
    generateId: () => 'ID-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    formatDate: (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
    formatCurrency: (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0),
    showLoader: (msg) => { document.getElementById('loader-text').innerText = msg; document.getElementById('loader').classList.add('active'); },
    hideLoader: () => document.getElementById('loader').classList.remove('active'),
    simulateAPI: (callback, delay = 600, msg = "Processing...") => { utils.showLoader(msg); setTimeout(() => { callback(); utils.hideLoader(); }, delay); },
    toast: (msg, type = 'success') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${type === 'error' ? '❌' : '✅'}</span> <span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.animation = 'fadeOut 0.3s forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
    },
    compressImage: (file, callback) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = e => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas'); const scale = 400 / img.width;
                canvas.width = 400; canvas.height = img.height * scale;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                callback(canvas.toDataURL('image/jpeg', 0.6));
            }
        }
    }
};

const MarketAPI = { getPrice: (category) => { const base = {'Vegetables':30, 'Fruits':50, 'Grains':35}[category] || 30; return Math.round(base + (base * (Math.random() * 0.1 - 0.05))); } };

const db = {
    init: () => { ['users', 'products', 'notifications'].forEach(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify([])); }); },
    get: (k) => JSON.parse(localStorage.getItem(k)) || [],
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
    getCurrentUser: () => JSON.parse(localStorage.getItem('currentUser')),
    notify: (userId, message) => { const n = db.get('notifications'); n.push({ id: utils.generateId(), userId, message, date: new Date().toISOString(), read: false }); db.set('notifications', n); }
};

// =========================================================================
//                          UI HELPER FUNCTIONS
// =========================================================================
const ui = {
    openModal: (title, html) => { document.getElementById('modal-title').innerText = title; document.getElementById('modal-body').innerHTML = html; document.getElementById('app-modal').classList.add('active'); },
    closeModal: () => document.getElementById('app-modal').classList.remove('active'),
    getBadgeHtml: (status) => {
        const map = { 'Pending': 'badge-pending', 'Approved': 'badge-approved', 'Rejected': 'badge-rejected' };
        return `<span class="badge ${map[status]}">${status}</span>`;
    }
};

// =========================================================================
//                          APP CORE FUNCTIONALITY
// =========================================================================
const app = {
    init: () => {
        db.init(); document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
        const user = db.getCurrentUser(); user ? app.navigate('dashboard') : app.navigate('login');
    },
    navigate: (pageId) => {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden')); document.getElementById(`page-${pageId}`).classList.remove('hidden');
        if (pageId === 'dashboard') {
            const user = db.getCurrentUser(); if (!user) return app.navigate('login');
            document.getElementById('topbar-name').innerText = user.name;
            document.getElementById('topbar-role').innerText = user.role === 'Admin' ? 'Super Admin' : (user.role === 'Exporter' ? `${user.companyName} Exporter` : 'Farmer');
            document.querySelectorAll('.sidebar-nav').forEach(n => n.classList.add('hidden')); document.getElementById(`nav-${user.role}`).classList.remove('hidden');
            dashboard.switchTab(`${user.role.toLowerCase()}-overview`);
        }
    },
    toggleTheme: () => { const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next); localStorage.setItem('theme', next); },
    toggleSidebar: () => document.getElementById('sidebar').classList.toggle('open')
};

// =========================================================================
//                          AUTHENTICATION MODULE
// =========================================================================
const auth = {
    role: { login: 'Farmer', register: 'Farmer' },
    setRole: (type, role) => {
        auth.role[type] = role;
        const container = document.getElementById(`page-${type}`);
        container.querySelectorAll('.role-card').forEach(btn => btn.classList.remove('active')); event.currentTarget.classList.add('active');
        if(type === 'register') {
            const field = document.getElementById('regCompanyField'), input = document.getElementById('regCompany');
            role === 'Exporter' ? (field.classList.remove('hidden'), input.required = true) : (field.classList.add('hidden'), input.required = false);
        }
    },
    register: (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim(), email = document.getElementById('regEmail').value.trim(), pass = document.getElementById('regPassword').value, role = auth.role.register, companyName = role === 'Exporter' ? document.getElementById('regCompany').value.trim() : null;
        utils.simulateAPI(() => {
            const users = db.get('users');
            if (users.some(u => u.email === email)) return utils.toast('Email already used!', 'error');
            users.push({ id: utils.generateId(), name, email, password: pass, role, companyName, isBlocked: false });
            db.set('users', users); utils.toast('Registered successfully!', 'success'); app.navigate('login');
        });
    },
    login: (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim(), pass = document.getElementById('loginPassword').value, role = auth.role.login;
        utils.simulateAPI(() => {
            const user = db.get('users').find(u => u.email === email && u.password === pass && u.role === role);
            if (user) {
                if(user.isBlocked) return utils.toast('Account Blocked.', 'error');
                db.set('currentUser', user); utils.toast(`Welcome, ${user.name}!`); app.navigate('dashboard');
            } else utils.toast('Invalid credentials.', 'error');
        });
    },
    logout: () => { utils.simulateAPI(() => { localStorage.removeItem('currentUser'); app.navigate('login'); }); }
};

// =========================================================================
//                          DASHBOARD MODULE
// =========================================================================
const dashboard = {
    switchTab: (tabId) => {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const active = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick').includes(tabId));
        if(active) active.classList.add('active');
        if(window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');

        utils.simulateAPI(() => {
            const content = document.getElementById('dashboard-content');
            if(tabId === 'notifications') { /* Rendering Notifs */ }
            else if(tabId.startsWith('admin')) content.innerHTML = adminUI[tabId.split('-')[1]]();
            else if(tabId.startsWith('farmer')) content.innerHTML = farmerUI[tabId.split('-')[1]]();
            else if(tabId.startsWith('exporter')) content.innerHTML = exporterUI[tabId.split('-')[1]]();
        }, 300, "Loading...");
    }
};

// =========================================================================
//                              FARMER MODULE
// =========================================================================
let tempPhotoBase64 = null;
const farmerUI = {
    overview: () => {
        const user = db.getCurrentUser(), prods = db.get('products').filter(p => p.farmerId === user.id);
        return `
            <div class="stats-grid">
                <div class="stat-card"><span class="title">My Uploads</span><span class="value">${prods.length}</span></div>
                <div class="stat-card"><span class="title">Total Final Earnings</span><span class="value" style="color:var(--success);">${utils.formatCurrency(prods.filter(p => p.status === 'Approved').reduce((s, p) => s + (p.totalPrice || 0), 0))}</span></div>
            </div>`;
    },
    add: () => {
        tempPhotoBase64 = null;
        const compOptions = [...new Set(db.get('users').filter(u => u.role === 'Exporter' && !u.isBlocked).map(e => e.companyName))].map(c => `<option value="${c}">${c}</option>`).join('');
        return `
            <div class="data-card" style="max-width: 600px; margin: 0 auto;">
                <div class="data-card-header"><h2>Send Product to Company</h2></div>
                <div style="padding: 2rem;">
                    <form onsubmit="farmerLogic.submitProduct(event)">
                        <div class="form-group"><label class="form-label">Exporter Company</label><select id="f_company" class="form-control" required>${compOptions}</select></div>
                        <div class="flex gap-4 mb-4">
                            <div style="flex:1;"><label class="form-label">Category</label><select id="f_cat" class="form-control" required onchange="farmerLogic.updateMarket()"><option value="Vegetables">Vegetables</option><option value="Fruits">Fruits</option></select></div>
                            <div style="flex:1;"><label class="form-label">Crop Name</label><input type="text" id="f_name" class="form-control" required></div>
                        </div>
                        <div class="flex gap-4 mb-4">
                            <div style="flex:1;"><label class="form-label">Area (Acres)</label><input type="number" id="f_area" class="form-control" required></div>
                            <div style="flex:1;"><label class="form-label">Harvest Date</label><input type="date" id="f_date" class="form-control" required></div>
                        </div>
                        <div class="form-group" style="background: var(--primary-light); padding: 1rem;"><label class="form-label">Upload Photo (Mandatory)</label><input type="file" accept="image/*" class="form-control" required onchange="farmerLogic.handlePhoto(this)"></div>
                        <div style="background: var(--bg-color); padding: 1rem; text-align:center; border: 1px solid var(--border);">
                            <span style="font-size: 0.9rem;">Current Live Market Price (Per 1 kg)</span><br><strong id="live_rate" style="font-size: 1.3rem;">₹0 / 1 kg</strong>
                            <p style="font-size: 0.8rem; color:var(--danger);">You CANNOT enter price or quantity. Exporter decides.</p>
                        </div>
                        <button type="submit" class="btn btn-primary w-full">Upload to Company</button>
                    </form>
                </div>
            </div>`;
    },
    products: () => {
        const user = db.getCurrentUser(), prods = db.get('products').filter(p => p.farmerId === user.id);
        let rows = prods.map(p => {
            let priceUI = p.status === 'Approved' ? `<div style="font-size:0.8rem;">Market: ${utils.formatCurrency(p.marketPriceRef)} / 1 kg</div><div style="color:var(--success); font-weight:bold;">Final: ${utils.formatCurrency(p.exporterPrice)} / 1 kg</div>` : 'Awaiting';
            return `<tr><td><img src="${p.photo}" class="crop-thumbnail" onclick="ui.openModal('Photo', '<img src=\\'${p.photo}\\' class=\\'crop-large-img\\'>')"></td><td><strong>${p.cropName}</strong><br><span style="font-size:0.8rem;">To: ${p.companyName}</span></td><td>${p.status === 'Approved' ? `<b>${p.quantity} kg</b>` : `Pending`}</td><td>${ui.getBadgeHtml(p.status)}</td><td>${priceUI}</td><td><b>${p.status === 'Approved' ? utils.formatCurrency(p.totalPrice) : '-'}</b></td><td>${p.status === 'Pending' ? `<button class="btn btn-danger btn-sm" onclick="farmerLogic.del('${p.id}')">Delete</button>` : '-'}</td></tr>`
        }).join('');
        return `<div class="data-card"><div class="data-card-header"><h2>My Product Submissions</h2></div><div class="table-responsive"><table><thead><tr><th>Photo</th><th>Crop & Company</th><th>Assessed Qty</th><th>Status</th><th>Price/1 kg</th><th>Final Earning</th><th>Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="text-center">No products uploaded yet.</td></tr>'}</tbody></table></div></div>`;
    }
};

const farmerLogic = {
    handlePhoto: (input) => { if(input.files[0]) utils.compressImage(input.files[0], base64 => { tempPhotoBase64 = base64; }); },
    updateMarket: () => { const cat = document.getElementById('f_cat')?.value; if(!cat) return; const rate = MarketAPI.getPrice(cat); document.getElementById('live_rate').innerText = `${utils.formatCurrency(rate)} / 1 kg`; document.getElementById('live_rate').dataset.val = rate; },
    submitProduct: (e) => {
        e.preventDefault(); const user = db.getCurrentUser();
        if(!tempPhotoBase64) return utils.toast("Photo is mandatory!", "error");
        utils.simulateAPI(() => {
            const prods = db.get('products');
            prods.push({ id: utils.generateId(), farmerId: user.id, farmerName: user.name, companyName: document.getElementById('f_company').value, category: document.getElementById('f_cat').value, cropName: document.getElementById('f_name').value, area: document.getElementById('f_area').value, quantity: null, harvestDate: document.getElementById('f_date').value, photo: tempPhotoBase64, marketPriceRef: parseInt(document.getElementById('live_rate').dataset.val) || 0, exporterPrice: null, totalPrice: null, status: 'Pending', exporterId: null, exporterName: null, date: new Date().toISOString() });
            db.set('products', prods); utils.toast('Sent Successfully!'); dashboard.switchTab('farmer-products');
        });
    },
    del: (id) => { if(confirm("Delete?")) { db.set('products', db.get('products').filter(p => p.id !== id)); utils.toast('Deleted'); dashboard.switchTab('farmer-products'); } }
};

// =========================================================================
//                              EXPORTER MODULE
// =========================================================================
const exporterUI = {
    overview: () => {
        const user = db.getCurrentUser(), compProds = db.get('products').filter(p => p.companyName === user.companyName);
        return `<div class="stats-grid"><div class="stat-card"><span class="title">My Company Name</span><span class="value">${user.companyName}</span></div><div class="stat-card"><span class="title">Pending Pricing Actions</span><span class="value" style="color:var(--warning);">${compProds.filter(p=>p.status==='Pending').length}</span></div></div>`;
    },
    pending: () => {
        const user = db.getCurrentUser(), pending = db.get('products').filter(p => p.companyName === user.companyName && p.status === 'Pending');
        let rows = pending.map(p => `<tr><td><img src="${p.photo}" class="crop-thumbnail"></td><td><strong>${p.cropName}</strong></td><td>${p.farmerName}<br><span style="font-size:0.8rem;">${p.area} Acres</span></td><td><button class="btn btn-primary btn-sm" onclick="exporterLogic.openPricer('${p.id}')">Assess & Set Price</button></td></tr>`).join('');
        return `<div class="data-card"><div class="data-card-header"><h2>Products Assigned to ${user.companyName}</h2></div><div class="table-responsive"><table><thead><tr><th>Photo</th><th>Crop</th><th>Farmer Info</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="text-center">No pending products.</td></tr>'}</tbody></table></div></div>`;
    },
    history: () => {
        const user = db.getCurrentUser(), myHist = db.get('products').filter(p => p.exporterId === user.id && p.status !== 'Pending');
        let rows = myHist.map(p => `<tr><td>${p.cropName}</td><td>${p.farmerName}</td><td>${ui.getBadgeHtml(p.status)}</td><td>${p.quantity} kg</td><td>${utils.formatCurrency(p.exporterPrice)}</td><td><b>${utils.formatCurrency(p.totalPrice)}</b></td></tr>`).join('');
        return `<div class="data-card"><div class="data-card-header"><h2>My Export History</h2></div><div class="table-responsive"><table><thead><tr><th>Crop</th><th>Farmer</th><th>Status</th><th>Quantity (kg)</th><th>Price/1 kg</th><th>Total Value</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="text-center">No history.</td></tr>'}</tbody></table></div></div>`;
    }
};

const exporterLogic = {
    openPricer: (id) => {
        const p = db.get('products').find(r => r.id === id);
        const html = `
            <form onsubmit="exporterLogic.finalize(event, '${p.id}')">
                <div class="flex gap-4 mb-4"><img src="${p.photo}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px;"><div><strong>${p.cropName}</strong><br>Market Ref: ${utils.formatCurrency(p.marketPriceRef)} / 1 kg</div></div>
                <div class="flex gap-4"><div class="form-group flex-1"><label class="form-label">Actual Quantity (kg)</label><input type="number" id="ex_qty" class="form-control" required oninput="exporterLogic.calcTotal()"></div><div class="form-group flex-1"><label class="form-label">Final Price (₹ / 1 kg)</label><input type="number" id="ex_price" class="form-control" required oninput="exporterLogic.calcTotal()"></div></div>
                <div style="background: var(--primary-light); padding: 1.5rem; text-align:center; margin-bottom:1rem;">Total: <span id="ex_total" style="font-size: 1.8rem; font-weight:bold;">₹0</span></div>
                <div class="flex gap-2 justify-end"><button type="button" class="btn btn-danger" onclick="exporterLogic.reject('${p.id}')">Reject</button><button type="submit" class="btn btn-success">Finalize Pricing</button></div>
            </form>`;
        ui.openModal(`Pricing Control: ${p.cropName}`, html);
    },
    calcTotal: () => { document.getElementById('ex_total').innerText = utils.formatCurrency((parseFloat(document.getElementById('ex_qty').value)||0) * (parseFloat(document.getElementById('ex_price').value)||0)); },
    finalize: (e, id) => {
        e.preventDefault(); const user = db.getCurrentUser(), qty = parseFloat(document.getElementById('ex_qty').value), price = parseFloat(document.getElementById('ex_price').value);
        utils.simulateAPI(() => {
            let prods = db.get('products'), p = prods.find(r => r.id === id);
            p.quantity = qty; p.exporterPrice = price; p.totalPrice = price * qty; p.exporterId = user.id; p.exporterName = user.name; p.status = 'Approved';
            db.set('products', prods); ui.closeModal(); utils.toast('Approved!', 'success'); dashboard.switchTab('exporter-pending');
        });
    },
    reject: (id) => {
        if(!confirm("Reject?")) return; const user = db.getCurrentUser();
        utils.simulateAPI(() => { let prods = db.get('products'), p = prods.find(r => r.id === id); p.status = 'Rejected'; p.exporterId = user.id; p.exporterName = user.name; db.set('products', prods); ui.closeModal(); utils.toast('Rejected'); dashboard.switchTab('exporter-pending'); });
    }
};

// =========================================================================
//                              ADMIN MODULE
// =========================================================================
const adminUI = {
    overview: () => {
        const users = db.get('users'), prods = db.get('products');
        return `<div class="stats-grid"><div class="stat-card"><span class="title">Total Users</span><span class="value">${users.length}</span></div><div class="stat-card"><span class="title">Global Value</span><span class="value" style="color:var(--success);">${utils.formatCurrency(prods.reduce((s,p)=>s+(p.totalPrice||0), 0))}</span></div></div>`;
    },
    transactions: () => {
        let rows = db.get('products').map(p => `<tr><td><strong>${p.companyName}</strong></td><td>${p.farmerName}</td><td>${p.cropName}</td><td>${p.status==='Approved'?`${p.quantity}kg`:'-'}</td><td>${ui.getBadgeHtml(p.status)}</td><td><b>${p.status==='Approved'?utils.formatCurrency(p.totalPrice):'-'}</b></td></tr>`).join('');
        return `<div class="data-card"><div class="data-card-header"><h2>All Transactions</h2></div><div class="table-responsive"><table><thead><tr><th>Company</th><th>Farmer</th><th>Crop</th><th>Quantity</th><th>Status</th><th>Total Value</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="text-center">No data.</td></tr>'}</tbody></table></div></div>`;
    },
    users: () => {
        let rows = db.get('users').filter(u => u.role !== 'Admin').map(u => `<tr><td>${u.name}</td><td>${u.role} - ${u.companyName||''}</td><td>${u.email}</td><td>${u.isBlocked?'Blocked':'Active'}</td><td><button class="btn btn-outline btn-sm" onclick="adminLogic.toggle('${u.id}', ${u.isBlocked})">${u.isBlocked?'Unblock':'Block'}</button> <button class="btn btn-danger btn-sm" onclick="adminLogic.delUser('${u.id}')">Delete</button></td></tr>`).join('');
        return `<div class="data-card"><div class="data-card-header"><h2>Manage Users</h2></div><div class="table-responsive"><table><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="text-center">No users.</td></tr>'}</tbody></table></div></div>`;
    }
};

const adminLogic = {
    toggle: (id, status) => { let users = db.get('users'); users.find(u => u.id === id).isBlocked = !status; db.set('users', users); utils.toast('Updated'); dashboard.switchTab('admin-users'); },
    delUser: (id) => { if(!confirm("Delete?")) return; db.set('users', db.get('users').filter(u => u.id !== id)); utils.toast('Deleted'); dashboard.switchTab('admin-users'); }
};

// Initialize app on page load
window.addEventListener('DOMContentLoaded', app.init);
