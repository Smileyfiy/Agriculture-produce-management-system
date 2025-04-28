import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from './firebaseconnection.js';

const auth = getAuth(app);
const database = getDatabase(app);

const addProduceForm = document.getElementById('add-produce-form');
const addStorageForm = document.getElementById('add-storage-form');
const storageLocationSelect = document.getElementById('storage-location');
const toast = document.getElementById('toast');
const tableBody = document.getElementById('produce-table-body');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hidden');
  }, 3000);
}

// Load Storage Locations into dropdown
function loadStorageLocations(userId) {
  onValue(ref(database, `users/${userId}/storageLocations`), (snapshot) => {
    storageLocationSelect.innerHTML = `<option value="">Select Storage Location</option>`;
    snapshot.forEach(childSnapshot => {
      const location = childSnapshot.val();
      const option = document.createElement('option');
      option.value = location.storageName;
      option.textContent = location.storageName;
      storageLocationSelect.appendChild(option);
    });
  });
}

// Load Produce Items into Table
function loadProduce(userId) {
  const produceRef = ref(database, `produce/${userId}`);
  onValue(produceRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.log("🚫 No produce found for this user.");
      tableBody.innerHTML = `<tr><td colspan="6">No produce found. Add some!</td></tr>`;
      document.getElementById('total-quantity').textContent = `Total Quantity: 0`;
      document.getElementById('individual-produce-list').innerHTML = "";
      return;
    }
    
    tableBody.innerHTML = ""; // Clear old rows
    let totalQuantity = 0;
    const produceCounts = {}; // { Tomatoes: 500, Onions: 300, etc. }
    
    snapshot.forEach(childSnapshot => {
      const produce = childSnapshot.val();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${produce.produceType}</td>
        <td>${produce.quantity}</td>
        <td>${produce.harvestDate}</td>
        <td>${produce.category}</td>
        <td>${produce.storageLocation}</td>
        <td>
          <button class="btn-delete" onclick="deleteProduce('${childSnapshot.key}')">🗑️ Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);

      // Update totals
      totalQuantity += produce.quantity;
      if (produce.produceType in produceCounts) {
        produceCounts[produce.produceType] += produce.quantity;
      } else {
        produceCounts[produce.produceType] = produce.quantity;
      }
    });

    // Update total quantity
    document.getElementById('total-quantity').textContent = `Total Quantity: ${totalQuantity}`;

    // Update individual produce list
    const produceListDiv = document.getElementById('individual-produce-list');
    produceListDiv.innerHTML = "";
    for (const [type, qty] of Object.entries(produceCounts)) {
      const p = document.createElement('p');
      p.textContent = `${type}: ${qty}`;
      produceListDiv.appendChild(p);
    }
  }, (error) => {
    console.error("❌ Error fetching produce:", error);
    tableBody.innerHTML = `<tr><td colspan="6">🚫 You don't have permission to view produce data. Please contact support.</td></tr>`;
  });
}

// Delete Produce Item
window.deleteProduce = async function(id) {
  const user = auth.currentUser;
  if (!user) return;

  // Confirmation prompt
  const confirmation = confirm("Are you sure you want to delete this produce entry?");
  if (!confirmation) {
    return; // User cancelled
  }

  await remove(ref(database, `produce/${user.uid}/${id}`));
  showToast("🗑️ Produce deleted!");
};

// Authentication and Initialization
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "Login.html";
    return;
  }

  console.log("✅ User authenticated:", user.uid); // DEBUG

  // Load Produce Items into Table
  loadProduce(user.uid);

  // Load Storage Locations into Dropdown
  loadStorageLocations(user.uid);

  // Add Produce
  addProduceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const produceType = document.getElementById('produce-type').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const harvestDate = document.getElementById('harvest-date').value;
    const category = document.getElementById('category').value;
    const storageLocation = document.getElementById('storage-location').value;

    const produceData = {
      produceType,
      quantity,
      harvestDate,
      category,
      storageLocation,
      timestamp: new Date().toISOString()
    };

    await push(ref(database, `produce/${user.uid}`), produceData);

    // Push Notification
    await push(ref(database, `notifications/${user.uid}`), {
      subject: "New Produce Added",
      message: `Added ${produceType} (${quantity} units) to ${storageLocation}.`,
      timestamp: new Date().toISOString()
    });

    addProduceForm.reset();
    showToast("✅ Produce added successfully!");
  });

  // Add Storage Location
  addStorageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const storageName = document.getElementById('storage-name').value;
    const storageCountry = document.getElementById('storage-country').value;
    const storageCounty = document.getElementById('storage-county').value;

    const storageData = {
      storageName,
      storageCountry,
      storageCounty
    };

    await push(ref(database, `users/${user.uid}/storageLocations`), storageData);

    // Push Notification
    await push(ref(database, `notifications/${user.uid}`), {
      subject: "New Storage Added",
      message: `Storage location "${storageName}" added.`,
      timestamp: new Date().toISOString()
    });

    addStorageForm.reset();
    showToast("✅ Storage location added!");
  });
});
