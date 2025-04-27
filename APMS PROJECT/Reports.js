import { database } from './firebaseconnection.js';
import { ref, get, set, push, query, orderByChild, startAt, endAt } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { auth } from './firebaseconnection.js'; // For user authentication

// UI Elements
const reportsContainer = document.getElementById('reports-container');
const reportModal = document.getElementById('report-modal');
const reportForm = document.getElementById('report-form');

// Report Types Configuration
const reportConfig = {
  sales: {
    icon: 'chart-line',
    fields: ['produceName', 'quantity', 'pricePerUnit', 'saleDate']
  },
  inventory: {
    icon: 'boxes',
    fields: ['name', 'category', 'quantity', 'dateAdded']
  },
  produce: {
    icon: 'seedling',
    fields: ['name', 'category', 'quantity', 'dateAdded']
  },
  totalSales: { // New report type
    icon: 'dollar-sign',
    fields: ['produceName', 'totalQuantity', 'totalRevenue']
  }
};

// Initialize Reports
document.addEventListener('DOMContentLoaded', () => {
  loadSavedReports();
  setupEventListeners();
});

function setupEventListeners() {
 

  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(reportForm);
    const reportType = document.querySelector('.type-card.selected').dataset.type;
    const startDate = new Date(document.getElementById('report-start').value);
    const endDate = new Date(document.getElementById('report-end').value);
    
    await generateReport(reportType, startDate, endDate);
    
  });

  document.querySelectorAll('.type-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
}

async function generateReport(type, start, end) {
  try {
    const reportData = await fetchReportData(type, start, end);
    const reportId = push(ref(database, `reports/${userId}`)).key;
    
    const reportPayload = {
      reportType: type,
      dateCreated: Date.now(),
      dateRange: {
        start: start.getTime(),
        end: end.getTime()
      },
      content: JSON.stringify(reportData)
    };

    await set(ref(database, `reports/${userId}/${reportId}`), reportPayload);
    renderReportCard(reportPayload, reportId);
    await exportToPDF(reportData, type, start, end);
    
  } catch (error) {
    console.error("Report generation failed:", error);
    alert("Error generating report. Please try again.");
  }
}

async function fetchReportData(type, start, end) {
  if (type === 'totalSales') {
    const snapshot = await get(ref(database, `sales/${userId}`));
    if (!snapshot.exists()) return {};

    const salesData = snapshot.val();
    const totalSales = {};

    // Calculate total sales for each produce
    Object.values(salesData).forEach((sale) => {
      const saleDate = new Date(sale.saleDate).getTime();
      if (saleDate >= start.getTime() && saleDate <= end.getTime()) {
        const produceName = sale.produceName;
        if (!totalSales[produceName]) {
          totalSales[produceName] = { totalQuantity: 0, totalRevenue: 0 };
        }
        totalSales[produceName].totalQuantity += sale.quantity;
        totalSales[produceName].totalRevenue += sale.quantity * sale.pricePerUnit;
      }
    });

    return totalSales;
  }

  // Default behavior for other report types
  const snapshot = await get(query(
    ref(database, `${type}/${userId}`),
    orderByChild('date'),
    startAt(start.getTime()),
    endAt(end.getTime())
  ));

  return snapshot.exists() ? snapshot.val() : {};
}

function renderReportCard(report, id) {
  const card = document.createElement('div');
  card.className = 'report-card';
  card.innerHTML = `
    <div class="report-header">
      <div class="report-type">
        <i class="fas fa-${reportConfig[report.reportType].icon}"></i>
        <h3>${capitalize(report.reportType)} Report</h3>
      </div>
      <span class="report-date">${new Date(report.dateCreated).toLocaleDateString()}</span>
    </div>
    <div class="report-meta">
      <p>Date Range: ${new Date(report.dateRange.start).toLocaleDateString()} - 
      ${new Date(report.dateRange.end).toLocaleDateString()}</p>
    </div>
    <div class="report-actions">
      <button class="btn-primary" onclick="viewReport('${id}')">
        <i class="fas fa-eye"></i>
      </button>
      <button class="btn-primary" onclick="exportReport('${id}')">
        <i class="fas fa-download"></i>
      </button>
    </div>
  `;

  if (report.reportType === 'totalSales') {
    const totalSalesData = JSON.parse(report.content);
    const salesSummary = Object.entries(totalSalesData)
      .map(([produceName, data]) => `
        <p>${produceName}: ${data.totalQuantity} units sold, $${data.totalRevenue.toFixed(2)} revenue</p>
      `)
      .join('');
    card.innerHTML += `<div class="report-summary">${salesSummary}</div>`;
  }

  reportsContainer.prepend(card);
}

async function loadSavedReports() {
  const snapshot = await get(ref(database, `reports/${userId}`));
  if (snapshot.exists()) {
    Object.entries(snapshot.val()).forEach(([id, report]) => {
      renderReportCard(report, id);
    });
  }
}

async function exportToPDF(reportData, type, start, end) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`${capitalize(type)} Report`, 10, 10);
  doc.setFontSize(12);
  doc.text(`Date Range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`, 10, 20);

  if (type === 'totalSales') {
    let y = 30;
    Object.entries(reportData).forEach(([produceName, data]) => {
      doc.text(`${produceName}: ${data.totalQuantity} units sold, $${data.totalRevenue.toFixed(2)} revenue`, 10, y);
      y += 10;
    });
  } else {
    // Default behavior for other report types
    let y = 30;
    Object.entries(reportData).forEach(([key, value]) => {
      doc.text(`${key}: ${JSON.stringify(value)}`, 10, y);
      y += 10;
    });
  }

  doc.save(`${type}-report.pdf`);
}

document.getElementById('new-report-btn').addEventListener('click', () => {
  reportModal.style.display = 'block';
});

document.getElementById('cancel-report').addEventListener('click', () => {
  reportModal.style.display = 'none';
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}