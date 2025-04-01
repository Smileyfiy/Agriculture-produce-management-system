import { database } from "./firebaseconnection.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// Get references to DOM elements
const activityForm = document.getElementById("add-activity-form");
const activityInput = document.getElementById("activity-input");
const activityList = document.getElementById("activity-list");
const weatherButton = document.getElementById("check-weather-button");
const weatherDisplay = document.getElementById("weather-display");
const currentWeatherDiv = document.getElementById("current-weather");
const forecastWeatherDiv = document.getElementById("forecast-weather");

// OpenWeather API Key and Endpoint
const API_KEY = "30136c7016c19d7c941ec78818890eafy"; // Replace with your OpenWeather API key
const BASE_URL = "https://api.openweathermap.org/data/2.5";

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

// Function to fetch weather data
async function fetchWeatherData(lat, lon) {
  try {
    // Fetch current weather
    const currentWeatherResponse = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );
    const currentWeatherData = await currentWeatherResponse.json();

    // Fetch 7-day forecast
    const forecastResponse = await fetch(
      `${BASE_URL}/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&units=metric&appid=${API_KEY}`
    );
    const forecastData = await forecastResponse.json();

    // Display weather data
    displayCurrentWeather(currentWeatherData);
    displayForecastWeather(forecastData.daily);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    alert("Failed to fetch weather data. Please try again.");
  }
}

// Function to display current weather
function displayCurrentWeather(data) {
  if (!data || !data.main || !data.weather) {
    console.error("Invalid current weather data:", data);
    alert("Failed to fetch current weather data.");
    return;
  }

  currentWeatherDiv.innerHTML = `
    <h3>${data.name || "Unknown Location"}</h3>
    <p>Temperature: ${data.main.temp || "N/A"}°C</p>
    <p>Weather: ${data.weather[0]?.description || "N/A"}</p>
    <p>Humidity: ${data.main.humidity || "N/A"}%</p>
    <p>Wind Speed: ${data.wind.speed || "N/A"} m/s</p>
  `;
}

// Function to display 7-day forecast
function displayForecastWeather(daily) {
  if (!daily || !Array.isArray(daily)) {
    console.error("Invalid forecast data:", daily);
    alert("Failed to fetch weather forecast.");
    return;
  }

  forecastWeatherDiv.innerHTML = ""; // Clear previous forecast
  daily.slice(0, 7).forEach((day) => {
    const date = new Date(day.dt * 1000).toLocaleDateString();
    const forecastCard = document.createElement("div");
    forecastCard.classList.add("forecast-card");
    forecastCard.innerHTML = `
      <h4>${date}</h4>
      <p>Temp: ${day.temp?.day || "N/A"}°C</p>
      <p>${day.weather[0]?.description || "N/A"}</p>
    `;
    forecastWeatherDiv.appendChild(forecastCard);
  });
}

// Event listener for the "Check Weather" button
weatherButton.addEventListener("click", () => {
  // Get user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log("Latitude:", latitude, "Longitude:", longitude); // Debugging log
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