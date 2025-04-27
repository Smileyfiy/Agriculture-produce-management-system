import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from './firebaseconnection.js';

const auth = getAuth(app);
const database = getDatabase(app);

const addProduceForm = document.getElementById('add-produce-form');
const addStorageForm = document.getElementById('add-storage-form');
const produceCards = document.getElementById('produce-cards');
const storageLocationSelect = document.getElementById('storage-location');
const toast = document.getElementById('toast');

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

// Load Produce Items
function loadProduce(userId) {
  onValue(ref(database, `produce/${userId}`), (snapshot) => {
    produceCards.innerHTML = "";
    snapshot.forEach(childSnapshot => {
      const produce = childSnapshot.val();
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${produce.produceType}</h3>
        <p><strong>Quantity:</strong> ${produce.quantity}</p>
        <p><strong>Harvest Date:</strong> ${produce.harvestDate}</p>
        <p><strong>Category:</strong> ${produce.category}</p>
        <p><strong>Storage:</strong> ${produce.storageLocation}</p>
        <div class="card-buttons">
          <button class="btn-delete" onclick="deleteProduce('${childSnapshot.key}')">🗑️ Delete</button>
        </div>
      `;
      produceCards.appendChild(card);
    });
  });
}

window.deleteProduce = async function(id) {
  const user = auth.currentUser;
  if (!user) return;
  await remove(ref(database, `produce/${user.uid}/${id}`));
  showToast("🗑️ Produce deleted!");
};

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "Login.html";
    return;
  }

  loadProduce(user.uid);
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
