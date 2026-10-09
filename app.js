const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !motion.matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}
document.querySelectorAll('.button').forEach(button => {
  button.addEventListener('pointerdown', () => button.classList.add('is-pressed'));
  for (const event of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) button.addEventListener(event, () => button.classList.remove('is-pressed'));
});

const form = document.querySelector('#contact-form');
if (form) {
  const fields = document.querySelector('#form-fields');
  const confirmation = document.querySelector('#confirmation');
  const confirm = document.querySelector('#confirm-button');
  const reset = () => {
    form.reset();
    for (const id of ['name', 'email', 'topic', 'message']) document.querySelector(`#preview-${id}`).textContent = '';
    fields.hidden = false;
    confirmation.hidden = true;
  };
  const preview = () => {
    if (!form.reportValidity()) return;
    for (const id of ['name', 'email', 'topic', 'message']) {
      document.querySelector(`#preview-${id}`).textContent = document.querySelector(`#contact-${id}`).value;
    }
    fields.hidden = true;
    confirmation.hidden = false;
    document.querySelector('#confirmation-title').focus();
  };
  form.addEventListener('submit', event => { event.preventDefault(); preview(); });
  confirm.disabled = false;
  confirm.addEventListener('click', preview);
  document.querySelector('#edit-button').addEventListener('click', () => {
    fields.hidden = false;
    confirmation.hidden = true;
    document.querySelector('#contact-name').focus();
  });
  // Clear transient inputs and previews, including back/forward cache restoration.
  window.addEventListener('pagehide', reset);
  window.addEventListener('pageshow', reset);
}
