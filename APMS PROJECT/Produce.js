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
  const produceForm = document.getElementById("produce-entry-form");
  const dashboardOverviewCard = document.getElementById(
    "dashboard-overview-card"
  );
  const totalInventoryCard = document.getElementById("total-inventory-card");
  const addStorageForm = document.getElementById("add-storage-form");
  const storageList = document.getElementById("storage-list");

  // Handle Produce Form Submission
  produceForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const produceType = document.getElementById("produce-type").value.trim();
    const produceQuantity = parseInt(
      document.getElementById("produce-quantity").value.trim(),
      10
    );
    const harvestDate = document.getElementById("harvest-date").value.trim();
    const storageLocationKey = document.getElementById(
      "storage-location-select"
    ).value; // Get selected storage location key
    const produceCategory = document.getElementById("produce-category").value;

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add produce.");
      return;
    }

    const userId = user.uid;

    try {
      const produceRef = push(ref(database, `produce/${userId}`));
      await set(produceRef, {
        userId,
        type: produceType,
        quantity: produceQuantity,
        harvestDate,
        storageLocation: storageLocationKey, // Save the selected storage location key
        category: produceCategory,
        timestamp: new Date().toISOString(),
      });

      alert("Produce added successfully!");
      produceForm.reset();
    } catch (error) {
      console.error("Error adding produce:", error.message);
      alert("Failed to add produce. Please try again.");
    }
  });

  // Function to calculate total inventory weight
  function calculateTotalInventory() {
    const user = auth.currentUser;
    if (!user) {
      console.error("User is not logged in.");
      return;
    }

    const userId = user.uid;
    const produceRef = ref(database, `produce/${userId}`);

    onValue(produceRef, (snapshot) => {
      const inventoryData = {}; // Object to store grouped data

      snapshot.forEach((childSnapshot) => {
        const produce = childSnapshot.val();
        const { type, quantity, category } = produce;

        if (!inventoryData[type]) {
          // Initialize the type if it doesn't exist
          inventoryData[type] = {
            totalWeight: 0,
            category: category,
          };
        }

        // Add the quantity to the total weight for this type
        inventoryData[type].totalWeight += parseFloat(quantity) || 0;
      });

      // Generate the HTML for the Total Inventory card
      let inventoryHTML = "<h2>Total Inventory</h2>";
      for (const [type, data] of Object.entries(inventoryData)) {
        inventoryHTML += `
          <div class="inventory-item">
            <h3>${type}</h3>
            <p>Weight: ${data.totalWeight} kg</p>
            <p>Category: ${data.category}</p>
          </div>
        `;
      }

      const totalInventoryCard = document.getElementById(
        "total-inventory-card"
      );
      if (totalInventoryCard) {
        totalInventoryCard.innerHTML = inventoryHTML;
      } else {
        console.error("Total Inventory Card element not found in the DOM.");
      }
    });
  }

  // Function to load produce data into the dashboard
  function loadProduceData() {
    const user = auth.currentUser;

    const userId = user.uid;
    const produceRef = ref(database, `produce/${userId}`);

    onValue(produceRef, (snapshot) => {
      const produceList = document.querySelector(".produce-data .cards");
      produceList.innerHTML = ""; // Clear the list before adding new items

      if (!snapshot.exists()) {
        produceList.innerHTML = "<p>No produce data available.</p>";
        return;
      }

      snapshot.forEach((childSnapshot) => {
        const produce = childSnapshot.val();

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
      });
    });
  }

  // Attach event listener to the "Dashboard Overview" card
  dashboardOverviewCard.addEventListener("click", () => {
    loadProduceData();
  });

  // Attach event listener to the "Total Inventory" card
  totalInventoryCard.addEventListener("click", () => {
    calculateTotalInventory();
  });

  // Calculate total inventory weight on page load
  calculateTotalInventory();

  // Handle Add Storage Form Submission
  if (addStorageForm) {
    addStorageForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const storageName = document.getElementById("storage-name").value.trim();
      const storageCountry = document
        .getElementById("storage-country")
        .value.trim();
      const storageCounty = document
        .getElementById("storage-county")
        .value.trim();

      console.log("Storage Name:", storageName);
      console.log("Storage Country:", storageCountry);
      console.log("Storage County:", storageCounty);

      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to add a storage location.");
        return;
      }

      const userId = user.uid;
      console.log("User ID:", userId);

      try {
        const storageRef = push(
          ref(database, `users/${userId}/storageLocations`)
        );
        await set(storageRef, {
          userId,
          storageName,
          storageCountry,
          storageCounty,
        });

        console.log("Storage location added successfully!");
        alert("Storage location added successfully!");
        addStorageForm.reset();

        // Refresh the dropdown menu
        loadStorageLocationsForDropdown();
      } catch (error) {
        console.error("Error adding storage location:", error.message);
        alert("Failed to add storage location. Please try again.");
      }
    });
  } else {
    console.error("Add Storage Form element not found in the DOM.");
  }

  // Load Storage Locations for Dropdown
  function loadStorageLocationsForDropdown() {
    const user = auth.currentUser;
    if (!user) return;

    const userId = user.uid;
    const storageRef = ref(database, `users/${userId}/storageLocations`);

    onValue(storageRef, (snapshot) => {
      const storageDropdown = document.getElementById(
        "storage-location-select"
      );
      storageDropdown.innerHTML =
        '<option value="" disabled selected>Select a storage location</option>'; // Clear existing options

      if (!snapshot.exists()) {
        console.log("No storage locations found for this user.");
        return;
      }

      snapshot.forEach((childSnapshot) => {
        const storage = childSnapshot.val();
        console.log("Storage Location:", storage);

        const option = document.createElement("option");
        option.value = childSnapshot.key; // Use the storage location key as the value
        option.textContent = `${storage.storageName} - ${storage.storageCountry}, ${storage.storageCounty}`;
        storageDropdown.appendChild(option);
      });
    });
  }

  // Load Existing Storage Locations
  function loadStorageLocations() {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to view storage locations.");
      return;
    }

    const userId = user.uid;
    const storageRef = ref(database, `users/${userId}/storageLocations`);

    onValue(storageRef, (snapshot) => {
      const storageList = document.getElementById("storage-list");
      storageList.innerHTML = ""; // Clear the list before adding new items

      if (!snapshot.exists()) {
        console.log("No storage locations found for this user.");
        storageList.innerHTML = "<li>No storage locations available.</li>";
        return;
      }

      snapshot.forEach((childSnapshot) => {
        const storage = childSnapshot.val();
        console.log("Storage Location:", storage);

        const li = document.createElement("li");
        li.textContent = `${storage.storageName} - ${storage.storageCountry}, ${storage.storageCounty}`;
        storageList.appendChild(li);
      });
    });
  }

  // Load storage locations on page load or when the user logs in
  auth.onAuthStateChanged((user) => {
    if (user) {
      loadStorageLocations();
      loadStorageLocationsForDropdown();
    }
  });
});
