import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  update,
  onValue,
  remove,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from "./firebaseconnection.js";

const auth = getAuth(app);
const database = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
  const accountForm = document.querySelector(".account-details form");
  const deleteButton = document.getElementById("delete-account");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const countryInput = document.getElementById("country");
  const countyInput = document.getElementById("county");
  const passwordInput = document.getElementById("password");

  // Load user account data
  const loadAccountData = () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("User is not logged in.");
      return;
    }

    const userId = user.uid;
    const userRef = ref(database, `users/${userId}`);

    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        nameInput.value = userData.name || "";
        emailInput.value = userData.email || "";
        phoneInput.value = userData.phone || "";
        countryInput.value = userData.country || "";
        countyInput.value = userData.county || "";
      } else {
        console.log("No account data found for this user.");
      }
    });
  };

  // Save user account data
  accountForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to update your account.");
      return;
    }

    const userId = user.uid;
    const userRef = ref(database, `users/${userId}`);

    const updatedData = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      country: countryInput.value.trim(),
      county: countyInput.value.trim(),
    };

    if (passwordInput.value.trim()) {
      updatedData.password = passwordInput.value.trim(); // Optional: Handle password updates securely
    }

    try {
      await update(userRef, updatedData);
      alert("Account details updated successfully!");
    } catch (error) {
      console.error("Error updating account details:", error);
      alert("Failed to update account details. Please try again.");
    }
  });

  // Delete user account data
  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to delete your account.");
        return;
      }

      const userId = user.uid;
      const userRef = ref(database, `users/${userId}`);

      if (
        confirm(
          "Are you sure you want to delete your account? This action cannot be undone."
        )
      ) {
        try {
          // Delete user data from Firebase Realtime Database
          await remove(userRef);

          // Log the user out
          await auth.signOut();

          alert("Account deleted successfully!");
          window.location.href = "/"; // Redirect to the homepage or login page
        } catch (error) {
          console.error("Error deleting account:", error);
          alert("Failed to delete account. Please try again.");
        }
      }
    });
  } else {
    console.error("Delete Account button not found in the DOM.");
  }

  // Initialize on auth state change
  auth.onAuthStateChanged((user) => {
    if (user) {
      loadAccountData();
    } else {
      console.error("User is not logged in.");
    }
  });
});

async function notifyAccountChange(changeDetails) {
  const email = "user@example.com";
  const subject = "Account Details Updated";
  const message = `Your account details have been updated: ${changeDetails}.`;
  await sendNotification(email, subject, message);
}
async function notifyAccountDeletion() {
    const email = "user@example.com";
    const subject = "Account Deleted";
    const message = "Your account has been successfully deleted.";
    await sendNotification(email, subject, message);
  }
