import { database } from "./firebase.js";
import { ref, push, onValue } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
    // Get references to DOM elements
    const produceForm = document.getElementById("produce-entry-form");
    const dashboardOverviewCard = document.getElementById("dashboard-overview-card");
    const totalInventoryCard = document.getElementById("total-inventory-card");
    const produceList = document.querySelector(".cards");

    // Handle form submission
    produceForm.addEventListener("submit", (event) => {
        event.preventDefault(); // Prevent form from refreshing the page

        // Get form values
        const produceType = document.getElementById("produce-type").value.trim();
        const produceQuantity = document.getElementById("produce-quantity").value.trim();
        const harvestDate = document.getElementById("harvest-date").value.trim();
        const storageLocation = document.getElementById("storage-location").value.trim();
        const expectedSaleDate = document.getElementById("expected-sale-date").value.trim();
        const produceCategory = document.getElementById("produce-category").value;

        // Validate form values
        if (!produceType || !produceQuantity || !harvestDate || !storageLocation || !expectedSaleDate || !produceCategory) {
            alert("Please fill in all fields.");
            return;
        }

        // Push the data to Firebase
        const produceRef = ref(database, "produce");
        push(produceRef, {
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
                produceForm.reset(); // Clear the form
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
        const produceRef = ref(database, "produce");
        onValue(produceRef, (snapshot) => {
            produceList.innerHTML = ""; // Clear the list
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

    // Calculate total inventory weight on page load
    calculateTotalInventory();
});