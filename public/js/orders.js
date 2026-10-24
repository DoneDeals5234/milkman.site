document.addEventListener('DOMContentLoaded', () => {
    const API_HOST = (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') 
        ? window.location.hostname 
        : 'localhost';
    const API_BASE = window.location.origin.includes(':8080')
        ? window.location.origin
        : (window.location.protocol === 'file:' ? 'http://localhost:8080' : window.location.origin);

    // Shared state
    let activeAreas = [];
    let userSavedAddress = null;
    let activeAddressMode = 'saved'; // 'saved' or 'new'

    // Helper to get product thumbnails
    function getProductThumbnail(item) {
        if (item.productId === 'promo_shobha' || (item.productName && item.productName.toLowerCase().includes('toilet cleaner'))) {
            return 'assets/shobha_toilet_cleaner.png';
        }
        if (item.productId === 'plan_cow' || item.productId === 'plan_cow_half') return 'assets/cow_milk_plan.jpg';
        if (item.productId === 'plan_buffalo' || item.productId === 'plan_buffalo_half') return 'assets/buffalo_milk_plan.png';
        if (item.imageUrl && !item.imageUrl.includes('shobha_banner')) return item.imageUrl;
        return 'assets/logo.png';
    }

    // Helper to get unit / subtitle
    function getProductUnit(item) {
        if (item.productId === 'promo_shobha' || (item.productName && item.productName.toLowerCase().includes('toilet cleaner'))) {
            return '500 ml';
        }
        if (item.unit) return item.unit;
        if (item.productId && (item.productId.includes('half') || (item.productName && item.productName.toLowerCase().includes('half liter')))) {
            return '30 Days / 500ml';
        }
        if (item.productId && item.productId.startsWith('plan_')) return '30 Days / 1L';
        return '1 Litre';
    }

    // --- Cart Logistics ---
    window.updateCartCount = () => {
        const cart = JSON.parse(localStorage.getItem('milkmanCart') || '[]');
        const count = cart.reduce((acc, item) => acc + item.quantity, 0);
        const navCart = document.getElementById('cartCount');
        if (navCart) navCart.innerText = count;
        const headerCartBadge = document.getElementById('headerCartBadge');
        if (headerCartBadge) headerCartBadge.innerText = count;
    };
    window.updateCartCount();

    // Render Professional Cart
    window.renderCart = () => {
        const cartItemsContainer = document.getElementById('cartItemsContainer');
        const cartTotalBar = document.getElementById('cartTotalBar');
        const checkoutForm = document.getElementById('checkoutForm');
        let cart = JSON.parse(localStorage.getItem('milkmanCart') || '[]');

        // Auto-heal any existing cart items for toilet cleaner image & unit
        let cartUpdated = false;
        cart.forEach(item => {
            if (item.productId === 'promo_shobha' || (item.productName && item.productName.toLowerCase().includes('toilet cleaner'))) {
                if (item.imageUrl !== 'assets/shobha_toilet_cleaner.png') {
                    item.imageUrl = 'assets/shobha_toilet_cleaner.png';
                    item.unit = '500 ml';
                    cartUpdated = true;
                }
            }
        });
        if (cartUpdated) {
            localStorage.setItem('milkmanCart', JSON.stringify(cart));
        }

        if (!cartItemsContainer) return;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart-view">
                    <div class="empty-cart-icon">🛒</div>
                    <h3>Your cart is empty</h3>
                    <p>Looks like you haven't added anything to your cart yet.</p>
                    <a href="#products" class="btn-primary" style="display: inline-block; margin-top: 15px; text-decoration: none;">Browse Fresh Products</a>
                </div>
            `;
            if (cartTotalBar) cartTotalBar.style.display = 'none';
            if (checkoutForm) checkoutForm.style.display = 'none';
            return;
        }

        // Render Item Cards matching reference design
        cartItemsContainer.innerHTML = cart.map((item, index) => `
            <div class="pro-cart-card">
                <div class="pro-cart-left">
                    <img src="${getProductThumbnail(item)}" alt="${item.productName}" class="pro-cart-img" onerror="this.src='assets/logo.png'">
                    <div class="pro-cart-details">
                        <h4 class="pro-item-title">${item.productName}</h4>
                        <div class="pro-price-row">
                            <span class="pro-item-price">₹${item.price}</span>
                            <span class="pro-multiplier-badge">x ${item.quantity}</span>
                        </div>
                        <span class="pro-item-unit">${getProductUnit(item)}</span>
                    </div>
                </div>

                <div class="pro-cart-right">
                    <div class="cart-qty-pill">
                        <button class="qty-btn qty-minus" onclick="updateQuantity(${index}, -1)" title="Decrease quantity">−</button>
                        <span class="qty-count">${item.quantity}</span>
                        <button class="qty-btn qty-plus" onclick="updateQuantity(${index}, 1)" title="Increase quantity">+</button>
                    </div>
                    <button class="btn-remove-pill" onclick="removeFromCart(${index})" title="Remove item">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        Remove
                    </button>
                </div>
            </div>
        `).join('');

        const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        // Show Total Bar
        if (cartTotalBar) {
            cartTotalBar.style.display = 'flex';
            const displayEl = document.getElementById('cartTotalAmountDisplay');
            if (displayEl) displayEl.innerText = `₹${total.toLocaleString('en-IN')}`;
        }

        // Load & Render Saved Address Form
        loadUserAddressAndRenderForm();
    };

    // Update Quantity with Stepper
    window.updateQuantity = (index, delta) => {
        let cart = JSON.parse(localStorage.getItem('milkmanCart') || '[]');
        if (!cart[index]) return;

        if (delta === -1 && cart[index].quantity <= 1) {
            window.removeFromCart(index);
            return;
        }

        cart[index].quantity += delta;
        localStorage.setItem('milkmanCart', JSON.stringify(cart));
        window.updateCartCount();
        window.renderCart();
    };

    // Remove single item
    window.removeFromCart = (index) => {
        let cart = JSON.parse(localStorage.getItem('milkmanCart') || '[]');
        cart.splice(index, 1);
        localStorage.setItem('milkmanCart', JSON.stringify(cart));
        window.updateCartCount();
        window.renderCart();
    };

    // Clear whole cart
    window.clearCart = async () => {
        let cart = JSON.parse(localStorage.getItem('milkmanCart') || '[]');
        if (cart.length === 0) return;

        const confirmed = window.customConfirm ? 
            await window.customConfirm("Clear Cart", "Are you sure you want to remove all items from your cart?") :
            confirm("Are you sure you want to remove all items from your cart?");

        if (confirmed) {
            localStorage.removeItem('milkmanCart');
            window.updateCartCount();
            window.renderCart();
        }
    };

    // Toggle Delivery Form scroll
    window.toggleDeliveryForm = (show) => {
        const form = document.getElementById('checkoutForm');
        if (form) {
            form.style.display = 'block';
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Switch between Saved Address & New Address
    window.selectAddressMode = (mode) => {
        activeAddressMode = mode;
        const optSaved = document.getElementById('optSavedAddress');
        const optNew = document.getElementById('optNewAddress');
        const newFields = document.getElementById('newAddressFields');

        if (mode === 'saved') {
            if (optSaved) {
                optSaved.classList.add('active');
                const r = optSaved.querySelector('.opt-radio-circle');
                if (r) r.innerHTML = '✓';
            }
            if (optNew) {
                optNew.classList.remove('active');
                const r = optNew.querySelector('.opt-radio-circle');
                if (r) r.innerHTML = '';
            }
            if (newFields) newFields.style.display = 'none';
        } else {
            if (optSaved) {
                optSaved.classList.remove('active');
                const r = optSaved.querySelector('.opt-radio-circle');
                if (r) r.innerHTML = '';
            }
            if (optNew) {
                optNew.classList.add('active');
                const r = optNew.querySelector('.opt-radio-circle');
                if (r) r.innerHTML = '✓';
            }
            if (newFields) newFields.style.display = 'block';
        }
    };

    // --- Load Serviceable Areas ---
    async function loadAreas() {
        try {
            const res = await fetch(API_BASE + '/api/areas');
            const data = await res.json();
            if (data.success) {
                activeAreas = data.areas;
                const select = document.getElementById('checkoutArea');
                if (select) {
                    select.innerHTML = '<option value="">Select an area...</option>' +
                        data.areas.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
                }
            }
        } catch (e) { console.error("Error loading areas"); }
    }
    loadAreas();

    // --- Load User Saved Address and Render Delivery Form ---
    async function loadUserAddressAndRenderForm() {
        const checkoutForm = document.getElementById('checkoutForm');
        if (!checkoutForm) return;

        const userSession = localStorage.getItem('milkmanUser');
        if (!userSession) {
            checkoutForm.innerHTML = `
                <div class="login-prompt-box">
                    <div class="login-prompt-icon">🔒</div>
                    <h4>Please Login to Place Order</h4>
                    <p>Log in with your phone number to use your saved address or create a new order.</p>
                    <button class="btn-primary" onclick="window.location.hash = 'login'" style="margin-top: 14px; padding: 12px 28px; border-radius: 25px; font-weight: 700;">
                        Login / Sign Up
                    </button>
                </div>
            `;
            checkoutForm.style.display = 'block';
            return;
        }

        const u = JSON.parse(userSession);
        const email = `${u.phone.replace(/\D/g, '')}@milkman.local`;

        try {
            const res = await fetch(`${API_BASE}/api/custom/user-address?email=${encodeURIComponent(email)}`);
            const data = await res.json();

            if (data.success && data.hasSavedAddress) {
                userSavedAddress = data.address;
                activeAddressMode = 'saved';
            } else {
                userSavedAddress = null;
                activeAddressMode = 'new';
            }
        } catch (e) {
            console.error("Error fetching user address:", e);
            userSavedAddress = null;
            activeAddressMode = 'new';
        }

        // Render Checkout Form
        checkoutForm.style.display = 'block';

        let addressSelectorHtml = '';
        if (userSavedAddress) {
            addressSelectorHtml = `
                <div class="address-options-wrapper">
                    <!-- Option A: Saved Address -->
                    <div class="address-option-card ${activeAddressMode === 'saved' ? 'active' : ''}" id="optSavedAddress" onclick="selectAddressMode('saved')">
                        <div class="opt-radio-circle">${activeAddressMode === 'saved' ? '✓' : ''}</div>
                        <div class="opt-details">
                            <div class="opt-header">
                                <strong>Deliver to Saved Address</strong>
                                <span class="badge-default-addr">Saved</span>
                            </div>
                            <p class="saved-addr-text">
                                🏠 <span>${userSavedAddress.houseNo}</span>${userSavedAddress.landmark ? `, <span>${userSavedAddress.landmark}</span>` : ''}
                            </p>
                            <p class="saved-area-text">📍 Area: <strong>${userSavedAddress.deliveryArea}</strong></p>
                        </div>
                    </div>

                    <!-- Option B: New Address -->
                    <div class="address-option-card ${activeAddressMode === 'new' ? 'active' : ''}" id="optNewAddress" onclick="selectAddressMode('new')">
                        <div class="opt-radio-circle">${activeAddressMode === 'new' ? '✓' : ''}</div>
                        <div class="opt-details">
                            <div class="opt-header">
                                <strong>Deliver to a Different Address</strong>
                            </div>
                            <p class="opt-sub-desc">Enter a new house number, landmark, or choose another serviceable area</p>
                        </div>
                    </div>
                </div>
            `;
        }

        const areasOptions = activeAreas.map(a => `<option value="${a.name}">${a.name}</option>`).join('');

        checkoutForm.innerHTML = `
            <div class="delivery-details-header">
                <h3>Delivery Details</h3>
            </div>

            ${addressSelectorHtml}

            <!-- Address Form Fields (Matching Reference Image 1) -->
            <div id="newAddressFields" class="new-address-form" style="display: ${userSavedAddress && activeAddressMode === 'saved' ? 'none' : 'block'};">
                <div class="single-column-form">
                    <div class="delivery-field-group">
                        <label>Serviceable Area</label>
                        <select id="checkoutArea" class="delivery-input-field">
                            <option value="">Select an area...</option>
                            ${areasOptions}
                        </select>
                    </div>

                    <div class="delivery-field-group">
                        <label>House No. / Flat</label>
                        <input type="text" id="checkoutHouse" class="delivery-input-field" placeholder="E.g. 104, B Block">
                    </div>

                    <div class="delivery-field-group">
                        <label>Landmark</label>
                        <input type="text" id="checkoutLandmark" class="delivery-input-field" placeholder="E.g. Near Shiv Mandir">
                    </div>
                </div>

                <div class="save-addr-hint">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#0066FF"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    <span>This address will be automatically saved for your future orders.</span>
                </div>
            </div>

            <!-- Payment Mode (Matching Reference Image 1) -->
            <div class="delivery-field-group" style="margin-top: 18px;">
                <label>Payment Mode</label>
                <input type="text" class="delivery-input-field readonly-field" value="Cash On Delivery (COD)" readonly>
            </div>

            <p class="delivery-location-notice">
                📍 We will request location access to verify serviceability.
            </p>

            <button id="placeOrderBtn" class="btn-place-order-pill">
                Place Order
            </button>
        `;

        // Attach Place Order event listener
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', handlePlaceOrder);
        }
    }

    // --- Green Success Screen Celebration Overlay ---
    window.showOrderSuccessCelebration = (options = {}) => {
        const { orderId, amount, isPlan = false, redirectUrl = 'index.html#cart', duration = 3200 } = options;
        const shortId = orderId ? (orderId.length > 6 ? orderId.slice(-6).toUpperCase() : orderId) : 'CONFIRMED';
        const amtStr = (amount !== undefined && amount !== null && amount > 0) ? `₹${amount}` : '';

        let overlay = document.getElementById('successOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'successOverlay';
            overlay.className = 'success-screen-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="success-screen-backdrop"></div>
            <div class="success-screen-card" style="position: relative; z-index: 2; max-width: 460px; width: 92%; padding: 32px 24px; box-sizing: border-box;">
                <div class="success-confetti-wrap">
                    <span class="confetti c1">🎉</span>
                    <span class="confetti c2">✨</span>
                    <span class="confetti c3">🥛</span>
                    <span class="confetti c4">🎊</span>
                </div>
                <div class="success-icon-wrapper" style="margin-bottom: 16px;">
                    <div class="success-pulse-ring"></div>
                    <div class="success-check-badge">✓</div>
                </div>
                <h2 class="success-card-title" style="font-size: 1.75rem; font-weight: 800; color: #065F46; margin-bottom: 6px; letter-spacing: -0.5px;">
                    ${isPlan ? 'Plan Booked Successfully!' : 'Order Placed Successfully! 🎉'}
                </h2>
                <div style="display: inline-flex; align-items: center; gap: 8px; background: #ECFDF5; border: 1.5px solid #A7F3D0; padding: 4px 16px; border-radius: 20px; font-size: 0.88rem; font-weight: 700; color: #047857; margin-bottom: 14px;">
                    <span>Order #${shortId}</span>${amtStr ? ` • <span>${amtStr}</span>` : ''}
                </div>
                <p class="success-card-desc" style="font-size: 0.90rem; color: #4B5563; margin-bottom: 18px; line-height: 1.45;">
                    ${isPlan 
                        ? 'Congratulations! Your monthly fresh milk subscription is confirmed.' 
                        : 'Congratulations! Your farm fresh dairy batch has been reserved and dispatched.'}
                </p>
                <div class="success-highlight-box" style="margin-bottom: 18px; text-align: left; padding: 12px 14px; gap: 10px;">
                    <div class="sh-item">
                        <span class="sh-icon" style="font-size: 1.3rem;">🛵</span>
                        <div class="sh-text">
                            <strong style="font-size: 0.88rem;">Doorstep Route Dispatch</strong>
                            <span style="font-size: 0.80rem;">Fresh dairy packed in temperature-controlled bags.</span>
                        </div>
                    </div>
                    <div class="sh-item">
                        <span class="sh-icon" style="font-size: 1.3rem;">💬</span>
                        <div class="sh-text">
                            <strong style="font-size: 0.88rem;">WhatsApp Updates Active</strong>
                            <span style="font-size: 0.80rem;">Real-time tracking notifications sent to your phone.</span>
                        </div>
                    </div>
                </div>

                <div class="success-progress-track" style="margin-bottom: 8px; height: 6px;">
                    <div class="success-progress-bar" style="animation: fillProgressBar ${duration / 1000}s linear forwards;"></div>
                </div>
                <div class="success-countdown-text" style="font-size: 0.80rem; color: #6B7280; margin-bottom: 16px;">
                    Redirecting to your cart in a moment...
                </div>

                <div style="display: flex; gap: 10px; justify-content: center; width: 100%;">
                    <button id="btnGoToCartSuccess" style="flex: 1; padding: 12px 14px; border-radius: 14px; background: #059669; color: #ffffff; font-weight: 700; font-size: 0.88rem; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.28);">
                        Go to Cart 🛒
                    </button>
                    <button id="btnTrackOrderSuccess" style="flex: 1; padding: 12px 14px; border-radius: 14px; background: #F1F5F9; color: #334155; font-weight: 700; font-size: 0.88rem; border: 1.5px solid #CBD5E1; cursor: pointer;">
                        Track Order 🛵
                    </button>
                </div>
            </div>
        `;

        overlay.style.display = 'flex';

        let redirected = false;
        const doRedirect = (targetUrl) => {
            if (redirected) return;
            redirected = true;
            window.location.href = targetUrl || redirectUrl;
        };

        const timer = setTimeout(() => {
            doRedirect(redirectUrl);
        }, duration);

        const btnCart = overlay.querySelector('#btnGoToCartSuccess');
        if (btnCart) {
            btnCart.onclick = () => {
                clearTimeout(timer);
                doRedirect('index.html#cart');
            };
        }

        const btnTrack = overlay.querySelector('#btnTrackOrderSuccess');
        if (btnTrack) {
            btnTrack.onclick = () => {
                clearTimeout(timer);
                doRedirect(`orders.html?placed=${encodeURIComponent(orderId || 'success')}`);
            };
        }
    };

    // --- Place Order Logic ---
    async function handlePlaceOrder() {
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        const userSession = localStorage.getItem('milkmanUser');
        if (!userSession) return alert("Session expired. Please login.");

        const u = JSON.parse(userSession);
        const email = `${u.phone.replace(/\D/g, '')}@milkman.local`;
        const cart = JSON.parse(localStorage.getItem('milkmanCart') || '[]');
        if (cart.length === 0) return alert("Cart is empty.");

        let area = '';
        let house = '';
        let landmark = '';
        let savedLat = null;
        let savedLng = null;

        if (activeAddressMode === 'saved' && userSavedAddress) {
            area = userSavedAddress.deliveryArea;
            house = userSavedAddress.houseNo;
            landmark = userSavedAddress.landmark || '';
            savedLat = userSavedAddress.latitude;
            savedLng = userSavedAddress.longitude;
        } else {
            const areaSelect = document.getElementById('checkoutArea');
            const houseInput = document.getElementById('checkoutHouse');
            const landmarkInput = document.getElementById('checkoutLandmark');

            area = areaSelect ? areaSelect.value : '';
            house = houseInput ? houseInput.value.trim() : '';
            landmark = landmarkInput ? landmarkInput.value.trim() : '';

            if (!area || !house) return alert("Please select an area and enter your house number.");
        }

        placeOrderBtn.innerText = "Verifying Location...";
        placeOrderBtn.disabled = true;

        // Obtain GPS with 3.5s timeout and fallback so placing order never hangs
        const getGpsPosition = () => {
            return new Promise((resolve) => {
                if (!navigator.geolocation) {
                    return resolve({ lat: savedLat, lng: savedLng });
                }

                let completed = false;
                const timer = setTimeout(() => {
                    if (!completed) {
                        completed = true;
                        console.warn("GPS lookup timed out after 3.5s; proceeding with delivery address.");
                        resolve({ lat: savedLat, lng: savedLng });
                    }
                }, 3500);

                try {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            if (!completed) {
                                completed = true;
                                clearTimeout(timer);
                                resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                            }
                        },
                        (err) => {
                            if (!completed) {
                                completed = true;
                                clearTimeout(timer);
                                console.warn("GPS lookup error:", err ? err.message : 'Unavailable', "; proceeding with delivery address.");
                                resolve({ lat: savedLat, lng: savedLng });
                            }
                        },
                        { enableHighAccuracy: false, timeout: 3200, maximumAge: 60000 }
                    );
                } catch (e) {
                    if (!completed) {
                        completed = true;
                        clearTimeout(timer);
                        resolve({ lat: savedLat, lng: savedLng });
                    }
                }
            });
        };

        const pos = await getGpsPosition();
        const lat = pos ? pos.lat : null;
        const lng = pos ? pos.lng : null;

        placeOrderBtn.innerText = "Placing Order...";
        if (window.showMilkmanLoader) {
            window.showMilkmanLoader("MILKING IN PROGRESS", "Connecting with farm dispatch & reserving your batch");
        }

        try {
            const res = await fetch(API_BASE + '/api/custom/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    items: cart,
                    deliveryArea: area,
                    houseNo: house,
                    landmark,
                    latitude: lat,
                    longitude: lng,
                    orderType: 'INSTANT_BUY'
                })
            });
            const data = await res.json();

            // Hide the loader immediately as soon as response arrives
            if (window.hideMilkmanLoader) {
                window.hideMilkmanLoader(0);
            }

            if (data.success) {
                // Calculate total amount for display in celebration screen
                const totalAmt = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);

                // Clear cart immediately
                localStorage.removeItem('milkmanCart');
                if (window.updateCartCount) window.updateCartCount();

                const hasPlan = cart.some(item => item.productId && item.productId.startsWith('plan_'));
                
                if (hasPlan) {
                    // Update user's isSubscribed flag in localStorage
                    const storedUser = localStorage.getItem('milkmanUser');
                    if (storedUser) {
                        try {
                            const uObj = JSON.parse(storedUser);
                            uObj.isSubscribed = true;
                            localStorage.setItem('milkmanUser', JSON.stringify(uObj));
                        } catch(e) {}
                    }
                }

                // Show the celebratory green screen, then redirect to cart as requested
                window.showOrderSuccessCelebration({
                    orderId: data.orderId,
                    amount: totalAmt,
                    isPlan: hasPlan,
                    redirectUrl: 'index.html#cart',
                    duration: 3200
                });
            } else {
                if (window.customAlert) {
                    await customAlert("Order Issue", data.error || "Could not place order");
                } else {
                    alert("Failed: " + (data.error || "Could not place order"));
                }
            }
        } catch (e) {
            console.error("Order placing error:", e);
            if (window.hideMilkmanLoader) {
                window.hideMilkmanLoader(0);
            }
            if (window.customAlert) {
                await customAlert("Connection Error", "Error connecting to server. Please check your connection and try again.");
            } else {
                alert("Error placing order. Please try again.");
            }
        } finally {
            placeOrderBtn.innerText = "Place Order";
            placeOrderBtn.disabled = false;
            if (window.hideMilkmanLoader) {
                window.hideMilkmanLoader(0);
            }
        }
    }

    // --- Order History Logic ---
    window.loadUserOrders = () => {
        window.location.href = 'orders.html';
    };

    window.cancelOrder = async (orderId) => {
        const confirmCancel = await window.customConfirm("Cancel Order", "Are you sure you want to cancel this order?");
        if (!confirmCancel) return;

        const userSession = localStorage.getItem('milkmanUser');
        if (!userSession) return;
        const u = JSON.parse(userSession);
        const email = `${u.phone.replace(/\D/g, '')}@milkman.local`;

        try {
            const res = await fetch(API_BASE + '/api/orders/user-cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, orderId })
            });
            const data = await res.json();
            if (data.success) {
                await window.customAlert("Cancelled", "Your order has been cancelled successfully.");
                window.loadUserOrders();
            } else {
                await window.customAlert("Error", data.error || "Failed to cancel order.");
            }
        } catch(e) {
            await window.customAlert("Error", "Network request failed.");
        }
    };

    // Ensure routing synchronization after cart & order methods are ready
    if (window.handleHashChange) {
        window.handleHashChange();
    }
});
