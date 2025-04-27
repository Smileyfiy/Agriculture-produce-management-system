import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  update,
  get,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from "./firebaseconnection.js";

const auth = getAuth(app);
const database = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
  const produceForm = document.getElementById("produce-entry-form");
  const addStorageForm = document.getElementById("add-storage-form");
  const storageList = document.getElementById("storage-list");
  const produceDropdown = document.getElementById("produce-dropdown");

  // Load produce options into dropdown
  const loadProduceOptions = () => {
    auth.onAuthStateChanged((user) => {
      if (!user) return;

      const userId = user.uid;
      const produceRef = ref(database, `produce/${userId}`);

      onValue(produceRef, (snapshot) => {
        produceDropdown.innerHTML =
          '<option value="" disabled selected>Select Produce</option>';

        if (!snapshot.exists()) {
          produceDropdown.innerHTML =
            '<option value="" disabled>No produce available</option>';
          return;
        }

        snapshot.forEach((childSnapshot) => {
          const produce = childSnapshot.val();
          const option = document.createElement("option");
          option.value = childSnapshot.key;
          option.textContent = `${produce.type} (${produce.quantity} units available)`;
          produceDropdown.appendChild(option);
        });
      });
    });
  };

  // Handle Produce Form Submission
  if (produceForm) {
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
      ).value;
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
          storageLocation: storageLocationKey,
          category: produceCategory,
          timestamp: new Date().toISOString(),
        });

        alert("Produce added successfully!");
        produceForm.reset();
        loadProduceOptions(); // Refresh dropdown
      } catch (error) {
        console.error("Error adding produce:", error.message);
        alert("Failed to add produce. Please try again.");
      }
    });
  }

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

      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to add a storage location.");
        return;
      }

      const userId = user.uid;

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

        alert("Storage location added successfully!");
        addStorageForm.reset();
        loadStorageLocationsForDropdown(); // Refresh dropdown
      } catch (error) {
        console.error("Error adding storage location:", error.message);
        alert("Failed to add storage location. Please try again.");
      }
    });
  }

  // Load Storage Locations for Dropdown
  const loadStorageLocationsForDropdown = () => {
    auth.onAuthStateChanged((user) => {
      if (!user) return;

      const userId = user.uid;
      const storageRef = ref(database, `users/${userId}/storageLocations`);

      onValue(storageRef, (snapshot) => {
        const storageDropdown = document.getElementById(
          "storage-location-select"
        );
        storageDropdown.innerHTML =
          '<option value="" disabled selected>Select a storage location</option>';

        if (!snapshot.exists()) return;

        snapshot.forEach((childSnapshot) => {
          const storage = childSnapshot.val();
          const option = document.createElement("option");
          option.value = childSnapshot.key;
          option.textContent = `${storage.storageName} - ${storage.storageCountry}, ${storage.storageCounty}`;
          storageDropdown.appendChild(option);
        });
      });
    });
  };

  // Load Existing Storage Locations
  const loadStorageLocations = () => {
    auth.onAuthStateChanged((user) => {
      if (!user) return;

      const userId = user.uid;
      const storageRef = ref(database, `users/${userId}/storageLocations`);

      onValue(storageRef, (snapshot) => {
        storageList.innerHTML = ""; // Clear the list before adding new items

        if (!snapshot.exists()) {
          storageList.innerHTML = "<li>No storage locations available.</li>";
          return;
        }

        snapshot.forEach((childSnapshot) => {
          const storage = childSnapshot.val();
          const li = document.createElement("li");
          li.textContent = `${storage.storageName} - ${storage.storageCountry}, ${storage.storageCounty}`;
          storageList.appendChild(li);
        });
      });
    });
  };

  // Load data on page load
  auth.onAuthStateChanged((user) => {
    if (user) {
      loadProduceOptions();
      loadStorageLocations();
      loadStorageLocationsForDropdown();
    }
  });
});

// Function to handle adding produce and sending notification
async function notifyAddProduce(produceName) {
  const user = auth.currentUser;
  if (!user) return;

  const userId = user.uid;
  const userRef = ref(database, `users/${userId}/email`);
  let email = "";

  try {
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      email = snapshot.val();
    } else {
      console.error("Email not found in the database.");
      return;
    }
  } catch (error) {
    console.error("Error fetching email from the database:", error);
    return;
  }

  const subject = "New Produce Added";
  const message = `You have added a new produce: ${produceName}.`;

  try {
    const response = await fetch("http://localhost:3000/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, subject, message }),
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.success);
      addToRecentNotifications(subject, message);
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    alert("Failed to send notification. Please try again.");
  }
}

function addToRecentNotifications(subject, message) {
  const recentNotificationsDiv = document.getElementById("recent-notifications");
  const notificationItem = document.createElement("div");
  notificationItem.className = "notification-item";
  notificationItem.innerHTML = `<strong>${subject}</strong><p>${message}</p>`;
  recentNotificationsDiv.prepend(notificationItem);

  const user = auth.currentUser;
  if (user) {
    const userId = user.uid;
    const notificationRef = push(ref(database, `notifications/${userId}`));
    set(notificationRef, {
      subject,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
