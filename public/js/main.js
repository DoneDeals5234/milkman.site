document.addEventListener('DOMContentLoaded', () => {
    const API_HOST = window.location.hostname || 'localhost';
    const API_BASE = (window.location.protocol === 'file:')
        ? 'http://localhost:8080'
        : window.location.origin;
    window.API_BASE = API_BASE;

    // --- Custom Popup Logic Override ---
    window.customAlert = (title, message) => {
        return new Promise((resolve) => {
            const overlay = document.getElementById('customPopupOverlay');
            if (!overlay) return resolve(true); // fallback if missing
            document.getElementById('customPopupTitle').innerText = title || 'Alert';
            document.getElementById('customPopupMessage').innerText = message || '';
            document.getElementById('customPopupInput').style.display = 'none';
            const buttonsEl = document.getElementById('customPopupButtons');
            buttonsEl.innerHTML = `<button class="custom-popup-btn btn-confirm">OK</button>`;
            
            overlay.classList.add('active');
            buttonsEl.querySelector('.btn-confirm').onclick = () => {
                overlay.classList.remove('active');
                resolve(true);
            };
        });
    };
    
    // Override default alert
    window.alert = (msg) => {
        window.customAlert("Message", msg);
    };

    // --- Auth Modal Logic ---
    const authBtn = document.getElementById('authBtn');
    const authModal = document.getElementById('authModal');
    const closeModal = document.getElementById('closeModal');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const backBtn = document.getElementById('backBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userProfile = document.getElementById('userProfile');
    const userNameDisplay = document.getElementById('userNameDisplay');

    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');

    const authName = document.getElementById('authName');
    const authPhone = document.getElementById('authPhone');
    const authOtp = document.getElementById('authOtp');

    const DUMMY_PASSWORD = "MilkmanSecurePassword123!";

    // Check Local Session
    const checkSession = async () => {
        const user = localStorage.getItem('milkmanUser');
        const navSub = document.getElementById('navSubscription');
        const mNavSub = document.getElementById('mobileNavSubscription');
        const mNavCart = document.getElementById('mobileNavCart');
        const mNavOrders = document.getElementById('mobileNavOrders');
        const drawerAccount = document.getElementById('drawerAccountSection');

        if (window.updateCartCount) window.updateCartCount();

        if (user) {
            let userData;
            try { userData = JSON.parse(user); } catch(e) { userData = {}; }
            const firstName = (userData.name || 'User').split(' ')[0];
            const cleanPhone = (userData.phone || '').replace(/\D/g, '').replace(/^91/, '');

            if (authBtn) authBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (userNameDisplay) userNameDisplay.innerText = `Hi, ${firstName}`;
            if (document.getElementById('navCart')) document.getElementById('navCart').style.display = 'inline-block';
            if (document.getElementById('navOrders')) document.getElementById('navOrders').style.display = 'inline-block';
            if (mNavCart) mNavCart.style.display = 'flex';
            if (mNavOrders) mNavOrders.style.display = 'flex';

            if (drawerAccount) {
                drawerAccount.innerHTML = `
                    <div class="drawer-user-info">
                        <div class="drawer-avatar">${(firstName[0] || 'U').toUpperCase()}</div>
                        <div class="drawer-user-meta">
                            <div class="drawer-user-name">Hi, ${firstName}</div>
                            <div class="drawer-user-phone">${cleanPhone ? '+91 ' + cleanPhone : 'Milkman Member'}</div>
                        </div>
                    </div>
                    <button class="drawer-logout-btn" onclick="window.handleLogout ? window.handleLogout() : null">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                        Logout
                    </button>
                `;
            }

            // Check if user has active subscription to conditionally show "My Subscription" button
            const setSubDisplay = (show) => {
                const val = show ? 'inline-block' : 'none';
                const mVal = show ? 'flex' : 'none';
                if (navSub) navSub.style.display = val;
                if (mNavSub) mNavSub.style.display = mVal;
            };

            if (userData.isSubscribed) {
                setSubDisplay(true);
            } else {
                try {
                    const checkRes = await fetch(`${API_BASE}/api/subscription/my-status?phone=${encodeURIComponent(userData.phone || '')}&userId=${encodeURIComponent(userData.id || '')}`);
                    const checkData = await checkRes.json();
                    if (checkData.success && checkData.hasSubscription) {
                        userData.isSubscribed = true;
                        localStorage.setItem('milkmanUser', JSON.stringify(userData));
                        setSubDisplay(true);
                    } else {
                        setSubDisplay(false);
                    }
                } catch(e) {
                    setSubDisplay(false);
                }
            }
        } else {
            if (authBtn) authBtn.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
            if (document.getElementById('navCart')) document.getElementById('navCart').style.display = 'none';
            if (document.getElementById('navOrders')) document.getElementById('navOrders').style.display = 'none';
            if (navSub) navSub.style.display = 'none';
            if (mNavSub) mNavSub.style.display = 'none';
            if (mNavCart) mNavCart.style.display = 'none';
            if (mNavOrders) mNavOrders.style.display = 'none';

            if (drawerAccount) {
                drawerAccount.innerHTML = `
                    <div class="drawer-user-info">
                        <div class="drawer-avatar">👤</div>
                        <div class="drawer-user-meta">
                            <div class="drawer-user-name">Welcome, Guest</div>
                            <div class="drawer-user-phone">Sign in for orders & plans</div>
                        </div>
                    </div>
                    <button class="drawer-login-btn" onclick="if(window.closeMobileNav)window.closeMobileNav(); window.location.hash = 'login';">
                        Login / Sign Up
                    </button>
                `;
            }
        }
    };
    checkSession();

    // Hash Routing Logic
    const handleHashChange = () => {
        const hash = window.location.hash || '#home';
        
        // Hide all modals by default
        if (authModal) {
            authModal.classList.remove('active');
            authModal.style.display = 'none';
        }

        if (hash === '#login') {
            if (authModal) {
                authModal.classList.add('active');
                authModal.style.display = 'flex';
            }
            if (step1) step1.style.display = 'block';
            if (step2) step2.style.display = 'none';
        } else if (hash === '#verify-otp') {
            if (authModal) {
                authModal.classList.add('active');
                authModal.style.display = 'flex';
            }
            if (step1) step1.style.display = 'none';
            if (step2) step2.style.display = 'block';
        }
        
        // Retrieve all sections
        const homeSection = document.getElementById('home');
        const plansSection = document.getElementById('plans');
        const productsSection = document.getElementById('products');
        const promoRibbon = document.querySelector('.promo-ribbon');
        const cartSection = document.getElementById('cartSection');
        const ordersSection = document.getElementById('ordersSection');
        
        if (hash === '#cart') {
            // Hide Home page content
            if (homeSection) homeSection.style.display = 'none';
            if (plansSection) plansSection.style.display = 'none';
            if (productsSection) productsSection.style.display = 'none';
            if (promoRibbon) promoRibbon.style.display = 'none';
            if (ordersSection) ordersSection.style.display = 'none';

            // Show Cart page
            if (cartSection) cartSection.style.display = 'block';
            if (window.renderCart) window.renderCart();
            window.scrollTo({ top: 0, behavior: 'instant' });
        } else if (hash === '#orders') {
            window.location.href = 'orders.html';
            return;
        } else {
            // Home / Products / Plans view
            if (cartSection) cartSection.style.display = 'none';
            if (ordersSection) ordersSection.style.display = 'none';

            if (homeSection) homeSection.style.display = 'flex';
            if (plansSection) plansSection.style.display = 'block';
            if (productsSection) productsSection.style.display = 'block';
            if (promoRibbon) promoRibbon.style.display = 'block';

            if (hash === '#products' && productsSection) {
                setTimeout(() => {
                    productsSection.scrollIntoView({ behavior: 'smooth' });
                }, 50);
            } else if (hash === '#plans' && plansSection) {
                setTimeout(() => {
                    plansSection.scrollIntoView({ behavior: 'smooth' });
                }, 50);
            } else if (hash === '#home' || hash === '') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    window.handleHashChange = handleHashChange;
    window.addEventListener('hashchange', handleHashChange);
    // Execute immediately on page load so /#cart or refreshed state works seamlessly
    handleHashChange();

    // Ensure clicking Nav Cart when already on #cart re-triggers routing
    const navCartLink = document.getElementById('navCart');
    if (navCartLink) {
        navCartLink.addEventListener('click', (e) => {
            if (window.location.hash === '#cart') {
                e.preventDefault();
                handleHashChange();
            }
        });
    }

    // Ensure clicking Nav Orders when already on #orders re-triggers routing
    const navOrdersLink = document.getElementById('navOrders');
    if (navOrdersLink) {
        navOrdersLink.addEventListener('click', (e) => {
            if (window.location.hash === '#orders') {
                e.preventDefault();
                handleHashChange();
            }
        });
    }

    // Open Modal
    if (authBtn) {
        authBtn.addEventListener('click', () => {
            window.location.hash = 'login';
        });
    }

    // Close Modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            window.history.back(); // or window.location.hash = ''
        });
    }

    // Logout Handler
    const handleLogout = async () => {
        const user = localStorage.getItem('milkmanUser');
        if (user) {
            try {
                const userData = JSON.parse(user);
                const email = `${(userData.phone || '').replace(/\D/g, '')}@milkman.local`;
                await fetch(API_BASE + '/api/custom/update-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, status: 'offline' })
                });
            } catch(e) {}
        }
        
        localStorage.removeItem('milkmanUser');
        try {
            await fetch(API_BASE + '/api/auth/sign-out', { method: 'POST' });
        } catch(e) {}
        if (window.closeMobileNav) window.closeMobileNav();
        checkSession();
    };
    window.handleLogout = handleLogout;

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Step 1: Request OTP or Smart Passwordless Login
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', async () => {
            let phone = authPhone.value.trim().replace(/\D/g, '');
            const name = authName.value.trim();

            if (!phone || (phone.length !== 10 && phone.length !== 12)) {
                return window.customAlert ? await customAlert("Invalid Phone", "Please enter a valid 10-digit mobile number") : alert("Please enter a valid 10-digit mobile number");
            }

            // Auto-prepend 91
            if (phone.length === 10) phone = '91' + phone;

            sendOtpBtn.innerText = "Checking account...";
            sendOtpBtn.disabled = true;

            try {
                // 1. Check if user is already registered in DB (e.g. added by staff or previous order)
                const checkRes = await fetch(API_BASE + '/api/custom/check-user-auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: phone })
                });

                const checkData = await checkRes.json();

                if (checkData.isListed && checkData.user) {
                    // Smart zero-friction instant login!
                    const loggedUser = {
                        id: checkData.user.id,
                        name: checkData.user.name || name || 'Customer',
                        phone: checkData.user.phone || phone,
                        email: checkData.user.email,
                        deliveryArea: checkData.user.deliveryArea,
                        houseNo: checkData.user.houseNo,
                        deviceToken: checkData.user.deviceToken,
                        isSubscribed: !!checkData.user.isSubscribed
                    };

                    localStorage.setItem('milkmanUser', JSON.stringify(loggedUser));
                    if (checkData.user.deviceToken) {
                        localStorage.setItem('milkmanDeviceToken', checkData.user.deviceToken);
                    }

                    // Update online status in background
                    try {
                        await fetch(API_BASE + '/api/custom/update-status', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: loggedUser.email, status: 'active', phone: loggedUser.phone })
                        });
                    } catch(e) {}

                    // Close modal
                    if (authModal) {
                        authModal.classList.remove('active');
                        authModal.style.display = 'none';
                    }
                    window.location.hash = '';

                    if (window.customAlert) {
                        await customAlert("Welcome Back!", `Welcome back, ${loggedUser.name}! You are logged in.`);
                    }

                    checkSession();

                    // If on subscription page, reload
                    if (typeof loadMySubscription === 'function') {
                        loadMySubscription();
                    }
                    return;
                }

                // 2. User is not yet registered, verify via WhatsApp OTP
                if (!name) {
                    sendOtpBtn.innerText = "Get OTP via WhatsApp";
                    sendOtpBtn.disabled = false;
                    return window.customAlert ? await customAlert("Name Required", "Please enter your full name to create an account.") : alert("Please enter your name");
                }

                sendOtpBtn.innerText = "Sending OTP...";
                const response = await fetch(API_BASE + '/api/custom/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: phone })
                });

                const data = await response.json();
                if (response.ok) {
                    window.location.hash = 'verify-otp';
                } else {
                    if (window.customAlert) await customAlert("OTP Failed", data.error || "Failed to send OTP");
                    else alert(data.error || "Failed to send OTP");
                }
            } catch (error) {
                console.error("Auth error:", error);
                if (window.customAlert) await customAlert("Connection Error", "Backend server is unreachable.");
                else alert("Server is not running.");
            } finally {
                sendOtpBtn.innerText = "Get OTP via WhatsApp";
                sendOtpBtn.disabled = false;
            }
        });
    }

    // Back Button in Step 2
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    // Add Enter key listeners
    if (authPhone) {
        authPhone.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') sendOtpBtn.click();
        });
    }
    if (authOtp) {
        authOtp.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') verifyOtpBtn.click();
        });
    }

    // Step 2: Verify OTP and Login
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', async () => {
            let phone = authPhone.value.trim().replace(/\D/g, '');
            if (phone.length === 10) phone = '91' + phone;
            
            const name = authName.value.trim();
            const otp = authOtp.value.trim();

            if (!otp) return alert("Please enter the OTP");

            verifyOtpBtn.innerText = "Verifying...";
            verifyOtpBtn.disabled = true;

            try {
                // 1. Verify OTP with our custom endpoint
                const verifyRes = await fetch(API_BASE + '/api/custom/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: phone, otp })
                });

                if (!verifyRes.ok) {
                    throw new Error("Invalid OTP");
                }

                const email = `${phone.replace(/\D/g, '')}@milkman.local`;

                // 2. Try to Sign In (if user exists)
                let authRes = await fetch(API_BASE + '/api/auth/sign-in/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: DUMMY_PASSWORD })
                });

                // 3. If Sign In fails, Sign Up!
                if (!authRes.ok) {
                    authRes = await fetch(API_BASE + '/api/auth/sign-up/email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password: DUMMY_PASSWORD, name })
                    });
                }

                const authData = await authRes.json();

                if (authRes.ok) {
                    // Success! Save session and close modal
                    const userId = authData.user ? authData.user.id : '';
                    localStorage.setItem('milkmanUser', JSON.stringify({ 
                        id: userId, 
                        name: authData.user.name, 
                        phone, 
                        email, 
                        isSubscribed: false 
                    }));
                    authModal.classList.remove('active');
                    checkSession();
                    
                    // Mark as active
                    try {
                        await fetch(API_BASE + '/api/custom/update-status', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, status: 'active', phone })
                        });
                    } catch(e) {}
                    
                    // Init FCM
                    if (window.initFirebaseFCM) window.initFirebaseFCM(phone);
                    
                    alert("Successfully logged in! 🎉");
                } else {
                    throw new Error(authData.message || "Auth failed");
                }

            } catch (error) {
                alert(error.message);
            } finally {
                verifyOtpBtn.innerText = "Verify & Proceed";
                verifyOtpBtn.disabled = false;
            }
        });
    }


    // --- Product Loading Logic ---
    const productsGrid = document.getElementById('productsGrid');
    
    async function loadProducts() {
        if (!productsGrid) return;
        
        try {
            const res = await fetch(API_BASE + '/api/products');
            const data = await res.json();
            
            if (data.success && data.products) {
                productsGrid.innerHTML = ''; // clear loading state
                
                if (data.products.length === 0) {
                    productsGrid.innerHTML = '<p style="text-align:center; width:100%; grid-column: 1/-1; color: var(--text-light);">No products available yet.</p>';
                    return;
                }
                
                data.products.forEach(product => {
                    const card = document.createElement('div');
                    card.className = 'product-card';
                    card.innerHTML = `
                        <img src="${product.image_url || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400'}" alt="${product.name}" class="product-image">
                        <h3 class="product-title" style="text-align: left;">${product.name}</h3>
                        <p class="product-desc" style="text-align: left;">${product.description || ''}</p>
                        
                        <div class="product-features">
                            <div class="product-feature">
                                <div class="feature-icon icon-green">
                                    <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21.5c-5.25 0-9.5-4.25-9.5-9.5 0-2 1.5-6.5 4.5-9.5 1-1 2.5-1 4.5 1.5 1.5 2 2.5 4.5 3.5 8 1 3.5-1 7.5-3 9.5z"/></svg>
                                </div>
                                <div class="feature-text">100% Pure</div>
                            </div>
                            <div class="product-feature">
                                <div class="feature-icon icon-blue">
                                    <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>
                                </div>
                                <div class="feature-text">Rich Nutrition</div>
                            </div>
                            <div class="product-feature">
                                <div class="feature-icon icon-purple">
                                    <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                </div>
                                <div class="feature-text">No Added Preservatives</div>
                            </div>
                            <div class="product-feature">
                                <div class="feature-icon icon-orange">
                                    <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10h11M16 10l3 3v4M5 17h11M7 17a2 2 0 11-4 0 2 2 0 014 0zm11 0a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                </div>
                                <div class="feature-text">Fast Delivery</div>
                            </div>
                        </div>

                        <div class="product-footer">
                            <div class="product-price-new">₹${product.price}</div>
                            <div class="product-unit-new">${product.quantity || '1 Litre'}</div>
                            
                            <button class="btn-add-cart-new btn-add-cart" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">
                                <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                Add to Cart
                            </button>
                        </div>
                    `;
                    productsGrid.appendChild(card);
                });
                
                attachSubscribeListeners();
            }
        } catch (e) {
            console.error('Failed to load products:', e);
            if(productsGrid) productsGrid.innerHTML = '<p style="text-align:center; width:100%; grid-column: 1/-1; color: red;">Failed to load products from server.</p>';
        }
    }
    
    // Call attachSubscribeListeners initially for static elements (Plans, Promo ribbon)
    attachSubscribeListeners();
    loadProducts();
    
    // --- Professional Fly to Cart Animation Function ---
    function playFlyToCartAnimation(btnEl) {
        try {
            const headerCartBadge = document.getElementById('headerCartBadge');
            const headerCartBtn = document.getElementById('headerCartBtn');
            const navCart = document.getElementById('navCart');
            const cartCountBadge = document.getElementById('cartCount');
            
            // Determine active target element
            let targetEl = null;
            if (headerCartBtn && headerCartBtn.offsetParent !== null) {
                targetEl = headerCartBadge || headerCartBtn;
            } else if (navCart && navCart.offsetParent !== null) {
                targetEl = cartCountBadge || navCart;
            } else if (headerCartBtn) {
                targetEl = headerCartBtn;
            }

            if (!targetEl) {
                if (window.updateCartCount) window.updateCartCount();
                return;
            }

            // Find parent product card / section to locate product image
            const card = btnEl.closest('.product-card') || 
                         btnEl.closest('.product-card-new') || 
                         btnEl.closest('.plan-horizontal-ribbon') || 
                         btnEl.closest('.promo-ribbon') || 
                         btnEl;

            const img = card ? card.querySelector('img') : null;
            const startRect = (img && img.getBoundingClientRect().width > 0) ? img.getBoundingClientRect() : btnEl.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();

            // Sizing for the flying circle
            const size = Math.min(Math.max(startRect.width * 0.4, 45), 75);
            const startX = startRect.left + (startRect.width / 2) - (size / 2);
            const startY = startRect.top + (startRect.height / 2) - (size / 2);

            // Calculate trajectory distance to target center
            const targetCenterX = targetRect.left + (targetRect.width / 2);
            const targetCenterY = targetRect.top + (targetRect.height / 2);
            const deltaX = targetCenterX - (startX + size / 2);
            const deltaY = targetCenterY - (startY + size / 2);

            // Create flyer DOM element
            const flyer = document.createElement('div');
            flyer.className = 'fly-to-cart-item';
            flyer.style.width = `${size}px`;
            flyer.style.height = `${size}px`;
            flyer.style.left = `${startX}px`;
            flyer.style.top = `${startY}px`;
            flyer.style.setProperty('--target-x', `${deltaX}px`);
            flyer.style.setProperty('--target-y', `${deltaY}px`);

            let flyerSrc = '';
            const pId = btnEl.getAttribute('data-id');
            if (pId === 'promo_shobha' || btnEl.closest('.promo-ribbon')) {
                flyerSrc = 'assets/shobha_toilet_cleaner.png';
            } else if (img && img.src) {
                flyerSrc = img.src;
            }

            if (flyerSrc) {
                const flyImg = document.createElement('img');
                flyImg.src = flyerSrc;
                flyImg.alt = "Adding to cart";
                flyer.appendChild(flyImg);
            } else {
                flyer.innerHTML = '<span class="fly-fallback-icon">🥛</span>';
            }

            document.body.appendChild(flyer);

            // On impact with Cart (820ms duration)
            setTimeout(() => {
                flyer.remove();

                // Increment count right on impact for maximum tactile feel
                if (window.updateCartCount) window.updateCartCount();

                // Trigger badge pop & glow on target badges
                [headerCartBadge, cartCountBadge].forEach(badge => {
                    if (badge && badge.offsetParent !== null) {
                        badge.classList.remove('cart-pop-active');
                        void badge.offsetWidth; // Force reflow
                        badge.classList.add('cart-pop-active');
                    }
                });

                // Trigger button bounce
                [headerCartBtn, navCart].forEach(btn => {
                    if (btn && btn.offsetParent !== null) {
                        btn.classList.remove('nav-cart-bounce');
                        void btn.offsetWidth;
                        btn.classList.add('nav-cart-bounce');
                    }
                });
            }, 820);
        } catch (err) {
            console.error("Fly to cart error:", err);
            if (window.updateCartCount) window.updateCartCount();
        }
    }

    function attachSubscribeListeners() {
        document.querySelectorAll('.btn-add-cart').forEach(btn => {
            if (btn.dataset.hasCartListener) return;
            btn.dataset.hasCartListener = 'true';

            btn.addEventListener('click', (e) => {
                const userSession = localStorage.getItem('milkmanUser');
                if (!userSession) {
                    alert("Please login first to add items to cart!");
                    window.location.hash = 'login';
                    return;
                }
                
                const btnEl = e.target.closest('.btn-add-cart') || e.currentTarget;
                if (!btnEl) return;
                
                const productId = btnEl.getAttribute('data-id');
                const productName = btnEl.getAttribute('data-name');
                const price = btnEl.getAttribute('data-price');
                
                // Extract card image and unit for cart item display
                const parentCard = btnEl.closest('.product-card') || 
                                   btnEl.closest('.product-card-new') || 
                                   btnEl.closest('.plan-horizontal-ribbon') || 
                                   btnEl.closest('.promo-ribbon');
                const imgEl = parentCard ? parentCard.querySelector('img') : null;
                const unitEl = parentCard ? parentCard.querySelector('.product-unit-new') : null;
                
                let imageUrl = '';
                if (productId === 'promo_shobha' || (productName && productName.toLowerCase().includes('toilet cleaner'))) {
                    imageUrl = 'assets/shobha_toilet_cleaner.png';
                } else if (imgEl && imgEl.src) {
                    imageUrl = imgEl.src;
                } else {
                    if (productId === 'plan_cow' || productId === 'plan_cow_half') imageUrl = 'assets/cow_milk_plan.jpg';
                    else if (productId === 'plan_buffalo' || productId === 'plan_buffalo_half') imageUrl = 'assets/buffalo_milk_plan.png';
                }

                const unit = (productId === 'promo_shobha' || (productName && productName.toLowerCase().includes('toilet cleaner'))) 
                    ? '500 ml' 
                    : (unitEl ? unitEl.innerText.trim() : (productId.includes('half') ? '30 Days / 500ml' : (productId.startsWith('plan_') ? '30 Days / 1L' : '1 Litre')));

                let cart = JSON.parse(localStorage.getItem('milkmanCart') || '[]');
                let existing = cart.find(i => i.productId === productId);
                if(existing) {
                    existing.quantity += 1;
                    existing.imageUrl = imageUrl || existing.imageUrl;
                    existing.unit = unit || existing.unit;
                } else {
                    cart.push({ productId, productName, price: parseInt(price), quantity: 1, imageUrl, unit });
                }
                localStorage.setItem('milkmanCart', JSON.stringify(cart));
                
                if (btnEl.classList.contains('btn-book-plan')) {
                    if (window.updateCartCount) window.updateCartCount();
                    if (window.location.hash === '#cart') {
                        if (window.handleHashChange) window.handleHashChange();
                    } else {
                        window.location.hash = 'cart';
                    }
                    return;
                }
                
                // Play smooth Fly-to-Cart animation
                playFlyToCartAnimation(btnEl);

                // Button visual feedback
                const ogHtml = btnEl.innerHTML;
                btnEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px;">✓ Added!</span>`;
                btnEl.style.pointerEvents = 'none';
                setTimeout(() => { 
                    btnEl.innerHTML = ogHtml; 
                    btnEl.style.pointerEvents = 'auto';
                }, 1100);
            });
        });
    }



    // --- Firebase Web Push (FCM) Logic ---
    const initFirebaseFCM = async (phone) => {
        try {
            // NOTE: User must fill in their firebase config here for Web SDK!
            const firebaseConfig = {
                apiKey: "AIzaSyBlNQtRU_EmLGeUzcspfGNi4Hr1H3sdDqU",
                authDomain: "barber-app-6993a.firebaseapp.com",
                projectId: "barber-app-6993a",
                storageBucket: "barber-app-6993a.firebasestorage.app",
                messagingSenderId: "1091592092089", 
                appId: "1:1091592092089:android:03dad6d101f55c9beade68"
            };

            // Only init if API key is provided
            if (firebaseConfig.apiKey === "YOUR_API_KEY") {
                console.log("Firebase config missing, skipping FCM setup");
                return;
            }

            const app = window.initializeApp(firebaseConfig);
            const messaging = window.getMessaging(app);

            // Request permission
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                const currentToken = await window.getToken(messaging, { 
                    vapidKey: 'BH9gOHm_tq4c8-cKcbS3gsaqEmR-aCExhB5Sr9ANLXFSBD_55Bh0JRIQFHJDihUHVI_KgqgtoRk-QMOk0F77aqw' 
                });
                if (currentToken) {
                    console.log('FCM Token generated:', currentToken);
                    // Send to backend
                    await fetch(API_BASE + '/api/custom/update-player-id', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ 
                            email: `${phone.replace(/\\D/g, '')}@milkman.local`,
                            playerId: currentToken
                        })
                    });
                } else {
                    console.log('No registration token available.');
                }
            }
        } catch (error) {
            console.error('An error occurred while retrieving token. ', error);
        }
    };

    // If user is already logged in, init FCM
    const userSession = localStorage.getItem('milkmanUser');
    if (userSession) {
        const u = JSON.parse(userSession);
        if (u.phone) {
            initFirebaseFCM(u.phone);
        }
    }
    
    // Make entire Plan Horizontal Ribbon Card clickable as a Button
    document.querySelectorAll('.plan-horizontal-ribbon').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('a')) {
                const btn = card.querySelector('.btn-book-plan');
                if (btn) {
                    btn.click();
                }
            }
        });
    });

    // --- Mobile Hamburger Navigation Drawer Handlers ---
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMobileNavBtn = document.getElementById('closeMobileNavBtn');
    const mobileNavDrawer = document.getElementById('mobileNavDrawer');
    const mobileNavBackdrop = document.getElementById('mobileNavBackdrop');

    const openMobileNav = () => {
        if (mobileNavDrawer && mobileNavBackdrop) {
            mobileNavDrawer.classList.add('active');
            mobileNavBackdrop.classList.add('active');
            document.body.classList.add('drawer-open');
            document.body.style.overflow = 'hidden';
        }
    };

    const closeMobileNav = () => {
        if (mobileNavDrawer && mobileNavBackdrop) {
            mobileNavDrawer.classList.remove('active');
            mobileNavBackdrop.classList.remove('active');
            document.body.classList.remove('drawer-open');
            document.body.style.overflow = '';
        }
    };

    window.closeMobileNav = closeMobileNav;
    window.openMobileNav = openMobileNav;

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileNav);
    if (closeMobileNavBtn) closeMobileNavBtn.addEventListener('click', closeMobileNav);
    if (mobileNavBackdrop) {
        mobileNavBackdrop.addEventListener('click', closeMobileNav);
        // Isolate touches so background never scrolls or responds when touching outside the drawer
        mobileNavBackdrop.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    // Auto-close drawer on link click
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            closeMobileNav();
        });
    });

    // We also need to export it to window so we can call it on new login
    window.initFirebaseFCM = initFirebaseFCM;
});

