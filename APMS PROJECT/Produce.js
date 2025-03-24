document.addEventListener('DOMContentLoaded', function() {
  const produceEntryForm = document.getElementById('produce-entry-form');

  produceEntryForm.addEventListener('submit', function(event) {
    event.preventDefault();
    // Handle form submission logic here
    alert('Produce added successfully!');
    // Optionally, update the page content dynamically
  });
});