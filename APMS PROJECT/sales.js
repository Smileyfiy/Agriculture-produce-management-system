import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from "./firebaseconnection.js";

const auth = getAuth(app);
const database = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
  // References to DOM elements
  const addSalesForm = document.getElementById("add-sales-form");
  const salesList = document.getElementById("sales-list");
  const produceDropdown = document.getElementById("produce-dropdown");
  const salesCardsContainer = document.getElementById("sales-cards-container");

  // Load produce data into the dropdown
  function loadProduceOptions() {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to view produce.");
      return;
    }

    const userId = user.uid;
    const produceRef = ref(database, `produce/${userId}`);

    onValue(produceRef, (snapshot) => {
      produceDropdown.innerHTML = ""; // Clear the dropdown before adding new items
      snapshot.forEach((childSnapshot) => {
        const produce = childSnapshot.val();
        const option = document.createElement("option");
        option.value = childSnapshot.key; // Use the produce ID as the value
        option.textContent = `${produce.type} (${produce.quantity} units available)`;
        produceDropdown.appendChild(option);
      });
    });
  }

  // Handle form submission for adding sales
  addSalesForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a sale.");
      return;
    }

    const userId = user.uid; // Get the authenticated user's ID
    const produceId = produceDropdown.value; // Get the selected produce ID
    const quantitySold = parseInt(document.getElementById("quantity-sold").value.trim(), 10);
    const saleDate = document.getElementById("sale-date").value.trim();
    const salePrice = parseFloat(document.getElementById("sale-price").value.trim());
    const buyerName = document.getElementById("buyer-name").value.trim();
    const buyerContact = document.getElementById("buyer-contact").value.trim();

    if (!produceId || !quantitySold || !saleDate || !salePrice || !buyerName || !buyerContact) {
      alert("All fields are required.");
      return;
    }

    try {
      // Get the current quantity of the selected produce
      const produceRef = ref(database, `produce/${userId}/${produceId}`);
      const produceSnapshot = await get(produceRef);

      if (!produceSnapshot.exists()) {
        alert("Selected produce does not exist.");
        return;
      }

      const produceData = produceSnapshot.val();
      const currentQuantity = parseInt(produceData.quantity, 10);

      if (quantitySold > currentQuantity) {
        alert("Insufficient quantity in inventory.");
        return;
      }

      // Add the sale to the sales node
      const salesRef = ref(database, `sales/${userId}`);
      await push(salesRef, {
        produceType: produceData.type,
        quantitySold,
        saleDate,
        salePrice, 
        buyerName,
        buyerContact,
        timestamp: new Date().toISOString(),
      });

      // Update the quantity of the produce in the inventory
      const updatedQuantity = currentQuantity - quantitySold;
      await update(produceRef, { quantity: updatedQuantity });

      alert("Sale added successfully!");
      addSalesForm.reset();
      loadSales(); // Reload sales after adding a new one
      loadProduceOptions(); // Reload produce options to reflect updated quantities
    } catch (error) {
      console.error("Error adding sale:", error);
      alert("Failed to add sale. Please try again.");
    }
  });

  // Load sales for the current user
  function loadSales() {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to view sales.");
      return;
    }

    const userId = user.uid;
    const salesRef = ref(database, `sales/${userId}`);

    onValue(salesRef, (snapshot) => {
      salesList.innerHTML = ""; // Clear the list before adding new items
      snapshot.forEach((childSnapshot) => {
        const sale = childSnapshot.val();
        const li = document.createElement("li");
        li.textContent = `${sale.produceType} - ${sale.quantitySold} units sold on ${sale.saleDate} for KSH ${sale.salePrice} (Buyer: ${sale.buyerName}, Contact: ${sale.buyerContact})`;
        salesList.appendChild(li);
      });
    });
  }

  // Load recent sales and display them as cards
  function loadRecentSales() {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to view sales.");
      return;
    }

    const userId = user.uid;
    const salesRef = ref(database, `sales/${userId}`);

    onValue(salesRef, (snapshot) => {
      salesCardsContainer.innerHTML = ""; // Clear the container before adding new cards

      if (!snapshot.exists()) {
        // If no sales exist, display a message
        const noSalesMessage = document.createElement("p");
        noSalesMessage.textContent = "Sales have not yet been logged.";
        noSalesMessage.style.color = "red";
        noSalesMessage.style.textAlign = "center";
        salesCardsContainer.appendChild(noSalesMessage);
        return;
      }

      // If sales exist, create cards for each sale
      snapshot.forEach((childSnapshot) => {
        const sale = childSnapshot.val();
        const saleId = childSnapshot.key;

        // Create a card for each sale
        const card = document.createElement("div");
        card.classList.add("sale-card");

        card.innerHTML = `
          <div class="sale-id" style="color: green; font-weight: bold;">Sale ID: ${saleId}</div>
          <div class="sale-details">
            <p><strong>Produce:</strong> ${sale.produceType}</p>
            <p><strong>Quantity Sold:</strong> ${sale.quantitySold} units</p>
            <p><strong>Sale Date:</strong> ${sale.saleDate}</p>
            <p><strong>Sale Price:</strong> KSH ${sale.salePrice}</p>
            <p><strong>Buyer Name:</strong> ${sale.buyerName}</p>
            <p><strong>Buyer Contact:</strong> ${sale.buyerContact}</p>
          </div>
        `;

        salesCardsContainer.appendChild(card);
      });
    });
  }

  // Call loadSales, loadProduceOptions, and loadRecentSales on page load
  auth.onAuthStateChanged((user) => {
    if (user) {
      loadSales();
      loadProduceOptions();
      loadRecentSales();
    }
  });

  const scheduleSaleButton = document.querySelector(".card button"); // Schedule button in the card
  const scheduleSaleModal = document.getElementById("schedule-sale-modal");
  const closeModalButton = document.getElementById("close-modal");
  const scheduleSaleForm = document.getElementById("schedule-sale-form");

  // Show the modal when the "Schedule" button is clicked
  scheduleSaleButton.addEventListener("click", () => {
    scheduleSaleModal.classList.remove("hidden");
  });

  // Close the modal when the close button is clicked
  closeModalButton.addEventListener("click", () => {
    scheduleSaleModal.classList.add("hidden");
  });

  // Handle form submission for scheduling a sale
  scheduleSaleForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to schedule a sale.");
      return;
    }

    const userId = user.uid;
    const buyerName = document.getElementById("schedule-buyer-name").value.trim();
    const buyerContact = document.getElementById("schedule-buyer-contact").value.trim();
    const scheduleDate = document.getElementById("schedule-date").value.trim();
    const scheduleQuantity = parseInt(document.getElementById("schedule-quantity").value.trim(), 10);

    if (!buyerName || !buyerContact || !scheduleDate || !scheduleQuantity) {
      alert("All fields are required.");
      return;
    }

    try {
      const scheduleRef = ref(database, `scheduledSales/${userId}`);
      await push(scheduleRef, {
        buyerName,
        buyerContact,
        scheduleDate,
        scheduleQuantity,
        timestamp: new Date().toISOString(),
      });

      alert("Sale scheduled successfully!");
      scheduleSaleForm.reset();
      scheduleSaleModal.classList.add("hidden");
    } catch (error) {
      console.error("Error scheduling sale:", error);
      alert("Failed to schedule sale. Please try again.");
    }
  });
});