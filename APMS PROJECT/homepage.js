import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, get } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from "./firebaseconnection.js";

const auth = getAuth(app);
const database = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
  // References to DOM elements
  const addActivityForm = document.getElementById("add-activity-form");
  const activityInput = document.getElementById("activity-input");
  const activityList = document.getElementById("activity-list");
  const weatherDisplay = document.getElementById("current-weather");
  const checkWeatherButton = document.getElementById("check-weather-button");

  // Handle form submission for adding activities
  addActivityForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a note.");
      return;
    }

    const userId = user.uid; // Get the authenticated user's ID
    const activityText = activityInput.value.trim();

    if (activityText === "") {
      alert("Activity cannot be empty.");
      return;
    }

    try {
      const activityRef = ref(database, `activities/${userId}`);
      await push(activityRef, {
        text: activityText,
        timestamp: new Date().toISOString(),
      });

      alert("Activity added successfully!");
      activityInput.value = ""; // Clear the input field
      loadActivities(); // Reload activities after adding a new one
    } catch (error) {
      console.error("Error adding note:", error);
      alert("Failed to add activity. Please try again.");
    }
  });

  // Load activities for the current user
  function loadActivities() {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to view activities.");
      return;
    }

    const userId = user.uid;
    const activityRef = ref(database, `activities/${userId}`);

    onValue(activityRef, (snapshot) => {
      activityList.innerHTML = ""; // Clear the list before adding new items
      snapshot.forEach((childSnapshot) => {
        const activity = childSnapshot.val();
        const li = document.createElement("li");
        li.textContent = `${activity.text} (${new Date(activity.timestamp).toLocaleString()})`;
        activityList.appendChild(li);
      });
    });
  }

  // Call loadActivities on page load
  auth.onAuthStateChanged((user) => {
    if (user) {
      loadActivities();
    }
  });

  // Event listener for the "Check Weather" button
  checkWeatherButton.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to check the weather.");
      return;
    }

    const userId = user.uid;
    try {
      // Fetch user's location from the database
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const location = userData.city || "Nairobi"; // Default to Nairobi if city is not available
        fetchWeather(location);
      } else {
        console.error("User location not found in the database.");
        weatherDisplay.textContent = "User location not found.";
        weatherDisplay.classList.remove("hidden");
      }
    } catch (error) {
      console.error("Error fetching user location:", error);
      weatherDisplay.textContent = "Unable to fetch user location.";
      weatherDisplay.classList.remove("hidden");
    }
  });

  // Fetch weather data from the OpenWeather API
  async function fetchWeather(location) {
    const apiKey = "30136c7016c19d7c941ec78818890eaf"; // Replace with your actual API key
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;

    console.log("Fetching weather data from:", apiUrl); // Debug log

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to fetch weather data: ${errorData.message}`);
      }

      const weatherData = await response.json();
      console.log("Weather Data:", weatherData); // Log the weather data
      displayWeather(weatherData);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      weatherDisplay.textContent = `Unable to fetch weather data: ${error.message}`;
      weatherDisplay.classList.remove("hidden");
    }
  }

  // Display the fetched weather data
  function displayWeather(data) {
    const { main, weather, name } = data;

    // Update the weather display content
    weatherDisplay.innerHTML = `
      <h3>${name}</h3>
      <p>${weather[0].description}</p>
      <p>Temperature: ${main.temp}°C</p>
      <p>Humidity: ${main.humidity}%</p>
    `;

    // Ensure the weather display section is visible
    weatherDisplay.classList.remove("hidden");
  }
});