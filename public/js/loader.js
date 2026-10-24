// Milkman High-Performance Animated PNG Logo Loading Screen
// Featuring real-time page blur (backdrop-filter) and smooth 60fps GPU animations
(function () {
  let loaderOverlay = null;

  function ensureLoaderOverlay() {
    if (loaderOverlay && document.getElementById('milkmanGlobalLoader')) {
      return;
    }

    // Check if element already exists in DOM
    const existing = document.getElementById('milkmanGlobalLoader');
    if (existing) {
      loaderOverlay = existing;
      return;
    }

    loaderOverlay = document.createElement('div');
    loaderOverlay.id = 'milkmanGlobalLoader';
    loaderOverlay.setAttribute('role', 'alert');
    loaderOverlay.setAttribute('aria-live', 'assertive');
    loaderOverlay.setAttribute('aria-busy', 'true');

    // Premium Frosted Blur Backdrop that blurs whatever page is underneath
    loaderOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 99999;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(18px) saturate(180%);
      -webkit-backdrop-filter: blur(18px) saturate(180%);
      transition: opacity 0.35s ease;
      opacity: 0;
      pointer-events: none;
      user-select: none;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Inject CSS Keyframe Animations for Logo, Spinning Ring, Pulsing Waves, and Dots
    const styleId = 'milkman-loader-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        @keyframes milkSpinRing {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes milkLogoBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.07); }
        }
        @keyframes milkGlowPulse {
          0% { transform: scale(0.88); opacity: 0.8; }
          50% { transform: scale(1.22); opacity: 0.25; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        @keyframes milkDotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-7px); opacity: 1; }
        }
        .milk-spinner-ring {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 3.5px solid transparent;
          border-top-color: #10B981;
          border-right-color: #34D399;
          border-bottom-color: #059669;
          animation: milkSpinRing 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .milk-pulse-glow {
          position: absolute;
          inset: -14px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(5, 150, 105, 0.1) 60%, transparent 80%);
          animation: milkGlowPulse 2.4s cubic-bezier(0.2, 0.8, 0.4, 1) infinite;
          pointer-events: none;
        }
        .milk-logo-disc {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 12px 32px rgba(16, 185, 129, 0.25), 0 2px 8px rgba(0,0,0,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          z-index: 2;
          border: 2px solid rgba(255, 255, 255, 0.9);
          animation: milkLogoBreathe 2.2s ease-in-out infinite;
        }
        .milk-logo-disc img {
          width: 76px;
          height: 76px;
          object-fit: contain;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.08));
        }
        .milk-bounce-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #059669;
          display: inline-block;
          animation: milkDotBounce 1.4s infinite ease-in-out both;
        }
        .milk-bounce-dot:nth-child(1) { animation-delay: -0.32s; }
        .milk-bounce-dot:nth-child(2) { animation-delay: -0.16s; }
        .milk-bounce-dot:nth-child(3) { animation-delay: 0s; }
      `;
      document.head.appendChild(styleEl);
    }

    loaderOverlay.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; max-width: 360px; text-align: center;">
        
        <!-- Animated PNG Logo Vessel with Spinning Gradient Ring & Pulse Glow -->
        <div style="position: relative; width: 112px; height: 112px; display: flex; align-items: center; justify-content: center; margin-bottom: 22px;">
          <div class="milk-pulse-glow"></div>
          <div class="milk-spinner-ring"></div>
          <div class="milk-logo-disc">
            <img src="assets/logo.png" alt="Milkman Logo" onerror="this.onerror=null; this.src='assets/logo.jpg'">
          </div>
        </div>

        <!-- Status Pill -->
        <div id="loaderPillText" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.12); color: #047857; font-weight: 800; font-size: 0.72rem; letter-spacing: 0.8px; text-transform: uppercase; padding: 5px 14px; border-radius: 30px; margin-bottom: 10px; border: 1px solid rgba(16, 185, 129, 0.22);">
          PURE FRESH DAIRY
        </div>

        <!-- Main Heading -->
        <div id="loaderMainHeading" style="font-size: 1.25rem; font-weight: 800; color: #1E1B19; margin: 0 0 6px 0; letter-spacing: -0.3px; line-height: 1.25;">
          MILKING IN PROGRESS
        </div>

        <!-- Subtitle -->
        <div id="loaderSubHeading" style="font-size: 0.86rem; color: #64748B; font-weight: 500; max-width: 290px; margin: 0 auto 16px; line-height: 1.45;">
          Connecting with farm dispatch & reserving your fresh batch...
        </div>

        <!-- Bouncing Dots Loader -->
        <div style="display: flex; gap: 7px; justify-content: center; align-items: center; height: 16px;">
          <span class="milk-bounce-dot"></span>
          <span class="milk-bounce-dot"></span>
          <span class="milk-bounce-dot"></span>
        </div>

      </div>
    `;

    document.body.appendChild(loaderOverlay);
  }

  // Show Loader
  window.showMilkmanLoader = function (title, subtitle, pillText) {
    ensureLoaderOverlay();
    if (!loaderOverlay) return;

    const h = loaderOverlay.querySelector('#loaderMainHeading');
    const s = loaderOverlay.querySelector('#loaderSubHeading');
    const p = loaderOverlay.querySelector('#loaderPillText');

    if (h) h.textContent = title || "MILKING IN PROGRESS";
    if (s) s.textContent = subtitle || "Connecting with farm dispatch & reserving your fresh batch...";
    if (p) p.textContent = pillText || "PURE FRESH DAIRY";

    loaderOverlay.style.display = 'flex';
    requestAnimationFrame(() => {
      loaderOverlay.style.opacity = '1';
      loaderOverlay.style.pointerEvents = 'auto';
    });
  };

  // Hide Loader
  window.hideMilkmanLoader = function (delay = 350) {
    if (!loaderOverlay) {
      loaderOverlay = document.getElementById('milkmanGlobalLoader');
    }
    if (!loaderOverlay) return;

    setTimeout(() => {
      loaderOverlay.style.opacity = '0';
      loaderOverlay.style.pointerEvents = 'none';
      setTimeout(() => {
        if (loaderOverlay && loaderOverlay.style.opacity === '0') {
          loaderOverlay.style.display = 'none';
        }
      }, 350);
    }, delay);
  };

  // Auto-init on page load
  document.addEventListener('DOMContentLoaded', () => {
    ensureLoaderOverlay();
    
    const hasAutoLoader = document.body.hasAttribute('data-milking-loader') || 
                          window.location.pathname.includes('orders.html') ||
                          window.location.pathname.includes('subscription.html');
    
    if (hasAutoLoader) {
      window.hideMilkmanLoader(650);
    } else {
      window.hideMilkmanLoader(150);
    }
  });
})();
