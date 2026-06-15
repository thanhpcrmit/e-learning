/**
 * Course Navigation Landing Page — Interactive Handlers
 */
document.addEventListener("DOMContentLoaded", () => {
  
  // --- DOM Elements ---
  const btnScrollModules = document.getElementById("btn-scroll-modules");
  const modulesSection = document.getElementById("modules-selection");

  const btnToggleResources = document.getElementById("btn-toggle-resources");
  const btnCloseResources = document.getElementById("btn-close-resources");
  const resourcesDrawer = document.getElementById("resources-drawer");
  const resourcesDrawerOverlay = document.getElementById("resources-drawer-overlay");

  const btnOpenGuide = document.getElementById("btn-open-guide");
  const btnCloseGuide = document.getElementById("btn-close-guide");
  const btnCloseGuideFooter = document.getElementById("btn-close-guide-footer");
  const guideModalOverlay = document.getElementById("guide-modal-overlay");

  const moduleCards = document.querySelectorAll(".module-card");

  // --- Smooth Scroll ---
  if (btnScrollModules && modulesSection) {
    btnScrollModules.addEventListener("click", () => {
      modulesSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // --- Resource Drawer Toggles ---
  const openResources = () => {
    resourcesDrawer.classList.add("open");
    resourcesDrawerOverlay.classList.add("open");
    document.body.style.overflow = "hidden"; // Prevent background scroll
  };

  const closeResources = () => {
    resourcesDrawer.classList.remove("open");
    resourcesDrawerOverlay.classList.remove("open");
    document.body.style.overflow = ""; // Re-enable background scroll
  };

  if (btnToggleResources) btnToggleResources.addEventListener("click", openResources);
  if (btnCloseResources) btnCloseResources.addEventListener("click", closeResources);
  if (resourcesDrawerOverlay) resourcesDrawerOverlay.addEventListener("click", closeResources);

  // --- Program Guide Modal Toggles ---
  const openGuide = () => {
    guideModalOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  const closeGuide = () => {
    guideModalOverlay.classList.remove("open");
    document.body.style.overflow = "";
  };

  if (btnOpenGuide) btnOpenGuide.addEventListener("click", openGuide);
  if (btnCloseGuide) btnCloseGuide.addEventListener("click", closeGuide);
  if (btnCloseGuideFooter) btnCloseGuideFooter.addEventListener("click", closeGuide);
  
  // Close modal when clicking outside of it
  if (guideModalOverlay) {
    guideModalOverlay.addEventListener("click", (e) => {
      if (e.target === guideModalOverlay) {
        closeGuide();
      }
    });
  }

  // --- Clickable Module Cards ---
  moduleCards.forEach(card => {
    card.addEventListener("click", (e) => {
      // If user clicked directly on a link or button inside the card, let the browser handle it
      if (e.target.tagName.toLowerCase() === "a") {
        return;
      }
      
      const targetUrl = card.getAttribute("data-url");
      if (targetUrl) {
        // Smooth transition effect before navigating (optional)
        card.style.transform = "scale(0.98)";
        card.style.opacity = "0.8";
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 150);
      }
    });
  });

  // Esc key closure for drawer/modals
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeResources();
      closeGuide();
    }
  });

});
