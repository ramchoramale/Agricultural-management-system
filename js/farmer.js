// =========================================================================
//                   FARMER.JS - FARMER MODULE
// =========================================================================

let tempPhotoBase64 = null;

const farmer = {
    switchTab: (tabId) => {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const active = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick').includes(tabId));
        if (active) active.classList.add('active');
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');

        utils.simulateAPI(() => {
            const content = document.getElementById('dashboard-content');
            if (tabId === 'overview') content.innerHTML = farmer.renderOverview();
            else if (tabId === 'add') content.innerHTML = farmer.renderAdd();
            else if (tabId === 'products') content.innerHTML = farmer.renderProducts();
        }, 300, "Loading...");
    },

    renderOverview: () => {
        const user = db.getCurrentUser();
        const prods = db.getProductsByFarmer(user.id);
        const approved = prods.filter(p => p.status === 'Approved');
        const pending = prods.filter(p => p.status === 'Pending');
        const rejected = prods.filter(p => p.status === 'Rejected');
        const totalEarnings = approved.reduce((s, p) => s + (p.totalPrice || 0), 0);
        const totalExported = approved.reduce((s, p) => s + (p.quantity || 0), 0);
        
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="title">Total Products</span>
                    <span class="value">${prods.length}</span>
                </div>
                <div class="stat-card">
                    <span class="title">Total Exported (kg)</span>
                    <span class="value" style="color:var(--info);">${totalExported}</span>
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
                    <span class="title">Total Final Earnings</span>
                    <span class="value" style="color:var(--success);">${utils.formatCurrency(totalEarnings)}</span>
                </div>
            </div>`;
    },

    renderAdd: () => {
        tempPhotoBase64 = null;
        const compOptions = [...new Set(db.get('users')
            .filter(u => u.role === 'Exporter' && !u.isBlocked)
            .map(e => e.companyName))]
            .map(c => `<option value="${c}">${c}</option>`)
            .join('');

        return `
            <div class="data-card" style="max-width: 600px; margin: 0 auto;">
                <div class="data-card-header"><h2>Send Product to Company</h2></div>
                <div style="padding: 2rem;">
                    <form onsubmit="farmer.submitProduct(event)">
                        <div class="form-group">
                            <label class="form-label">Exporter Company</label>
                            <select id="f_company" class="form-control" required>${compOptions}</select>
                        </div>
                        <div class="flex gap-4 mb-4">
                            <div style="flex:1;">
                                <label class="form-label">Category</label>
                                <select id="f_cat" class="form-control" required onchange="farmer.updateMarket()">
                                    <option value="Vegetables">Vegetables</option>
                                    <option value="Fruits">Fruits</option>
                                </select>
                            </div>
                            <div style="flex:1;">
                                <label class="form-label">Crop Name</label>
                                <input type="text" id="f_name" class="form-control" required>
                            </div>
                        </div>
                        <div class="flex gap-4 mb-4">
                            <div style="flex:1;">
                                <label class="form-label">Area (Acres)</label>
                                <input type="number" id="f_area" class="form-control" required>
                            </div>
                            <div style="flex:1;">
                                <label class="form-label">Harvest Date</label>
                                <input type="date" id="f_date" class="form-control" required>
                            </div>
                        </div>
                        <div class="form-group" style="background: var(--primary-light); padding: 1rem;">
                            <label class="form-label">Upload Photo (Mandatory)</label>
                            <input type="file" accept="image/*" class="form-control" required onchange="farmer.handlePhoto(this)">
                        </div>
                        <div style="background: var(--bg-color); padding: 1rem; text-align:center; border: 1px solid var(--border);">
                            <span style="font-size: 0.9rem;">Current Live Market Price (Per 1 kg)</span><br>
                            <strong id="live_rate" style="font-size: 1.3rem;">₹0 / 1 kg</strong>
                            <p style="font-size: 0.8rem; color:var(--danger);">You CANNOT enter price or quantity. Exporter decides.</p>
                        </div>
                        <button type="submit" class="btn btn-primary w-full">Upload to Company</button>
                    </form>
                </div>
            </div>`;
    },

    renderProducts: () => {
        const user = db.getCurrentUser();
        const prods = db.getProductsByFarmer(user.id);
        
        let rows = prods.map(p => {
            let priceUI = p.status === 'Approved' 
                ? `<div style="font-size:0.8rem;">Market: ${utils.formatCurrency(p.marketPriceRef)} / 1 kg</div><div style="color:var(--success); font-weight:bold;">Final: ${utils.formatCurrency(p.exporterPrice)} / 1 kg</div>` 
                : 'Awaiting';
            
            return `<tr>
                <td><img src="${p.photo}" class="crop-thumbnail" onclick="ui.openModal('Photo', '<img src=\\'${p.photo}\\' class=\\'crop-large-img\\'>')"></td>
                <td><strong>${p.cropName}</strong><br><span style="font-size:0.8rem;">To: ${p.companyName}</span></td>
                <td>${p.status === 'Approved' ? `<b>${p.quantity} kg</b>` : 'Pending'}</td>
                <td>${ui.getBadgeHtml(p.status)}</td>
                <td>${priceUI}</td>
                <td><b>${p.status === 'Approved' ? utils.formatCurrency(p.totalPrice) : '-'}</b></td>
                <td>${p.status === 'Pending' ? `<button class="btn btn-danger btn-sm" onclick="farmer.del('${p.id}')">Delete</button>` : '-'}</td>
            </tr>`;
        }).join('');

        return `
            <div class="data-card">
                <div class="data-card-header"><h2>My Product Submissions</h2></div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Crop & Company</th>
                                <th>Assessed Qty</th>
                                <th>Status</th>
                                <th>Price/1 kg</th>
                                <th>Final Earning</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="7" class="text-center">No products uploaded yet.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
    },

    handlePhoto: (input) => {
        if (input.files[0]) {
            utils.compressImage(input.files[0], base64 => {
                tempPhotoBase64 = base64;
                utils.toast('Image ready to upload');
            });
        }
    },

    updateMarket: () => {
        const cat = document.getElementById('f_cat')?.value;
        if (!cat) return;
        const rate = MarketAPI.getPrice(cat);
        document.getElementById('live_rate').innerText = `${utils.formatCurrency(rate)} / 1 kg`;
        document.getElementById('live_rate').dataset.val = rate;
    },

    submitProduct: (e) => {
        e.preventDefault();
        const user = db.getCurrentUser();
        
        if (!tempPhotoBase64) {
            return utils.toast("Photo is mandatory!", "error");
        }

        utils.simulateAPI(() => {
            const product = {
                id: utils.generateId(),
                farmerId: user.id,
                farmerName: user.name,
                companyName: document.getElementById('f_company').value,
                category: document.getElementById('f_cat').value,
                cropName: document.getElementById('f_name').value,
                area: document.getElementById('f_area').value,
                quantity: null,
                harvestDate: document.getElementById('f_date').value,
                photo: tempPhotoBase64,
                marketPriceRef: parseInt(document.getElementById('live_rate').dataset.val) || 0,
                exporterPrice: null,
                totalPrice: null,
                status: 'Pending',
                exporterId: null,
                exporterName: null,
                date: new Date().toISOString()
            };

            db.addProduct(product);
            utils.toast('Sent Successfully!');
            farmer.switchTab('products');
        });
    },

    del: (id) => {
        if (confirm("Delete this product?")) {
            db.deleteProduct(id);
            utils.toast('Deleted');
            farmer.switchTab('products');
        }
    }
};
