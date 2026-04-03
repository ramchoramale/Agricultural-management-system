// =========================================================================
//                    DB.JS - DATABASE & STORAGE
// =========================================================================

const db = {
    init: () => { 
        ['users', 'products', 'notifications'].forEach(k => { 
            if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify([])); 
        }); 
        // Set default theme
        if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'light');
        document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
    },
    
    get: (k) => JSON.parse(localStorage.getItem(k)) || [],
    
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
    
    getCurrentUser: () => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    },
    
    setCurrentUser: (user) => localStorage.setItem('currentUser', JSON.stringify(user)),
    
    clearCurrentUser: () => localStorage.removeItem('currentUser'),
    
    notify: (userId, message) => { 
        const n = db.get('notifications'); 
        n.push({ 
            id: utils.generateId(), 
            userId, 
            message, 
            date: new Date().toISOString(), 
            read: false 
        }); 
        db.set('notifications', n); 
    },

    // User methods
    getUserById: (id) => db.get('users').find(u => u.id === id),
    
    getUserByEmail: (email) => db.get('users').find(u => u.email === email),
    
    addUser: (user) => {
        const users = db.get('users');
        users.push(user);
        db.set('users', users);
        return user;
    },
    
    updateUser: (id, updates) => {
        let users = db.get('users');
        const user = users.find(u => u.id === id);
        if (user) Object.assign(user, updates);
        db.set('users', users);
        return user;
    },

    // Product methods
    addProduct: (product) => {
        const products = db.get('products');
        products.push(product);
        db.set('products', products);
        return product;
    },
    
    getProductsByFarmer: (farmerId) => db.get('products').filter(p => p.farmerId === farmerId),
    
    getProductsByCompany: (companyName) => db.get('products').filter(p => p.companyName === companyName),
    
    getProductById: (id) => db.get('products').find(p => p.id === id),
    
    updateProduct: (id, updates) => {
        let products = db.get('products');
        const product = products.find(p => p.id === id);
        if (product) Object.assign(product, updates);
        db.set('products', products);
        return product;
    },
    
    deleteProduct: (id) => {
        db.set('products', db.get('products').filter(p => p.id !== id));
    }
};
