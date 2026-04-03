// =========================================================================
//                    ADMIN.JS - ADMIN MODULE
// =========================================================================

const admin = {
    switchTab: (tabId) => {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const active = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick').includes(tabId));
        if (active) active.classList.add('active');
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');

        utils.simulateAPI(() => {
            const content = document.getElementById('dashboard-content');
            if (tabId === 'overview') content.innerHTML = admin.renderOverview();
            else if (tabId === 'transactions') content.innerHTML = admin.renderTransactions();
            else if (tabId === 'users') content.innerHTML = admin.renderUsers();
        }, 300, "Loading...");
    },

    renderOverview: () => {
        const users = db.get('users');
        const prods = db.get('products');
        const farmers = users.filter(u => u.role === 'Farmer' && !u.isBlocked).length;
        const exporters = users.filter(u => u.role === 'Exporter' && !u.isBlocked).length;
        const approved = prods.filter(p => p.status === 'Approved');
        const pending = prods.filter(p => p.status === 'Pending');
        const rejected = prods.filter(p => p.status === 'Rejected');
        const globalValue = approved.reduce((s, p) => s + (p.totalPrice || 0), 0);
        const totalQuantity = approved.reduce((s, p) => s + (p.quantity || 0), 0);
        const blockedUsers = users.filter(u => u.isBlocked).length;

        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="title">Total Farmers</span>
                    <span class="value" style="color:#10b981;">${farmers}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Total Exporters</span>
                    <span class="value" style="color:#3b82f6;">${exporters}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Blocked Users</span>
                    <span class="value" style="color:var(--danger);">${blockedUsers}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Total Products</span>
                    <span class="value">${prods.length}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Approved</span>
                    <span class="value" style="color:var(--success);">${approved.length}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Pending</span>
                    <span class="value" style="color:var(--warning);">${pending.length}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Rejected</span>
                    <span class="value" style="color:var(--danger);">${rejected.length}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Total Approved Qty (kg)</span>
                    <span class="value" style="color:var(--info);">${totalQuantity}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Global Value (Revenue)</span>
                    <span class="value" style="color:var(--success);">${utils.formatCurrency(globalValue)}</span>
                </div>
            </div>`;
    },

    renderTransactions: () => {
        let rows = db.get('products').map(p => `
            <tr>
                <td><strong>${p.companyName}</strong></td>
                <td>${p.farmerName}</td>
                <td>${p.cropName}</td>
                <td>${p.status === 'Approved' ? `${p.quantity}kg` : '-'}</td>
                <td>${ui.getBadgeHtml(p.status)}</td>
                <td><b>${p.status === 'Approved' ? utils.formatCurrency(p.totalPrice) : '-'}</b></td>
            </tr>`
        ).join('');

        return `
            <div class="data-card">
                <div class="data-card-header"><h2>All Transactions</h2></div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Company</th>
                                <th>Farmer</th>
                                <th>Crop</th>
                                <th>Quantity</th>
                                <th>Status</th>
                                <th>Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="6" class="text-center">No data.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
    },

    renderUsers: () => {
        let rows = db.get('users').filter(u => u.role !== 'Admin').map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.role} - ${u.companyName || ''}</td>
                <td>${u.email}</td>
                <td>${u.isBlocked ? 'Blocked' : 'Active'}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="admin.toggle('${u.id}', ${u.isBlocked})">${u.isBlocked ? 'Unblock' : 'Block'}</button>
                    <button class="btn btn-danger btn-sm" onclick="admin.delUser('${u.id}')">Delete</button>
                </td>
            </tr>`
        ).join('');

        return `
            <div class="data-card">
                <div class="data-card-header"><h2>Manage Users</h2></div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="5" class="text-center">No users.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
    },

    toggle: (id, status) => {
        db.updateUser(id, { isBlocked: !status });
        utils.toast('Updated');
        admin.switchTab('users');
    },

    delUser: (id) => {
        if (!confirm("Delete this user?")) return;
        const users = db.get('users').filter(u => u.id !== id);
        db.set('users', users);
        utils.toast('Deleted');
        admin.switchTab('users');
    }
};
