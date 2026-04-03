// =========================================================================
//                  EXPORTER.JS - EXPORTER MODULE
// =========================================================================

const exporter = {
    switchTab: (tabId) => {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const active = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick').includes(tabId));
        if (active) active.classList.add('active');
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');

        utils.simulateAPI(() => {
            const content = document.getElementById('dashboard-content');
            if (tabId === 'overview') content.innerHTML = exporter.renderOverview();
            else if (tabId === 'pending') content.innerHTML = exporter.renderPending();
            else if (tabId === 'history') content.innerHTML = exporter.renderHistory();
        }, 300, "Loading...");
    },

    renderOverview: () => {
        const user = db.getCurrentUser();
        const compProds = db.getProductsByCompany(user.companyName);
        const pending = compProds.filter(p => p.status === 'Pending');
        const approved = compProds.filter(p => p.status === 'Approved');
        const rejected = compProds.filter(p => p.status === 'Rejected');
        const farmers = [...new Set(compProds.map(p => p.farmerId))].length;
        const totalRevenue = approved.reduce((s, p) => s + (p.totalPrice || 0), 0);
        const totalQuantity = approved.reduce((s, p) => s + (p.quantity || 0), 0);
        
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="title">Company Name</span>
                    <span class="value" style="font-size: 1.2rem;">${user.companyName}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Total Farmers</span>
                    <span class="value" style="color:var(--secondary);">${farmers}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Pending Pricing</span>
                    <span class="value" style="color:var(--warning);">${pending.length}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Total Approved</span>
                    <span class="value" style="color:var(--success);">${approved.length}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Total Approved Qty (kg)</span>
                    <span class="value" style="color:var(--info);">${totalQuantity}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Total Revenue Generated</span>
                    <span class="value" style="color:var(--success);">${utils.formatCurrency(totalRevenue)}</span>
                </div>
            </div>`;
    },

    renderPending: () => {
        const user = db.getCurrentUser();
        const pending = db.get('products').filter(p => p.companyName === user.companyName && p.status === 'Pending');
        
        let rows = pending.map(p => `
            <tr>
                <td><img src="${p.photo}" class="crop-thumbnail"></td>
                <td><strong>${p.cropName}</strong></td>
                <td>${p.farmerName}<br><span style="font-size:0.8rem;">${p.area} Acres</span></td>
                <td><button class="btn btn-primary btn-sm" onclick="exporter.openPricer('${p.id}')">Assess & Set Price</button></td>
            </tr>`
        ).join('');

        return `
            <div class="data-card">
                <div class="data-card-header"><h2>Products Assigned to ${user.companyName}</h2></div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Crop</th>
                                <th>Farmer Info</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="4" class="text-center">No pending products.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
    },

    renderHistory: () => {
        const user = db.getCurrentUser();
        const myHist = db.get('products').filter(p => p.exporterId === user.id && p.status !== 'Pending');
        
        let rows = myHist.map(p => `
            <tr>
                <td>${p.cropName}</td>
                <td>${p.farmerName}</td>
                <td>${ui.getBadgeHtml(p.status)}</td>
                <td>${p.quantity} kg</td>
                <td>${utils.formatCurrency(p.exporterPrice)}</td>
                <td><b>${utils.formatCurrency(p.totalPrice)}</b></td>
            </tr>`
        ).join('');

        return `
            <div class="data-card">
                <div class="data-card-header"><h2>My Export History</h2></div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Crop</th>
                                <th>Farmer</th>
                                <th>Status</th>
                                <th>Quantity (kg)</th>
                                <th>Price/1 kg</th>
                                <th>Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="6" class="text-center">No history.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
    },

    openPricer: (id) => {
        const p = db.getProductById(id);
        const html = `
            <form onsubmit="exporter.finalize(event, '${p.id}')">
                <div class="flex gap-4 mb-4">
                    <img src="${p.photo}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px;">
                    <div><strong>${p.cropName}</strong><br>Market Ref: ${utils.formatCurrency(p.marketPriceRef)} / 1 kg</div>
                </div>
                <div class="flex gap-4">
                    <div class="form-group flex-1">
                        <label class="form-label">Actual Quantity (kg)</label>
                        <input type="number" id="ex_qty" class="form-control" required oninput="exporter.calcTotal()">
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">Final Price (₹ / 1 kg)</label>
                        <input type="number" id="ex_price" class="form-control" required oninput="exporter.calcTotal()">
                    </div>
                </div>
                <div style="background: var(--primary-light); padding: 1.5rem; text-align:center; margin-bottom:1rem;">
                    Total: <span id="ex_total" style="font-size: 1.8rem; font-weight:bold;">₹0</span>
                </div>
                <div class="flex gap-2 justify-end">
                    <button type="button" class="btn btn-danger" onclick="exporter.reject('${p.id}')">Reject</button>
                    <button type="submit" class="btn btn-success">Finalize Pricing</button>
                </div>
            </form>`;
        ui.openModal(`Pricing Control: ${p.cropName}`, html);
    },

    calcTotal: () => {
        const total = (parseFloat(document.getElementById('ex_qty').value) || 0) * (parseFloat(document.getElementById('ex_price').value) || 0);
        document.getElementById('ex_total').innerText = utils.formatCurrency(total);
    },

    finalize: (e, id) => {
        e.preventDefault();
        const user = db.getCurrentUser();
        const qty = parseFloat(document.getElementById('ex_qty').value);
        const price = parseFloat(document.getElementById('ex_price').value);

        utils.simulateAPI(() => {
            db.updateProduct(id, {
                quantity: qty,
                exporterPrice: price,
                totalPrice: price * qty,
                exporterId: user.id,
                exporterName: user.name,
                status: 'Approved'
            });
            ui.closeModal();
            utils.toast('Approved!', 'success');
            exporter.switchTab('pending');
        });
    },

    reject: (id) => {
        if (!confirm("Reject this product?")) return;
        const user = db.getCurrentUser();

        utils.simulateAPI(() => {
            db.updateProduct(id, {
                status: 'Rejected',
                exporterId: user.id,
                exporterName: user.name
            });
            ui.closeModal();
            utils.toast('Rejected');
            exporter.switchTab('pending');
        });
    }
};
