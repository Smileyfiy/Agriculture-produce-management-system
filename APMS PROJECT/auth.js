import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from "./firebaseconnection.js"; // Import the initialized Firebase app

const auth = getAuth(app);
const database = getDatabase(app);

// Redirect to login page if the user is not authenticated
onAuthStateChanged(auth, (user) => {
  const currentPath = window.location.pathname;

  // Allow access to Register.html and Login.html without authentication
  if (!user && !["/Login.html", "/Register.html"].includes(currentPath)) {
    window.location.replace("Login.html");
  }
});

// Handle Registration
export async function registerUser({ name, phone, email, password, country, county }) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Save user details to Firebase
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, {
      name,
      phone,
      email,
      country,
      county,
    });

    alert("Registration successful!");
    window.location.href = "Login.html"; // Redirect to login page
  } catch (error) {
    console.error("Error registering user:", error.message);
    alert(error.message);
  }
}

// Handle Login
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("User logged in:", userCredential.user);
    alert("Login successful!");
    window.location.href = "Homepage.html"; // Redirect to homepage
  } catch (error) {
    console.error("Error logging in:", error.message);
    alert(error.message);
  }
}

// Handle Logout
document.addEventListener("DOMContentLoaded", () => {
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        await logoutUser();
      } catch (error) {
        console.error("Error during logout:", error.message);
        alert(error.message);
      }
    });
  } else {
    console.error("Logout button not found in the DOM.");
  }
});

export async function logoutUser() {
  console.log("Logout function called");
  try {
    await signOut(auth);
    console.log("User logged out");
    alert("Logout successful!");

    // Redirect to the login page and replace the current history entry
    window.location.replace("Login.html");
  } catch (error) {
    console.error("Error logging out:", error.message);
    alert(error.message);
  }
}

onAuthStateChanged(auth, async (user) => {
  const currentPath = window.location.pathname;

  // Allow access to Register.html and Login.html without authentication
  if (!user && !["/Login.html", "/Register.html"].includes(currentPath)) {
    window.location.replace("Login.html");
  }
});