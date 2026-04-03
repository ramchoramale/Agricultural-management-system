// =========================================================================
//                        MAIN.JS - UTILITIES & UI
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

const MarketAPI = { 
    getPrice: (category) => { 
        const base = {'Vegetables':30, 'Fruits':50, 'Grains':35}[category] || 30; 
        return Math.round(base + (base * (Math.random() * 0.1 - 0.05))); 
    } 
};

const ui = {
    openModal: (title, html) => { 
        document.getElementById('modal-title').innerText = title; 
        document.getElementById('modal-body').innerHTML = html; 
        document.getElementById('app-modal').classList.add('active'); 
    },
    closeModal: () => document.getElementById('app-modal').classList.remove('active'),
    getBadgeHtml: (status) => {
        const map = { 'Pending': 'badge-pending', 'Approved': 'badge-approved', 'Rejected': 'badge-rejected' };
        return `<span class="badge ${map[status]}">${status}</span>`;
    }
};

const app = {
    toggleTheme: () => { 
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; 
        document.documentElement.setAttribute('data-theme', next); 
        localStorage.setItem('theme', next); 
    },
    toggleSidebar: () => document.getElementById('sidebar').classList.toggle('open')
};
