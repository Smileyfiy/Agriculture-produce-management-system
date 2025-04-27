export async function sendNotification(email, subject, message) {
  try {
    const response = await fetch("http://localhost:3000/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, subject, message }),
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.success);
      addToRecentNotifications(subject, message);
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    alert("Failed to send notification. Please try again.");
  }
}

//function to get user email from the database
export async function getUserEmail(userId) {
  try {
    const response = await fetch(`http://localhost:3000/get-user-email/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      const email = data.email || null;
      return email;
        }
      } catch (error) {
        console.error("Error fetching user email:", error);
      }
      return null;
    }
