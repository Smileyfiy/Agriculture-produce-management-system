import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from './firebaseconnection.js';
import { weatherApiKey} from './apikeys.js';

const auth = getAuth(app);
const database = getDatabase(app);

const weatherDiv = document.getElementById('weather');
const noteForm = document.getElementById('note-form');
const noteInput = document.getElementById('note-input');
const notesList = document.getElementById('notes-list');
const viewAllBtn = document.getElementById('view-all-btn');
const toast = document.getElementById('toast');

let notes = [];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hidden');
  }, 3000);
}

// Weather Loading
function loadWeather(city = "Nairobi") {
  weatherDiv.textContent = "Loading Weather...";
  const apiKey = weatherApiKey;
  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`)
    .then(res => res.json())
    .then(data => {
      if (data.cod === 200) {
        weatherDiv.innerHTML = `
          ${data.name}: ${data.main.temp}°C, Humidity: ${data.main.humidity}%
        `;
      } else {
        weatherDiv.textContent = "City not found.";
      }
    })
    .catch(error => {
      console.error(error);
      weatherDiv.textContent = "Failed to load weather.";
    });
}

function renderNotes() {
  notesList.innerHTML = "";
  let displayedNotes = notes.slice(0, 5);

  displayedNotes.forEach(({ id, content }) => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${content}
      <button class="delete-note-btn" onclick="deleteNote('${id}')">🗑️</button>
    `;
    notesList.appendChild(li);
  });

  viewAllBtn.classList.toggle('hidden', notes.length <= 5);
}

window.deleteNote = async function(noteId) {
  const user = auth.currentUser;
  if (!user) return;

  await remove(ref(database, `activities/${user.uid}/${noteId}`));
  showToast("🗑️ Note deleted!");
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "Login.html";
    return;
  }

  // Load Weather
  loadWeather();

  // Load Notes
  onValue(ref(database, `activities/${user.uid}`), (snapshot) => {
    notes = [];
    snapshot.forEach(childSnapshot => {
      notes.push({
        id: childSnapshot.key,
        content: childSnapshot.val().note
      });
    });

    notes.reverse(); // Show most recent first
    renderNotes();
  });

  // Add Note
  noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newNote = noteInput.value.trim();
    if (newNote === "") return;

    await push(ref(database, `activities/${user.uid}`), { note: newNote });
    noteInput.value = "";
    showToast("✅ Activity added!");
  });

  // View All Button
  viewAllBtn.addEventListener('click', () => {
    notesList.innerHTML = "";
    notes.forEach(({ id, content }) => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${content}
        <button class="delete-note-btn" onclick="deleteNote('${id}')">🗑️</button>
      `;
      notesList.appendChild(li);
    });
    viewAllBtn.classList.add('hidden');
  });
});
