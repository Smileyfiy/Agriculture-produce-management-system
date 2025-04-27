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
  const addSalesForm = document.getElementById("add-sales-form");

  addSalesForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to record sales.");
      console.error("User is not authenticated.");
      return;
    }
    console.log("Authenticated User ID:", user.uid);

    const produceName = document.getElementById("produce-name").value.trim();
    const quantity = parseInt(document.getElementById("quantity-sold").value);
    const saleDate = document.getElementById("sale-date").value;
    const salePrice = parseFloat(document.getElementById("sale-price").value);
    const buyerName = document.getElementById("buyer-name").value;
    const buyerContact = document.getElementById("buyer-contact").value;

    if (!produceName) {
      alert("Please enter a produce name.");
      return;
    }

    try {
      const produceRef = ref(database, `produce/${user.uid}`);
      const produceSnapshot = await get(produceRef);

      if (!produceSnapshot.exists()) {
        throw new Error("No produce found in the database.");
      }

      let earliestProduce = null;
      produceSnapshot.forEach((childSnapshot) => {
        const produce = childSnapshot.val();
        if (produce.type.toLowerCase() === produceName.toLowerCase()) {
          if (!earliestProduce || new Date(produce.harvestDate) < new Date(earliestProduce.harvestDate)) {
            earliestProduce = { ...produce, key: childSnapshot.key };
          }
        }
      });

      if (!earliestProduce) {
        throw new Error(`No produce found with the name "${produceName}".`);
      }

      if (quantity > earliestProduce.quantity) {
        throw new Error(`Insufficient quantity. Only ${earliestProduce.quantity} available.`);
      }

      const produceKey = earliestProduce.key;
      const produceRefToUpdate = ref(database, `produce/${user.uid}/${produceKey}`);
      await update(produceRefToUpdate, {
        quantity: earliestProduce.quantity - quantity,
      });

      console.log("Attempting to write to database...");
      await push(ref(database, `sales/${user.uid}`), {
        produceType: earliestProduce.type,
        quantitySold: quantity,
        salePrice: salePrice,
        saleDate: saleDate,
        buyerName: buyerName,
        buyerContact: buyerContact,
        timestamp: new Date().toISOString(),
      });
      console.log("Data successfully written to database.");

      alert("Sale recorded successfully!");
      addSalesForm.reset();
    } catch (error) {
      console.error("Error recording sale:", error);
      alert(`Error: ${error.message}`);
    }
  });
});