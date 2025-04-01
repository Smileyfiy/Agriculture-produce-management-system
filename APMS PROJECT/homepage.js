import { database } from "./firebaseconnection.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// Get references to DOM elements
const activityForm = document.getElementById("add-activity-form");
const activityInput = document.getElementById("activity-input");
const activityList = document.getElementById("activity-list");
const weatherButton = document.getElementById("check-weather-button");
const weatherDisplay = document.getElementById("weather-display");
const currentWeatherDiv = document.getElementById("current-weather");

// OpenWeather API Key and Endpoint
const API_KEY = "30136c7016c19d7c941ec78818890eaf"; // Replace with your OpenWeather API key
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// Simulated user data (replace this with actual user data from your database)
const userLocation = {
    city: "Nairobi", // Replace with the user's registered city
    lat: -1.286389, // Replace with the user's registered latitude
    lon: 36.817223 // Replace with the user's registered longitude
};

// Handle form submission
activityForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent form from refreshing the page

    const activityValue = activityInput.value.trim();

    if (!activityValue) {
        alert("Please enter a valid note.");
        return;
    }

    // Push the note to Firebase
    const activityRef = ref(database, "activities");
    push(activityRef, {
        note: activityValue,
        timestamp: new Date().toISOString(),
    })
        .then(() => {
            alert("Note added successfully!");
            addNoteToList(activityValue); // Add the note to the UI
            activityInput.value = ""; // Clear the input field
        })
        .catch((error) => {
            console.error("Error adding note:", error);
            alert("Failed to add note. Please try again.");
        });
});

// Function to add a note to the UI
function addNoteToList(note) {
    const li = document.createElement("li");
    li.textContent = note;
    activityList.appendChild(li);
}

// Function to fetch current weather data
async function fetchWeatherData(lat, lon, city = null) {
    try {
        // Fetch current weather
        const currentWeatherResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        const currentWeatherData = await currentWeatherResponse.json();

        // Display current weather data
        displayCurrentWeather(currentWeatherData, city);
    } catch (error) {
        console.error("Error fetching weather data:", error);
        alert("Failed to fetch weather data. Please try again.");
    }
}

// Function to display current weather
function displayCurrentWeather(data, city) {
    if (!data || !data.main || !data.weather) {
        console.error("Invalid current weather data:", data);
        alert("Failed to fetch current weather data.");
        return;
    }

    currentWeatherDiv.innerHTML = `
        <h3>${city || data.name || "Unknown Location"}</h3>
        <p>Temperature: ${data.main.temp || "N/A"}°C</p>
        <p>Weather: ${data.weather[0]?.description || "N/A"}</p>
        <p>Humidity: ${data.main.humidity || "N/A"}%</p>
        <p>Wind Speed: ${data.wind.speed || "N/A"} m/s</p>
    `;
}

// Event listener for the "Check Weather" button
weatherButton.addEventListener("click", () => {
    if (userLocation && userLocation.lat && userLocation.lon) {
        // Use the user's registered location
        console.log("Using user's registered location:", userLocation.city);
        fetchWeatherData(userLocation.lat, userLocation.lon, userLocation.city);
        weatherDisplay.classList.remove("hidden"); // Show the weather display section
    } else if (navigator.geolocation) {
        // Default to the current location if no registered location is available
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log("Using current location:", latitude, longitude);
                fetchWeatherData(latitude, longitude);
                weatherDisplay.classList.remove("hidden"); // Show the weather display section
            },
            (error) => {
                console.error("Error getting location:", error);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        alert("Location access denied by the user.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        alert("The request to get user location timed out.");
                        break;
                    default:
                        alert("An unknown error occurred while fetching location.");
                }
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
});