import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from "./firebaseconnection.js";

const auth = getAuth(app);
const database = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
  // Get references to DOM elements
  const produceForm = document.getElementById("produce-entry-form");
  const dashboardOverviewCard = document.getElementById(
    "dashboard-overview-card"
  );
  const totalInventoryCard = document.getElementById("total-inventory-card");
  const produceList = document.querySelector(".cards");

  // Handle form submission
  produceForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const produceType = document.getElementById("produce-type").value.trim();
    const produceQuantity = document
      .getElementById("produce-quantity")
      .value.trim();
    const harvestDate = document.getElementById("harvest-date").value.trim();
    const storageLocation = document
      .getElementById("storage-location")
      .value.trim();
    const expectedSaleDate = document
      .getElementById("expected-sale-date")
      .value.trim();
    const produceCategory = document.getElementById("produce-category").value;

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add produce.");
      return;
    }

    const userId = user.uid;

    const produceRef = ref(database, "produce");
    push(produceRef, {
      userId, // Save the UserID
      type: produceType,
      quantity: produceQuantity,
      harvestDate: harvestDate,
      storageLocation: storageLocation,
      expectedSaleDate: expectedSaleDate,
      category: produceCategory,
      timestamp: new Date().toISOString(),
    })
      .then(() => {
        alert("Produce added successfully!");
        produceForm.reset();
      })
      .catch((error) => {
        console.error("Error adding produce:", error);
        alert("Failed to add produce. Please try again.");
      });
  });

  // Function to calculate total inventory weight
  function calculateTotalInventory() {
    const produceRef = ref(database, "produce");
    onValue(produceRef, (snapshot) => {
      let totalWeight = 0;
      snapshot.forEach((childSnapshot) => {
        const produce = childSnapshot.val();
        totalWeight += parseFloat(produce.quantity) || 0; // Add the quantity to the total weight
      });
      totalInventoryCard.innerHTML = `<h2>Total Inventory</h2><p>${totalWeight} kg</p>`;
    });
  }

  // Function to load produce data into the dashboard
  function loadProduceData() {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to view produce data.");
      return;
    }

    const userId = user.uid;
    const produceRef = ref(database, "produce");

    onValue(produceRef, (snapshot) => {
      produceList.innerHTML = ""; // Clear the list
      snapshot.forEach((childSnapshot) => {
        const produce = childSnapshot.val();
        if (produce.userId === userId) {
          // Filter by UserID
          const card = document.createElement("div");
          card.classList.add("card", "produce-card");
          card.innerHTML = `
                        <h2>${produce.type}</h2>
                        <p>Quantity: ${produce.quantity} kg</p>
                        <p>Harvest Date: ${produce.harvestDate}</p>
                        <p>Storage Location: ${produce.storageLocation}</p>
                        <p>Expected Sale Date: ${produce.expectedSaleDate}</p>
                        <p>Category: ${produce.category}</p>
                    `;
          produceList.appendChild(card);
        }
      });
    });
  }

  // Attach event listener to the "Dashboard Overview" card
  dashboardOverviewCard.addEventListener("click", () => {
    loadProduceData();
  });

  // Calculate total inventory weight on page load
  calculateTotalInventory();

  // Add Storage Location Form
  const addStorageForm = document.getElementById("add-storage-form");
  const storageList = document.getElementById("storage-list");

  addStorageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const storageName = document.getElementById("storage-name").value;
    const storageCountry = document.getElementById("storage-country").value;
    const storageCounty = document.getElementById("storage-county").value;

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a storage location.");
      return;
    }

    const userId = user.uid;

    try {
      const storageRef = push(ref(database, `storageLocations`));
      await set(storageRef, {
        userId, // Save the UserID
        storageName,
        storageCountry,
        storageCounty,
      });

      alert("Storage location added successfully!");
      addStorageForm.reset();
    } catch (error) {
      console.error("Error adding storage location:", error.message);
      alert("Failed to add storage location. Please try again.");
    }
  });

  // Load Existing Storage Locations
  function loadStorageLocations() {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to view storage locations.");
      return;
    }

    const userId = user.uid;
    const storageRef = ref(database, "storageLocations");

    onValue(storageRef, (snapshot) => {
      storageList.innerHTML = ""; // Clear the list before adding new items
      snapshot.forEach((childSnapshot) => {
        const storage = childSnapshot.val();
        if (storage.userId === userId) {
          // Filter by UserID
          const li = document.createElement("li");
          li.textContent = `${storage.storageName} - ${storage.storageCountry}, ${storage.storageCounty}`;
          storageList.appendChild(li);
        }
      });
    });
  }

  // Load storage locations on page load
  auth.onAuthStateChanged((user) => {
    if (user) {
      loadStorageLocations();
    }
  });
});
