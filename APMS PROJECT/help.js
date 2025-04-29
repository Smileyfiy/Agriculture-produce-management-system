
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


