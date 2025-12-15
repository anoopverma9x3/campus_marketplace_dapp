// Frontend for Campus Rental & Sell DApp
// Uses MetaMask + ethers.js + simple CampusMarketplace contract
// CONTRACT_ADDRESS and CONTRACT_ABI come from contractConfig.js

// 1) Make sure ethers is loaded (from window or via CDN)
// 2) When ready, run initApp(ethersLib)

document.addEventListener("DOMContentLoaded", () => {
  ensureEthersLoaded()
    .then((ethersLib) => initApp(ethersLib))
    .catch((err) => {
      console.error("Could not load ethers.js:", err);
      alert("Failed to load ethers.js from CDN. Check your internet connection.");
    });
});

/* ------------------------------------------------------------------ */
/* Step 1: load ethers.js if it's not already on window               */
/* ------------------------------------------------------------------ */

function ensureEthersLoaded() {
  return new Promise((resolve, reject) => {
    if (window.ethers) {
      return resolve(window.ethers);
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
    script.async = true;
    script.onload = () => {
      if (window.ethers) resolve(window.ethers);
      else reject(new Error("ethers script loaded but window.ethers missing"));
    };
    script.onerror = () =>
      reject(new Error("Failed to load ethers.js from CDN"));
    document.head.appendChild(script);
  });
}

/* ------------------------------------------------------------------ */
/* Step 2: main DApp logic                                            */
/* ------------------------------------------------------------------ */

function initApp(ethersLib) {
  const body = document.body;

  const SUPPORT_EMAIL = "helpdapp@gmail.com";
  const SUPPORT_PHONE = "+918392834933";

  // ==== DOM elements ====
  const themeToggleBtn = document.getElementById("theme-toggle");
  if (!themeToggleBtn) {
  console.error("Theme toggle button not found");
  return;
}

  const footerThemeLabel = document.getElementById("footer-theme-label");
  const connectWalletBtn = document.getElementById("connect-wallet");

  const scrollToFormBtn = document.getElementById("scroll-to-form");
  const scrollToListingsBtn = document.getElementById("scroll-to-listings");
  const formSection = document.getElementById("form-section");
  const listingsSection = document.getElementById("listings-section");

  const listingForm = document.getElementById("listing-form");
  const formStatus = document.getElementById("form-status");
  const listingsContainer = document.getElementById("listings-container");
  const emptyState = document.getElementById("empty-state");
  const refreshListingsBtn = document.getElementById("refresh-listings");

  const filterCategory = document.getElementById("filter-category");
  const filterType = document.getElementById("filter-type");
  const searchInput = document.getElementById("search-input");
  const durationField = document.getElementById("duration-field");
  const securityDepositField = document.getElementById(
    "security-deposit-field"
  );

  const typeHidden = document.getElementById("type");
  const typeToggle = document.getElementById("type-toggle");
  const typeOptions = typeToggle.querySelectorAll(".type-option");

  // Chatbot elements
  const chatToggleBtn = document.getElementById("chat-toggle");
  const chatbot = document.getElementById("chatbot");
  const chatCloseBtn = document.getElementById("chat-close");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");

  // State
  let allListings = [];
  let currentAccount = null;
  let provider, signer, contract;

  /* ============ Helper: ETH string -> WEI string (no parseEther) ============ */

  function ethToWeiString(ethStr) {
    const cleaned = ethStr.trim();
    if (!cleaned) throw new Error("empty price");

    // digits + optional single dot, e.g. "0.01", "1", "10.5"
    if (!/^\d+(\.\d+)?$/.test(cleaned)) {
      throw new Error("bad format");
    }

    const parts = cleaned.split(".");
    const intPartRaw = parts[0] || "0";
    const decPartRaw = parts[1] || "";

    let decPart = decPartRaw;
    if (decPart.length > 18) decPart = decPart.slice(0, 18);
    const decPadded = (decPart === "" ? "0" : decPart).padEnd(18, "0");

    const intWei = BigInt(intPartRaw) * 10n ** 18n;
    const decWei = BigInt(decPadded);
    const totalWei = intWei + decWei;

    return totalWei.toString(); // decimal string
  }

  /* ===================== ETHERS / CONTRACT SETUP ===================== */

  async function initEthers() {
    if (!window.ethereum) {
      alert("MetaMask (or any EVM wallet) not found. Please install it.");
      return;
    }

    provider = new ethersLib.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    contract = new ethersLib.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("Install MetaMask first.");
        return;
      }
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      currentAccount = accounts[0];
      connectWalletBtn.textContent =
        currentAccount.slice(0, 6) + "..." + currentAccount.slice(-4);
      connectWalletBtn.classList.add("connected");

      await initEthers();
      await loadListings();
    } catch (err) {
      console.error(err);
      alert("Could not connect wallet.");
    }
  }

  connectWalletBtn.addEventListener("click", connectWallet);

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => {
      window.location.reload();
    });
    window.ethereum.on("chainChanged", () => {
      window.location.reload();
    });
  }

  /* ===================== THEME TOGGLE ===================== */

/* ===================== THEME TOGGLE ===================== */

function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
    themeToggleBtn.textContent = "☀️";
    if (footerThemeLabel) footerThemeLabel.textContent = "Dark";
  } else {
    document.body.classList.remove("dark");
    themeToggleBtn.textContent = "🌙";
    if (footerThemeLabel) footerThemeLabel.textContent = "Light";
  }
}

const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

themeToggleBtn.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  const newTheme = isDark ? "light" : "dark";

  applyTheme(newTheme);
  localStorage.setItem("theme", newTheme);
});


  /* ===================== SMOOTH SCROLL BUTTONS ===================== */

  scrollToFormBtn.addEventListener("click", () => {
    formSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  scrollToListingsBtn.addEventListener("click", () => {
    listingsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ===================== TYPE TOGGLE (Rent / Sell) ===================== */

  function updateRentSellUI(val) {
    typeHidden.value = val;
    const isRent = val === "rent";
    durationField.style.display = isRent ? "block" : "none";
    securityDepositField.style.display = isRent ? "block" : "none";
  }

  // initial state
  updateRentSellUI("rent");

  typeOptions.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeOptions.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const val = btn.dataset.value; // "rent" or "sell"
      updateRentSellUI(val);

      // only change filter, NO scroll
      filterType.value = val;
      renderListings();
    });
  });

  /* ===================== FORM: CREATE LISTING ON-CHAIN ===================== */

  listingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formStatus.textContent = "";
    formStatus.className = "form-status";

    // Auto-connect wallet if not connected
    if (!currentAccount) {
      await connectWallet();
      if (!currentAccount) {
        formStatus.textContent = "Please connect your wallet to create a listing.";
        formStatus.classList.add("error");
        return;
      }
    }

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const category = document.getElementById("category").value;
    const type = typeHidden.value; // "rent" or "sell"
    const priceEthRaw = document.getElementById("price").value.trim();
    const durationUnit = document.getElementById("durationUnit").value;
    const securityDepositEthRaw = document
      .getElementById("securityDeposit")
      .value.trim();
    const location = document.getElementById("location").value.trim();

    if (!title || !type || !priceEthRaw) {
      formStatus.textContent = "Please fill required fields (title, type, price).";
      formStatus.classList.add("error");
      return;
    }

    const priceNumber = Number(priceEthRaw);
    if (Number.isNaN(priceNumber) || priceNumber <= 0) {
      formStatus.textContent = "Price must be a number greater than 0.";
      formStatus.classList.add("error");
      return;
    }

    let priceWei;
    try {
      priceWei = ethToWeiString(priceEthRaw); // no parseEther
    } catch (err) {
      console.error("ethToWeiString error:", err);
      formStatus.textContent = "Invalid price format. Use a value like 0.01";
      formStatus.classList.add("error");
      return;
    }

    // Build description with rent duration + security deposit (UI-only)
    let fullDescription = description;

    if (type === "rent" && durationUnit) {
      fullDescription =
        fullDescription +
        (fullDescription ? " " : "") +
        `(Rent price per ${durationUnit})`;
    }

    if (type === "rent" && securityDepositEthRaw) {
      fullDescription =
        fullDescription +
        (fullDescription ? " " : "") +
        `(Security deposit: ${securityDepositEthRaw} ETH)`;
    }

    const listingTypeEnum = type === "rent" ? 0 : 1; // ListingType enum

    try {
      await initEthers();
      const tx = await contract.createListing(
        title,
        fullDescription,
        category,
        location,
        listingTypeEnum,
        priceWei
      );

      formStatus.textContent = "Transaction sent. Waiting for confirmation...";
      formStatus.classList.remove("error");
      formStatus.classList.add("success");

      await tx.wait();

      listingForm.reset();
      // reset rent/sell state
      typeOptions.forEach((b) => b.classList.remove("active"));
      typeOptions[0].classList.add("active");
      updateRentSellUI("rent");

      formStatus.textContent = "Listing created on blockchain!";
      await loadListings();   // reload list from chain
      listingsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error(err);
      formStatus.textContent =
        err?.data?.message || err?.message || "Transaction failed.";
      formStatus.classList.add("error");
    }
  });

  /* ===================== LOAD & RENDER LISTINGS ===================== */

  async function loadListings() {
  try {
    if (!contract) {
      await initEthers();
    }
    if (!contract) return;

    // Just to confirm we’re really talking to your contract:
    const network = await provider.getNetwork();
    console.log("Network:", network);
    console.log("Using contract:", CONTRACT_ADDRESS);

    const countBN = await contract.listingCount();   // from your contract
    const count = countBN.toNumber();
    console.log("listingCount =", count);

    const items = [];

    for (let i = 1; i <= count; i++) {
      // use your getListing() helper
      const l = await contract.getListing(i);

      // skip empty slots (id == 0)
      if (l.id.toNumber() === 0) continue;

      items.push({
        id: l.id.toNumber(),
        owner: l.owner,
        title: l.title,
        description: l.description,
        category: l.category,
        location: l.location,
        listingType: l.listingType,  // 0 = Rent, 1 = Sell
        priceWei: l.priceWei,
        isAvailable: l.isAvailable,
        createdAt: l.createdAt.toNumber(),
      });
    }

    allListings = items;
    renderListings();
  } catch (err) {
    console.error("Failed to load listings", err);
    emptyState.textContent =
      "Could not load listings from blockchain. Check console for error.";
    emptyState.style.display = "block";
  }
}


  function renderListings() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const catFilter = filterCategory.value;
    const typeFilter = filterType.value;

    let filtered = allListings.filter((item) => {
      const isRent = item.listingType === 0;
      const typeStr = isRent ? "rent" : "sell";

      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery) ||
        (item.description || "").toLowerCase().includes(searchQuery) ||
        (item.location || "").toLowerCase().includes(searchQuery);

      const matchesCategory =
        catFilter === "all" ||
        (catFilter === "others" && item.category === "others") ||
        item.category === catFilter;

      const matchesType =
        typeFilter === "all" || typeStr === typeFilter;

      return matchesSearch && matchesCategory && matchesType;
    });

    listingsContainer.innerHTML = "";

    if (filtered.length === 0) {
      emptyState.textContent =
        "No listings match your filters. Try changing filters or add a new listing.";
      emptyState.style.display = "block";
      return;
    } else {
      emptyState.style.display = "none";
    }

    filtered
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((item) => {
        const isRent = item.listingType === 0;
        const typeStr = isRent ? "Rent" : "Sell";

        const card = document.createElement("div");
        card.className = "listing-card";

        const header = document.createElement("div");
        header.className = "listing-header";

        const title = document.createElement("div");
        title.className = "listing-title";
        title.textContent = item.title;

        const typeBadge = document.createElement("span");
        typeBadge.className =
          "badge " + (isRent ? "badge-type-rent" : "badge-type-sell");
        typeBadge.textContent = typeStr;

        header.appendChild(title);
        header.appendChild(typeBadge);

        const desc = document.createElement("p");
        desc.className = "listing-desc";
        desc.textContent =
          item.description || "No description provided.";

        const meta = document.createElement("div");
        meta.className = "listing-meta";

        const priceSpan = document.createElement("span");
        priceSpan.className = "listing-price";

        let priceEth = "?";
        try {
          if (ethersLib.utils && ethersLib.utils.formatEther) {
            priceEth = ethersLib.utils.formatEther(item.priceWei);
          }
        } catch (e) {
          console.error("formatEther error:", e);
        }

        priceSpan.textContent = `${priceEth} ETH`;

        const ownerSpan = document.createElement("span");
        ownerSpan.textContent =
          "Owner: " +
          item.owner.slice(0, 6) +
          "..." +
          item.owner.slice(-4);

        const locationSpan = document.createElement("span");
        locationSpan.textContent = "📍 " + (item.location || "Not specified");

        meta.appendChild(priceSpan);
        meta.appendChild(locationSpan);
        meta.appendChild(ownerSpan);

        const actions = document.createElement("div");
        actions.className = "listing-actions";

        const contactButtons = document.createElement("div");
        contactButtons.className = "contact-buttons";

        const btnEmail = document.createElement("button");
        btnEmail.className = "secondary-btn";
        btnEmail.textContent = "Email";
        btnEmail.addEventListener("click", () => {
          const subject = encodeURIComponent("Regarding listing: " + item.title);
          const body = encodeURIComponent(
            "Hi,\n\nI am interested in your listing.\n\nThanks."
          );
          window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
        });

        const btnPhone = document.createElement("button");
        btnPhone.className = "ghost-btn";
        btnPhone.textContent = "Call";
        btnPhone.addEventListener("click", () => {
          window.location.href = `tel:${SUPPORT_PHONE}`;
        });

        contactButtons.appendChild(btnEmail);
        contactButtons.appendChild(btnPhone);

        const rightSide = document.createElement("div");
        rightSide.style.display = "flex";
        rightSide.style.flexDirection = "column";
        rightSide.style.alignItems = "flex-end";
        rightSide.style.gap = "0.25rem";

        const availability = document.createElement("span");
        availability.className = "availability";
        setAvailabilityText(availability, item.isAvailable);

        const buttonGroup = document.createElement("div");
        buttonGroup.style.display = "flex";
        buttonGroup.style.gap = "0.3rem";

        const btnToggle = document.createElement("button");
        btnToggle.className = "ghost-btn";
        btnToggle.textContent = item.isAvailable
          ? "Mark unavailable"
          : "Mark available";
        btnToggle.addEventListener("click", () => toggleAvailability(item.id));

        const btnPay = document.createElement("button");
        btnPay.className = "primary-btn";
        btnPay.style.fontSize = "0.78rem";
        btnPay.textContent = isRent ? "Rent (crypto)" : "Buy (crypto)";
        btnPay.addEventListener("click", () =>
          payForListing(item.id, item.priceWei)
        );

        if (
          currentAccount &&
          currentAccount.toLowerCase() === item.owner.toLowerCase()
        ) {
          buttonGroup.appendChild(btnToggle);
        } else {
          buttonGroup.appendChild(btnPay);
        }

        rightSide.appendChild(availability);
        rightSide.appendChild(buttonGroup);

        actions.appendChild(contactButtons);
        actions.appendChild(rightSide);

        card.appendChild(header);
        card.appendChild(desc);
        card.appendChild(meta);
        card.appendChild(actions);

        listingsContainer.appendChild(card);
      });
  }

  function setAvailabilityText(el, isAvailable) {
    el.textContent = isAvailable ? "Available" : "Unavailable";
    el.classList.toggle("available", isAvailable);
    el.classList.toggle("unavailable", !isAvailable);
  }

  async function toggleAvailability(id) {
    try {
      if (!currentAccount) {
        await connectWallet();
        if (!currentAccount) {
          alert("Please connect your wallet first.");
          return;
        }
      }
      await initEthers();
      const tx = await contract.toggleAvailability(id);
      await tx.wait();
      await loadListings();
    } catch (err) {
      console.error(err);
      alert("Could not update listing status.");
    }
  }

  async function payForListing(id, priceWei) {
    try {
      if (!currentAccount) {
        await connectWallet();
        if (!currentAccount) {
          alert("Please connect your wallet first.");
          return;
        }
      }
      await initEthers();
      const tx = await contract.buyOrRent(id, { value: priceWei });
      alert("Transaction sent. Wait for confirmation...");
      await tx.wait();
      await loadListings();
    } catch (err) {
      console.error(err);
      alert(err?.data?.message || err?.message || "Payment failed.");
    }
  }

  refreshListingsBtn.addEventListener("click", () => {
    loadListings();
    listingsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  filterCategory.addEventListener("change", () => {
    renderListings();
    listingsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  filterType.addEventListener("change", () => {
    renderListings();
    listingsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  searchInput.addEventListener("input", () => {
    renderListings();
  });

  /* ===================== FAQ DROPDOWN ===================== */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const btn = item.querySelector(".faq-question");
    btn.addEventListener("click", () => {
      item.classList.toggle("open");
    });
  });

  /* ===================== CHATBOT ===================== */

  function addChatMessage(text, from = "bot") {
    const msg = document.createElement("div");
    msg.className = "chat-message " + (from === "user" ? "user" : "bot");
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function botReply(userText) {
    const lower = userText.toLowerCase();
    let reply;

    if (lower.includes("rent")) {
      reply =
        "To rent an item, connect your wallet, go to 'Live listings', filter to 'Rent only', then use the crypto rent button.";
    } else if (lower.includes("sell")) {
      reply =
        "To sell an item, connect your wallet, fill 'List your item', pick the 'Sell' box, set a price (in ETH) and submit.";
    } else if (
      lower.includes("crypto") ||
      lower.includes("price") ||
      lower.includes("eth")
    ) {
      reply =
        "All prices are in ETH (or the native token of your network). You pay directly from your wallet via MetaMask.";
    } else if (lower.includes("dark") || lower.includes("theme")) {
      reply =
        "Use the moon/sun icon in the header to switch between sand light mode and dark mode.";
    } else if (lower.includes("help") || lower.includes("support")) {
      reply =
        "For detailed help, email support at helpdapp@gmail.com or call +91 8392834933.";
    } else {
      reply =
        "I’m your Campus Assistant! Ask me about renting, selling, wallet connection, or crypto payments.";
    }

    setTimeout(() => addChatMessage(reply, "bot"), 450);
  }

  chatToggleBtn.addEventListener("click", () => {
    chatbot.classList.toggle("open");
    if (chatbot.classList.contains("open") && chatMessages.children.length === 0) {
      addChatMessage(
        "Hey! 👋 Connect your wallet and start renting/selling with crypto."
      );
    }
  });

  chatCloseBtn.addEventListener("click", () => {
    chatbot.classList.remove("open");
  });

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    addChatMessage(text, "user");
    chatInput.value = "";
    botReply(text);
  });

  /* ===================== INITIAL LOAD ===================== */

  if (window.ethereum) {
    initEthers()
      .then(loadListings)
      .catch((e) => console.error(e));
  }
}

