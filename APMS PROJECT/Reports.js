import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, get, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from './firebaseconnection.js';

const auth = getAuth(app);
const database = getDatabase(app);

// Elements
const openModalBtn = document.getElementById('open-report-modal');
const closeModalBtn = document.getElementById('close-report-modal');
const cancelBtn = document.getElementById('cancel-report');
const reportModal = document.getElementById('report-modal');
const generateForm = document.getElementById('generate-report-form');
const loadingSpinner = document.getElementById('report-loading');
const reportsContainer = document.getElementById('reports-container');

// Open modal
openModalBtn.addEventListener('click', () => {
  reportModal.classList.remove('hidden');
});

// Close modal
closeModalBtn.addEventListener('click', () => {
  reportModal.classList.add('hidden');
});

// Cancel button
cancelBtn.addEventListener('click', () => {
  reportModal.classList.add('hidden');
});

// Toast
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 4000);
}

let allReportCards = [];
let reportsPerPage = 10;
let currentIndex = 0;

// Load Reports
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("Login.html");
    return;
  }

  generateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await generateReport(user.uid);
  });

  onValue(ref(database, `reports/${user.uid}`), (snapshot) => {
    reportsContainer.innerHTML = "";
    allReportCards = [];
    currentIndex = 0;

    if (!snapshot.exists()) {
      reportsContainer.innerHTML = "<p>No reports found.</p>";
      return;
    }

    const reportsArray = [];
    snapshot.forEach(childSnapshot => {
      const report = childSnapshot.val();
      const id = childSnapshot.key;
      reportsArray.push({ report, id });
    });

    // Sort reports by date DESCENDING
    reportsArray.sort((a, b) => b.report.dateCreated - a.report.dateCreated);

    // Save all cards
    reportsArray.forEach(({ report, id }) => {
      const card = createReportCard(report, id);
      card.classList.add('hide');
      reportsContainer.appendChild(card);
      allReportCards.push(card);
    });

    showNextReports();
  });
});

// Show next 10 reports
function showNextReports() {
  const nextReports = allReportCards.slice(currentIndex, currentIndex + reportsPerPage);
  nextReports.forEach(card => card.classList.remove('hide'));
  currentIndex += reportsPerPage;

  const loadMoreBtn = document.getElementById('load-more-button');
  if (currentIndex >= allReportCards.length) {
    loadMoreBtn.classList.add('hidden');
  } else {
    loadMoreBtn.classList.remove('hidden');
  }
}

// Hook View More Button
document.getElementById('load-more-button').addEventListener('click', showNextReports);

// Generate Report
async function generateReport(userId) {
  const reportType = document.getElementById('report-type').value;
  const startDate = new Date(document.getElementById('start-date').value);
  const endDate = new Date(document.getElementById('end-date').value);

  if (!reportType || !startDate || !endDate) {
    showToast("❌ Please fill all fields.", "error");
    return;
  }

  try {
    loadingSpinner.classList.remove('hidden');

    let content = {};

    if (reportType === 'sales') {
      const salesSnapshot = await get(ref(database, `sales/${userId}`));
      if (salesSnapshot.exists()) {
        salesSnapshot.forEach(childSnapshot => {
          const sale = childSnapshot.val();
          const saleDate = new Date(sale.saleDate);
          if (saleDate >= startDate && saleDate <= endDate) {
            content[childSnapshot.key] = sale;
          }
        });
      }
    }

    if (reportType === 'totalSales') {
      const salesSnapshot = await get(ref(database, `sales/${userId}`));
      if (salesSnapshot.exists()) {
        salesSnapshot.forEach(childSnapshot => {
          const sale = childSnapshot.val();
          if (!content[sale.produceType]) {
            content[sale.produceType] = { quantitySold: 0, totalRevenue: 0 };
          }
          content[sale.produceType].quantitySold += sale.quantitySold;
          content[sale.produceType].totalRevenue += sale.salePrice;
        });
      }
    }

    if (reportType === 'inventory' || reportType === 'produce') {
      const produceSnapshot = await get(ref(database, `produce/${userId}`));
      if (produceSnapshot.exists()) {
        produceSnapshot.forEach(childSnapshot => {
          content[childSnapshot.key] = childSnapshot.val();
        });
      }
    }

    const reportData = {
      reportType: reportType,
      dateCreated: Date.now(),
      dateRange: { start: startDate.getTime(), end: endDate.getTime() },
      content: JSON.stringify(content)
    };

    await push(ref(database, `reports/${userId}`), reportData);

    // Add notification for the new report
    const notificationData = {
      subject: "New Report Created",
      message: `A new ${capitalize(reportType)} report has been generated.`,
      timestamp: new Date().toISOString()
    };

    await push(ref(database, `notifications/${userId}`), notificationData);

    loadingSpinner.classList.add('hidden');
    showToast("✅ Report Generated Successfully!", "success");
    reportModal.classList.add('hidden');

  } catch (error) {
    console.error(error);
    showToast("❌ Failed to generate report!", "error");
    loadingSpinner.classList.add('hidden');
  }
}

// Create Report Card
function createReportCard(report, id) {
  const card = document.createElement('div');
  card.className = 'report-card';
  card.dataset.type = report.reportType;

  const chartId = `chart-${id}`;
  const reportData = JSON.parse(report.content);
  let reportBody = '';

  if (report.reportType === 'sales') {
    reportBody = '<ul>';
    for (const key in reportData) {
      const sale = reportData[key];
      reportBody += `<li>🛒 ${sale.produceType} - ${sale.quantitySold} units on ${new Date(sale.saleDate).toLocaleDateString()}</li>`;
    }
    reportBody += '</ul>';
  }

  if (report.reportType === 'totalSales') {
    reportBody = '<ul>';
    for (const produce in reportData) {
      reportBody += `<li>💰 ${produce}: ${reportData[produce].quantitySold} sold, $${reportData[produce].totalRevenue.toFixed(2)}</li>`;
    }
    reportBody += '</ul>';
  }

  if (report.reportType === 'inventory') {
    reportBody = '<ul>';
    for (const key in reportData) {
      const item = reportData[key];
      reportBody += `<li>📦 ${item.type} - ${item.quantity} units (${item.category})</li>`;
    }
    reportBody += '</ul>';
  }

  if (report.reportType === 'produce') {
    reportBody = '<ul>';
    for (const key in reportData) {
      const item = reportData[key];
      reportBody += `<li>🌽 ${item.type} - ${item.quantity} harvested (${item.category})</li>`;
    }
    reportBody += '</ul>';
  }

  card.innerHTML = `
    <div class="report-header">
      <h3>${capitalize(report.reportType)} Report</h3>
      <div>
        <p>${new Date(report.dateCreated).toLocaleDateString()}</p>
        <button class="btn-secondary" onclick='exportReportToPDF(${JSON.stringify(report)}, "${id}")'>Export PDF</button>
        <button class="btn-danger" onclick='deleteReport("${id}")'>Delete</button>
      </div>
    </div>
    <div class="report-body">
      ${reportBody}
      <canvas id="${chartId}" style="margin-top: 20px;"></canvas>
    </div>
  `;

  // Add card to DOM
  reportsContainer.appendChild(card);

  // Wait until DOM is ready to draw chart
  setTimeout(() => {
    const ctx = document.getElementById(chartId)?.getContext('2d');
    if (ctx) {
      drawChart(ctx, report.reportType, reportData);
    }
  }, 50);

  return card;
}

// Draw Mini Chart
function drawChart(ctx, type, data) {
  if (type === 'totalSales') {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label: 'Revenue ($)',
          data: Object.values(data).map(d => d.totalRevenue),
          backgroundColor: 'rgba(75,192,192,0.6)',
          borderColor: 'rgba(75,192,192,1)',
          borderWidth: 2
        }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

  if (type === 'sales') {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.values(data).map(d => new Date(d.saleDate).toLocaleDateString()),
        datasets: [{
          label: 'Quantity Sold',
          data: Object.values(data).map(d => d.quantitySold),
          borderColor: 'rgba(153,102,255,1)',
          fill: false,
          tension: 0.1
        }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }
}

// Export Report to PDF
async function exportReportToPDF(report, id) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const reportData = JSON.parse(report.content);
  let y = 10;

  doc.setFontSize(18);
  doc.text(`${capitalize(report.reportType)} Report`, 10, y);
  y += 10;
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date(report.dateCreated).toLocaleDateString()}`, 10, y);
  y += 10;

  if (report.reportType === 'sales') {
    for (const key in reportData) {
      const sale = reportData[key];
      doc.text(`🛒 ${sale.produceType} - ${sale.quantitySold} units (${new Date(sale.saleDate).toLocaleDateString()})`, 10, y);
      y += 7;
    }
  }

  if (report.reportType === 'totalSales') {
    for (const produce in reportData) {
      const item = reportData[produce];
      doc.text(`💰 ${produce}: ${item.quantitySold} sold, $${item.totalRevenue.toFixed(2)}`, 10, y);
      y += 7;
    }
  }

  if (report.reportType === 'inventory' || report.reportType === 'produce') {
    for (const key in reportData) {
      const item = reportData[key];
      doc.text(`🌽 ${item.type} - ${item.quantity} units - ${item.category}`, 10, y);
      y += 7;
    }
  }

  doc.save(`${report.reportType}-report-${id}.pdf`);
}

// Filter Reports by Type
function filterReports(type) {
  const allReports = document.querySelectorAll('.report-card');
  allReports.forEach(report => {
    if (type === 'all' || report.dataset.type === type) {
      report.style.display = 'block';
    } else {
      report.style.display = 'none';
    }
  });
}


// Capitalize Helper
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

window.filterReports = filterReports;
window.exportReportToPDF = exportReportToPDF;
window.showToast = showToast;
window.deleteReport = async function (id) {
  if (confirm("Are you sure you want to delete this report? This cannot be undone.")) {
    const user = auth.currentUser;
    if (!user) {
      showToast("❌ You must be logged in to delete.", "error");
      return;
    }

    try {
      // Remove the report from the database
      await remove(ref(database, `reports/${user.uid}/${id}`));

      // Remove the report card from the DOM
      const reportCard = document.querySelector(`.report-card[data-id="${id}"]`);
      if (reportCard) {
        reportCard.remove();
      }

      showToast("🗑️ Report deleted successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to delete report.", "error");
    }
  }
};

