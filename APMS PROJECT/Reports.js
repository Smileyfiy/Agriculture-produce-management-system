import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, push, get, onValue, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from './firebaseconnection.js';

const auth = getAuth(app);
const database = getDatabase(app);

// DOM Elements
const reportForm = document.getElementById('report-form');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const reportTypeInput = document.getElementById('report-type');
const reportsContainer = document.getElementById('reports-container');
const toast = document.getElementById('toast');

// Modal Controls
const openReportModalButton = document.getElementById('open-report-modal');
const reportModal = document.getElementById('report-modal');
const closeReportModalButton = document.getElementById('close-report-modal');
const cancelReportButton = document.getElementById('cancel-report');

let currentUserId = null;

// ----- Modal Event Listeners -----
if (openReportModalButton) {
  openReportModalButton.addEventListener('click', () => {
    reportModal.classList.remove('hidden');
  });
}
if (closeReportModalButton) {
  closeReportModalButton.addEventListener('click', () => {
    reportModal.classList.add('hidden');
  });
}
if (cancelReportButton) {
  cancelReportButton.addEventListener('click', () => {
    reportModal.classList.add('hidden');
  });
}

// ----- Toast Function -----
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hidden');
  }, 3000);
}

// ----- Format Report Type -----
function formatReportType(type) {
  switch (type) {
    case 'produce': return 'Produce Report';
    case 'inventory': return 'Inventory Report';
    case 'sales': return 'Sales Report';
    case 'totalSales': return 'Total Sales Report';
    case 'weeklySales': return 'Weekly Sales Report';
    default: return type;
  }
}

// ----- Load Saved Reports -----
function loadSavedReports(userId) {
  const reportsRef = ref(database, `reports/${userId}`);
  reportsContainer.innerHTML = '<p>Loading reports...</p>';
  
  onValue(reportsRef, (snapshot) => {
    console.log('snapshot.exists()?', snapshot.exists());
    console.log('snapshot.val()', snapshot.val());

    reportsContainer.innerHTML = '';
    if (snapshot.exists()) {
      const reportsArray = Object.entries(snapshot.val()).sort((a, b) => b[1].dateCreated - a[1].dateCreated);
      console.log('Reports Array:', reportsArray);
      reportsArray.forEach(([reportId, report]) => {
        createReportCard(reportId, report);
      });
    } else {
      reportsContainer.innerHTML = '<p>No reports found. Generate one above.</p>';
    }
  }, { onlyOnce: true });
}

// ----- Create Report Card -----
function createReportCard(reportId, report) {
  const card = document.createElement('div');
  card.className = 'report-card';
  // Optionally, you could set a data attribute: card.dataset.id = reportId;
  const reportDate = new Date(report.dateCreated).toLocaleDateString();
  card.innerHTML = `
    <h3>${formatReportType(report.reportType)}</h3>
    <p><strong>Created:</strong> ${reportDate}</p>
    <div class="report-content" id="report-${reportId}">
      ${report.content}
    </div>
    <button onclick="exportReport('${reportId}')">📄 Export PDF</button>
    <button onclick="deleteReport('${reportId}')">🗑️ Delete Report</button>
  `;
  reportsContainer.appendChild(card);

  // If the report type is sales-based, try to render a chart.
  if (report.reportType === 'sales' || report.reportType === 'totalSales') {
    renderChart(reportId, report.content, report.reportType);
  }
}

// ----- Render Chart Function -----
function renderChart(reportId, content, type) {
  try {
    const parsedData = JSON.parse(content);
    let labels = [];
    let data = [];

    // For sales reports, we expect JSON array; for totalSales, it might be a plain object
    if (Array.isArray(parsedData)) {
      labels = parsedData.map(item => item.produceType || 'Unknown');
      data = parsedData.map(item => type === 'sales' ? item.salePrice : item.quantitySold);
    } else if (typeof parsedData === 'object' && parsedData !== null) {
      labels = Object.keys(parsedData);
      data = Object.values(parsedData).map(item => item.totalRevenue || 0);
    } else {
      console.log('No chart to render: parsedData is invalid.');
      return;
    }

    const ctx = document.createElement('canvas');
    const container = document.getElementById(`report-${reportId}`);
    container.innerHTML = ''; // Clear previous content
    container.appendChild(ctx);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: type === 'sales' ? 'Sale Price ($)' : 'Total Revenue ($)',
          data,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  } catch (error) {
    console.error('Chart Error:', error);
  }
}

// ----- Export Report to PDF -----
window.exportReport = function(reportId) {
  const element = document.getElementById(`report-${reportId}`);
  html2pdf().from(element).save();
};

// ----- Delete Report Function -----
window.deleteReport = async function(reportId) {
  if (!confirm("Are you sure you want to delete this report?")) return;
  try {
    await remove(ref(database, `reports/${currentUserId}/${reportId}`));
    showToast("🗑️ Report deleted successfully!");
  } catch (error) {
    console.error(error);
    showToast("❌ Failed to delete report.");
  }
};

// ----- Filter Reports Function -----
window.filterReports = function(type) {
  const cards = document.querySelectorAll('.report-card');
  cards.forEach(card => {
    const title = card.querySelector('h3')?.textContent.toLowerCase();
    if (!type || (title && title.includes(type.toLowerCase()))) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
};

// ----- Generate Report -----
async function generateReport(e) {
  e.preventDefault();

  if (!currentUserId) {
    showToast("❌ User not authenticated.");
    return;
  }

  const startDateValue = startDateInput.value;
  const endDateValue = endDateInput.value;
  const reportType = reportTypeInput.value;

  let startDate, endDate;

  // 💥 Patch: Force start and end dates if missing
  if (!startDateValue || !endDateValue) {
    const now = Date.now();
    startDate = now;
    endDate = now;
  } else {
    startDate = new Date(startDateValue).getTime();
    endDate = new Date(endDateValue).getTime();
  }

  if (!reportType) {
    showToast("❌ Please select a report type.");
    return;
  }

  let content = '';

  try {
    if (reportType === 'sales' || reportType === 'totalSales') {
      const salesSnapshot = await get(ref(database, `sales/${currentUserId}`));
      if (salesSnapshot.exists()) {
        const salesData = [];
        salesSnapshot.forEach(childSnapshot => {
          const sale = childSnapshot.val();
          const saleDate = new Date(sale.saleDate).getTime();
          if (saleDate >= startDate && saleDate <= endDate) {
            salesData.push({
              produceType: sale.produceType,
              quantitySold: sale.quantitySold,
              salePrice: sale.salePrice,
              saleDate: saleDate
            });
          }
        });
        content = salesData.length > 0 ? JSON.stringify(salesData) : "<p>No sales data found.</p>";
      } else {
        content = "<p>No sales available.</p>";
      }
    }

    if (reportType === 'inventory') {
      const storageSnapshot = await get(ref(database, `users/${currentUserId}/storageLocations`));
      if (storageSnapshot.exists()) {
        let table = `<table><thead><tr><th>Name</th><th>Country</th><th>County</th></tr></thead><tbody>`;
        storageSnapshot.forEach(childSnapshot => {
          const storage = childSnapshot.val();
          table += `<tr>
            <td>${storage.storageName}</td>
            <td>${storage.storageCountry}</td>
            <td>${storage.storageCounty}</td>
          </tr>`;
        });
        table += `</tbody></table>`;
        content = table;
      } else {
        content = "<p>No storage locations available.</p>";
      }
    }

    // 🔥 Log what we are trying to save
    console.log("Attempting to push report:", {
      reportType,
      dateCreated: Date.now(),
      dateRange: {
        start: startDate,
        end: endDate
      },
      content: content || "<p>No content generated.</p>"
    });

    // 🔥 Always safe fallback content
    const reportData = {
      reportType,
      dateCreated: Date.now(),
      dateRange: {
        start: startDate,
        end: endDate
      },
      content: content || "<p>No content generated.</p>"
    };

    await push(ref(database, `reports/${currentUserId}`), reportData);

    showToast("✅ Report generated!");
    reportForm.reset();
    reportModal.classList.add('hidden');

    setTimeout(() => {
      loadSavedReports(currentUserId);
    }, 500);

  } catch (error) {
    console.error("Error generating report:", error);
    showToast("❌ Failed to generate report.");
  }
}

// ----- Authentication & Form Attachment -----
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "Login.html";
    return;
  }
  currentUserId = user.uid;
  loadSavedReports(currentUserId);
  
  // Attach form listener now that user is authenticated
  if (reportForm) {
    reportForm.addEventListener('submit', generateReport);
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('report-form');
  if (form) {
    form.addEventListener('submit', generateReport);
    console.log('✅ Form listener attached!');
  } else {
    console.log('❌ Form not found');
  }
});
