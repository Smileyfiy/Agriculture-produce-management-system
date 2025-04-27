
// Expand FAQ Answers
const faqQuestions = document.querySelectorAll('.faq-question');

faqQuestions.forEach(question => {
  question.addEventListener('click', () => {
    const answer = question.nextElementSibling;
    answer.style.display = (answer.style.display === 'block') ? 'none' : 'block';
  });
});

// Fake Contact Form Submission
const supportForm = document.getElementById('support-form');
const formStatus = document.getElementById('form-status');

supportForm.addEventListener('submit', (e) => {
  e.preventDefault();
  formStatus.textContent = "✅ Message sent successfully!";
  supportForm.reset();
});

// Download User Guide
document.getElementById('download-guide').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('APMS User Guide', 10, 20);
  doc.setFontSize(12);
  doc.text('Welcome to APMS! Use the Reports page to track farm sales and produce.', 10, 40);
  doc.text('You can also schedule sales and view notifications.', 10, 50);
  doc.text('For more help, contact support via the Help page.', 10, 60);
  
  doc.save('APMS_User_Guide.pdf');
});
