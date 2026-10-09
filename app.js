const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const reveals = [...document.querySelectorAll('.reveal')];
let revealObserver;
const showReveal = element => {
  element.classList.add('is-revealed');
  element.classList.remove('is-pending');
  revealObserver?.unobserve(element);
};
if ('IntersectionObserver' in window && !motion.matches) {
  revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      showReveal(entry.target);
    }
  }, { threshold: 0, rootMargin: '0px 0px 80px 0px' });
  for (const element of reveals) {
    // Never hide content that the visitor can already see, including restored scroll positions.
    if (element.getBoundingClientRect().top < window.innerHeight) {
      showReveal(element);
    } else {
      element.classList.add('is-pending');
      revealObserver.observe(element);
    }
  }
}
motion.addEventListener('change', event => {
  if (event.matches) {
    reveals.forEach(showReveal);
    revealObserver?.disconnect();
  }
});
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
