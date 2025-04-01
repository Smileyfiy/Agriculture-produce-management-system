import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { app } from "./firebaseconnection.js"; // Import the initialized Firebase app

const auth = getAuth(app);

// Handle Registration
export async function registerUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User registered:", userCredential.user);
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
export async function logoutUser() {
  try {
    await signOut(auth);
    console.log("User logged out");
    alert("Logout successful!");
    window.location.href = "Login.html"; // Redirect to login page
  } catch (error) {
    console.error("Error logging out:", error.message);
    alert(error.message);
  }
}