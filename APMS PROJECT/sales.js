import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from './firebaseconnection.js';

const auth = getAuth(app);
const database = getDatabase(app);

// Elements
const viewSalesTab = document.getElementById('view-sales-tab');
const scheduleSaleTab = document.getElementById('schedule-sale-tab');
const viewSalesSection = document.getElementById('view-sales-section');
const scheduleSaleSection = document.getElementById('schedule-sale-section');
const addSaleForm = document.getElementById('add-sale-form');
const scheduleSaleForm = document.getElementById('schedule-sale-form');
const salesBody = document.getElementById('sales-body');
const scheduledSalesBody = document.getElementById('scheduled-sales-body');
const totalRevenueElem = document.getElementById('total-revenue');
const totalUnitsElem = document.getElementById('total-units');
const toast = document.getElementById('toast');

// Tab Switching
viewSalesTab.addEventListener('click', () => {
  viewSalesSection.classList.add('active');
  scheduleSaleSection.classList.remove('active');
  viewSalesTab.classList.add('active');
  scheduleSaleTab.classList.remove('active');
});

scheduleSaleTab.addEventListener('click', () => {
  viewSalesSection.classList.remove('active');
  scheduleSaleSection.classList.add('active');
  viewSalesTab.classList.remove('active');
  scheduleSaleTab.classList.add('active');
});

// Toast Notification
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hidden');
  }, 3000);
}

// Load Sales
function loadSales(userId) {
  onValue(ref(database, `sales/${userId}`), (snapshot) => {
    salesBody.innerHTML = "";
    let totalRevenue = 0;
    let totalUnits = 0;

    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        const sale = childSnapshot.val();
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${sale.produceType}</td>
          <td>${sale.quantitySold}</td>
          <td>$${sale.salePrice}</td>
          <td>${new Date(sale.saleDate).toLocaleDateString()}</td>
          <td>${sale.buyerName}</td>
          <td>${sale.buyerContact}</td>
          <td>
            
            <button class="delete-btn" onclick="deleteSale('${childSnapshot.key}')">🗑️</button>
          </td>
        `;
        salesBody.appendChild(row);

        totalRevenue += sale.salePrice;
        totalUnits += sale.quantitySold;
      });
    }

    totalRevenueElem.textContent = `$${totalRevenue.toFixed(2)}`;
    totalUnitsElem.textContent = `${totalUnits}`;
  });
}

// Load Scheduled Sales
function loadScheduledSales(userId) {
  onValue(ref(database, `scheduledSales/${userId}`), (snapshot) => {
    scheduledSalesBody.innerHTML = "";

    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        const scheduledSale = childSnapshot.val();
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${scheduledSale.buyerName}</td>
          <td>${scheduledSale.produceType}</td>
          <td>${new Date(scheduledSale.saleDate).toLocaleDateString()}</td>
        `;
        scheduledSalesBody.appendChild(row);
      });
    }
  });
}

// Authentication Listener
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("Login.html");
    return;
  }

  // Load sales and scheduled sales
  loadSales(user.uid);
  loadScheduledSales(user.uid);

  // Add Sale Form Submission
  addSaleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const produceType = document.getElementById('produce-type').value;
    const quantitySold = parseInt(document.getElementById('quantity-sold').value);
    const salePrice = parseFloat(document.getElementById('sale-price').value);
    const saleDate = document.getElementById('sale-date').value;
    const buyerName = document.getElementById('buyer-name').value;
    const buyerContact = document.getElementById('buyer-contact').value;

    const saleData = {
      produceType,
      quantitySold,
      salePrice,
      saleDate,
      buyerName,
      buyerContact,
      timestamp: new Date().toISOString()
    };

    try {
      // Push sale data to Firebase
      await push(ref(database, `sales/${user.uid}`), saleData);

      // Create notification for the new sale
      const notificationData = {
        subject: "New Sale Added",
        message: `Sale recorded for ${produceType} to ${buyerName}.`,
        timestamp: new Date().toISOString()
      };
      await push(ref(database, `notifications/${user.uid}`), notificationData);

      // Show success toast and reset form
      showToast("✅ Sale added successfully!");
      addSaleForm.reset();
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to add sale.");
    }
  });

  // Schedule Sale Form Submission
  scheduleSaleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const buyerName = document.getElementById('scheduled-buyer-name').value;
    const saleDate = document.getElementById('scheduled-sale-date').value;
    const produceType = document.getElementById('scheduled-produce-type').value;

    const scheduledSaleData = {
      buyerName,
      saleDate,
      produceType,
      timestamp: new Date().toISOString()
    };

    try {
      await push(ref(database, `scheduledSales/${user.uid}`), scheduledSaleData);

      // 👇 ADD THIS: Create notification after scheduling sale
      const notificationData = {
        subject: "Sale Scheduled",
        message: `Scheduled sale of ${produceType} for ${buyerName} on ${new Date(saleDate).toLocaleDateString()}.`,
        timestamp: new Date().toISOString()
      };
      await push(ref(database, `notifications/${user.uid}`), notificationData);

      showToast("✅ Sale scheduled successfully!");
      scheduleSaleForm.reset();
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to schedule sale.");
    }
  });
});

// Delete Sale
window.deleteSale = async function(id) {
  const user = auth.currentUser;
  if (!user) {
    showToast("❌ Not authenticated.");
    return;
  }

  if (confirm("Are you sure you want to delete this sale? This cannot be undone.")) {
    try {
      await remove(ref(database, `sales/${user.uid}/${id}`));
      showToast("🗑️ Sale deleted successfully!");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to delete sale.");
    }
  }
}

