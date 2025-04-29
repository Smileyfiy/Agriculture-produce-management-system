import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, onValue, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { app } from "./firebaseconnection.js";

const auth = getAuth(app);
const database = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
  const notificationsList = document.getElementById("recent-notifications");

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      console.log("User not authenticated, redirecting...");
      window.location.replace("Login.html");
      return;
    }

    console.log("Authenticated:", user.uid);

    // Load notifications in real-time
    loadNotifications(user.uid);
  });

  async function loadNotifications(userId) {
    const notificationsRef = ref(database, `notifications/${userId}`);
    notificationsList.innerHTML = "<p>Loading notifications...</p>";

    //  Listen in real-time
    onValue(notificationsRef, (snapshot) => {
      notificationsList.innerHTML = ""; // Clear spinner

      if (!snapshot.exists()) {
        notificationsList.innerHTML = "<li>No recent notifications</li>";
        return;
      }

      const notificationsArray = [];
      snapshot.forEach((childSnapshot) => {
        notificationsArray.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      // Sort notifications by timestamp (soonest first)
      notificationsArray.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      notificationsArray.forEach((notif) => {
        const li = document.createElement("li");
        li.className = "notification";

        li.innerHTML = `
          <h2>${notif.subject}</h2>
          <p>${notif.message}</p>
          <p><strong>Scheduled for:</strong> ${new Date(notif.timestamp).toLocaleDateString()}</p>
          <button class="btn-secondary" data-notif-id="${notif.id}">✅ Mark as Read</button>
        `;

        notificationsList.appendChild(li);
      });

      // Add "Mark as Done" buttons
      document.querySelectorAll(".btn-secondary").forEach(button => {
        button.addEventListener("click", async (e) => {
          const notifId = e.target.getAttribute("data-notif-id");
          const confirmDelete = confirm("Mark this notification as done?");
          if (confirmDelete) {
            try {
              await remove(ref(database, `notifications/${auth.currentUser.uid}/${notifId}`));
              alert("Notification marked as done!");
            } catch (error) {
              console.error("Error deleting notification:", error.message);
              alert(`Failed to delete: ${error.message}`);
            }
          }
        });
      });

    }, (error) => {
      console.error("Real-time notifications listener error:", error.message);
      notificationsList.innerHTML = `<li style="color: red;">Failed to load notifications: ${error.message}</li>`;
    });
  }
});
