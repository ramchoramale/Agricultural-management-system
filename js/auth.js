// =========================================================================
//                    AUTH.JS - AUTHENTICATION
// =========================================================================

const auth = {
    currentRole: 'Farmer',

    setRole: (role) => {
        auth.currentRole = role;
        document.querySelectorAll('.role-card').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        
        // Show/hide exporter company field
        const field = document.getElementById('regCompanyField');
        const input = document.getElementById('regCompany');
        if (field && input) {
            role === 'Exporter' ? (field.classList.remove('hidden'), input.required = true) : (field.classList.add('hidden'), input.required = false);
        }
    },

    register: (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const pass = document.getElementById('regPassword').value;
        const role = auth.currentRole;
        const companyName = role === 'Exporter' ? document.getElementById('regCompany').value.trim() : null;

        utils.simulateAPI(() => {
            const users = db.get('users');
            if (users.some(u => u.email === email)) {
                return utils.toast('Email already used!', 'error');
            }
            
            const newUser = {
                id: utils.generateId(),
                name,
                email,
                password: pass,
                role,
                companyName,
                isBlocked: false
            };
            
            db.addUser(newUser);
            utils.toast('Registered successfully!', 'success');
            setTimeout(() => window.location.href = 'login.html', 1500);
        });
    },

    login: (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const pass = document.getElementById('loginPassword').value;
        const role = auth.currentRole;

        utils.simulateAPI(() => {
            const user = db.get('users').find(u => u.email === email && u.password === pass && u.role === role);
            
            if (user) {
                if (user.isBlocked) {
                    return utils.toast('Account Blocked.', 'error');
                }
                db.setCurrentUser(user);
                utils.toast(`Welcome, ${user.name}!`, 'success');
                setTimeout(() => window.location.href = role.toLowerCase() + '.html', 1500);
            } else {
                utils.toast('Invalid credentials.', 'error');
            }
        });
    },

    logout: () => {
        utils.simulateAPI(() => {
            db.clearCurrentUser();
            utils.toast('Logged out successfully');
            setTimeout(() => window.location.href = 'login.html', 1500);
        });
    }
};
