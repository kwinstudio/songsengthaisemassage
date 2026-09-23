const FALLBACK = {
  treatments: [
    {
      id: 'relax',
      name: 'Ontspanningsmassage',
      type: 'Massage met olie',
      short: 'Rustige massage om spanning los te laten en bewust tijd voor uzelf te nemen.',
      description: 'Een massage gericht op ontspanning en een rustig gevoel. De behandeling wordt afgestemd op wat prettig voelt en kan over het hele lichaam worden uitgevoerd.',
      bestFor: 'Voor wie vooral wil ontspannen, tot rust wil komen of een zachtere massagevoorkeur heeft.',
      intensity: 'Zacht tot gemiddeld',
      oil: 'Met olie',
      prices: { solo: { 30: 45, 60: 70, 90: 100 }, duo: { 30: 85, 60: 130, 90: 190 } }
    },
    {
      id: 'traditional',
      name: 'Traditionele Thaise massage',
      type: 'Traditionele techniek',
      short: 'Een actievere Thaise massage met druk en beweging, zonder dat ontspanning uit het oog wordt verloren.',
      description: 'Traditionele Thaise massage werkt met drukpunten en bewegingen vanuit de Thaise massagetraditie. De intensiteit wordt afgestemd op uw voorkeur.',
      bestFor: 'Voor wie graag een actievere, stevigere behandeling ervaart of bewust voor traditionele Thaise technieken kiest.',
      intensity: 'Gemiddeld tot stevig',
      oil: 'Doorgaans zonder olie',
      prices: { solo: { 30: 45, 60: 70, 90: 100 }, duo: { 30: 85, 60: 130, 90: 190 } }
    }
  ],
  legal: {
    terms: {
      title: 'Algemene voorwaarden',
      body: 'Neem voor de actuele voorwaarden contact op met Songseng Thaise Massage.'
    },
    privacy: {
      title: 'Privacy & cookies',
      body: 'Deze website slaat de gegevens uit de afspraakaanvraag niet op in een eigen database. Bij verzenden wordt WhatsApp geopend met de door u ingevulde gegevens. Google Maps wordt pas geladen nadat u bewust op “Kaart laden” klikt.'
    },
    cancellation: {
      title: 'Annuleren & afspraken',
      body: 'Een gekozen datum en tijd via deze website is een afspraakaanvraag. De afspraak is pas definitief nadat Songseng deze via WhatsApp heeft bevestigd. Neem voor de actuele annuleringsvoorwaarden contact op met de salon.'
    },
    company: {
      title: 'Bedrijfsgegevens',
      body: 'Songseng Thaise Massage\nPilatusdam 9\n2712 BD Zoetermeer\nTelefoon / WhatsApp: 06 21 34 72 77\nE-mail: info@songsengthaisemassage.nl\nKvK: 73478342'
    }
  }
};

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

let treatments = FALLBACK.treatments;
let legal = FALLBACK.legal;
let priceMode = 'solo';
let quizIndex = 0;
let scores = { relax: 0, traditional: 0 };

async function loadData() {
  try {
    const [treatmentResponse, legalResponse] = await Promise.all([
      fetch('/data/treatments.json', { cache: 'no-store' }),
      fetch('/data/legal.json', { cache: 'no-store' })
    ]);

    if (treatmentResponse.ok) {
      const data = await treatmentResponse.json();
      const items = Array.isArray(data) ? data : data.items;
      if (Array.isArray(items) && items.length) {
        treatments = items.filter(item => item.active !== false);
      }
    }

    if (legalResponse.ok) {
      const data = await legalResponse.json();
      if (data && typeof data === 'object') legal = data;
    }
  } catch (error) {
    console.warn('CMS-data kon niet worden geladen; fallback wordt gebruikt.', error);
  }

  renderTreatments();
  populateBookingTreatments();
  renderPrices();
  renderQuiz();
  updateBookingPrice();
}

function renderTreatments() {
  const list = $('#treatment-list');
  if (!list) return;

  list.innerHTML = treatments.map((treatment, index) => {
    const fromPrice = treatment?.prices?.solo?.['30'] ?? treatment?.prices?.solo?.[30] ?? '';
    return `
      <article class="treatment-row">
        <div class="treatment-index">0${index + 1}</div>
        <div>
          <h3>${escapeHtml(treatment.name)}</h3>
          <p>${escapeHtml(treatment.type || '')}</p>
        </div>
        <div class="treatment-meta">
          ${treatment.intensity ? `<span class="chip">${escapeHtml(treatment.intensity)}</span>` : ''}
          ${treatment.oil ? `<span class="chip">${escapeHtml(treatment.oil)}</span>` : ''}
          ${fromPrice !== '' ? `<span class="chip">vanaf €${fromPrice}</span>` : ''}
        </div>
        <div class="treatment-actions">
          <button class="small-btn" type="button" data-treatment="${escapeAttr(treatment.id)}">Bekijk behandeling</button>
          <button class="small-btn book" type="button" data-book data-treatment-book="${escapeAttr(treatment.id)}">Afspraak</button>
        </div>
      </article>
    `;
  }).join('');
}

function showTreatment(id) {
  const treatment = treatments.find(item => item.id === id);
  if (!treatment) return;

  const prices = treatment.prices?.solo || {};
  const durations = [30, 60, 90];

  $('#treatment-modal-content').innerHTML = `
    <p class="eyebrow">${escapeHtml(treatment.type || 'Behandeling')}</p>
    <h2>${escapeHtml(treatment.name)}</h2>
    <p class="modal-intro">${escapeHtml(treatment.description || treatment.short || '')}</p>
    <div class="treatment-meta" style="margin:24px 0">
      ${treatment.bestFor ? `<span class="chip">${escapeHtml(treatment.bestFor)}</span>` : ''}
      ${treatment.intensity ? `<span class="chip">Intensiteit: ${escapeHtml(treatment.intensity)}</span>` : ''}
      ${treatment.oil ? `<span class="chip">${escapeHtml(treatment.oil)}</span>` : ''}
    </div>
    <div class="price-grid">
      ${durations.map(duration => `
        <div class="price-item">
          <span>${duration} minuten</span>
          <strong>€${prices[String(duration)] ?? prices[duration] ?? '-'}</strong>
        </div>
      `).join('')}
    </div>
    <button class="btn primary full" type="button" style="margin-top:22px" data-book data-treatment-book="${escapeAttr(treatment.id)}">Afspraak aanvragen</button>
  `;

  openModal('#treatment-modal');
}

const quiz = [
  {
    question: 'Waar heeft u vandaag vooral behoefte aan?',
    answers: [
      ['Ontspannen', 'relax', 3],
      ['Spieren losmaken', 'traditional', 2],
      ['Meer bewegen', 'traditional', 2],
      ['Nek, rug & schouders', 'traditional', 2]
    ]
  },
  {
    question: 'Waar wilt u vooral aandacht voor?',
    answers: [
      ['Hele lichaam', 'relax', 2],
      ['Nek, rug & schouders', 'traditional', 2],
      ['Benen / sportspieren', 'traditional', 2],
      ['Rust in hoofd & lichaam', 'relax', 3]
    ]
  },
  {
    question: 'Hoe stevig mag de massage zijn?',
    answers: [
      ['Zacht', 'relax', 3],
      ['Gemiddeld', 'relax', 1],
      ['Stevig', 'traditional', 3],
      ['Geen voorkeur', 'traditional', 1]
    ]
  },
  {
    question: 'Heeft u voorkeur voor olie?',
    answers: [
      ['Met olie', 'relax', 3],
      ['Zonder olie', 'traditional', 3],
      ['Maakt niet uit', 'relax', 1],
      ['Weet ik niet', 'traditional', 1]
    ]
  },
  {
    question: 'Wat past het beste bij vandaag?',
    answers: [
      ['Veel zitten', 'traditional', 2],
      ['Sport / fysieke belasting', 'traditional', 2],
      ['Stress / behoefte aan rust', 'relax', 3],
      ['Traditionele technieken ervaren', 'traditional', 3]
    ]
  }
];

function renderQuiz() {
  const card = $('#quiz-card');
  if (!card) return;

  if (quizIndex >= quiz.length) {
    const id = scores.relax >= scores.traditional ? 'relax' : 'traditional';
    const treatment = treatments.find(item => item.id === id) || treatments[0];

    $('#quiz-progress').style.width = '100%';
    $('#quiz-step-label').textContent = 'Resultaat';

    card.innerHTML = `
      <div class="quiz-result">
        <span class="result-tag">Beste match</span>
        <h3>${escapeHtml(treatment.name)}</h3>
        <p>${escapeHtml(treatment.bestFor || treatment.short || '')} Op basis van uw antwoorden sluit deze behandeling het beste aan.</p>
        <button class="btn primary" type="button" data-book data-treatment-book="${escapeAttr(treatment.id)}">Afspraak aanvragen</button>
        <button class="small-btn" type="button" data-treatment="${escapeAttr(treatment.id)}">Bekijk behandeling</button>
        <button class="small-btn" type="button" id="quiz-reset">Opnieuw beginnen</button>
      </div>
    `;

    $('#quiz-reset')?.addEventListener('click', () => {
      quizIndex = 0;
      scores = { relax: 0, traditional: 0 };
      renderQuiz();
    });
    return;
  }

  const item = quiz[quizIndex];
  $('#quiz-progress').style.width = `${(quizIndex + 1) * 20}%`;
  $('#quiz-step-label').textContent = `Vraag ${quizIndex + 1}`;

  card.innerHTML = `
    <h3>${escapeHtml(item.question)}</h3>
    <div class="quiz-options">
      ${item.answers.map((answer, index) => `
        <button class="quiz-option" type="button" data-quiz-choice="${index}">${escapeHtml(answer[0])}</button>
      `).join('')}
    </div>
  `;

  $$('[data-quiz-choice]', card).forEach(button => {
    button.addEventListener('click', () => {
      const answer = item.answers[Number(button.dataset.quizChoice)];
      scores[answer[1]] += answer[2];
      quizIndex += 1;
      renderQuiz();
    });
  });
}

function renderPrices() {
  const grid = $('#price-grid');
  const treatment = treatments[0];
  if (!grid || !treatment?.prices?.[priceMode]) return;

  grid.innerHTML = [30, 60, 90].map(duration => {
    const price = treatment.prices[priceMode][String(duration)] ?? treatment.prices[priceMode][duration];
    return `
      <div class="price-item">
        <span>${priceMode === 'duo' ? 'Duo · ' : ''}${duration} minuten</span>
        <strong>€${price}</strong>
      </div>
    `;
  }).join('');
}

function populateBookingTreatments() {
  const select = $('#book-treatment');
  if (!select) return;

  select.innerHTML = treatments.map(treatment =>
    `<option value="${escapeAttr(treatment.id)}">${escapeHtml(treatment.name)}</option>`
  ).join('');
}

function getBookingPrice() {
  const treatment = treatments.find(item => item.id === $('#book-treatment')?.value) || treatments[0];
  if (!treatment) return 0;

  const party = $('#book-party')?.value || 'solo';
  const duration = $('#book-duration')?.value || '60';
  const time = $('#book-time')?.value || '';

  let price = Number(treatment.prices?.[party]?.[duration] ?? 0);
  if (time && time >= '18:00') price += 5;
  return price;
}

function updateBookingPrice() {
  const target = $('#book-price');
  if (!target) return;

  const price = getBookingPrice();
  const afterHours = ($('#book-time')?.value || '') >= '18:00';
  target.textContent = `€${price}${afterHours ? ' incl. €5 na 18:00' : ''}`;
}

function openBooking(preselectedTreatment = '') {
  if (preselectedTreatment && $('#book-treatment')) {
    $('#book-treatment').value = preselectedTreatment;
  }
  updateBookingPrice();
  openModal('#booking-modal');
}

function openModal(selector) {
  const modal = $(selector);
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

document.addEventListener('click', event => {
  const treatmentButton = event.target.closest('[data-treatment]');
  if (treatmentButton) {
    showTreatment(treatmentButton.dataset.treatment);
    return;
  }

  const bookingButton = event.target.closest('[data-book]');
  if (bookingButton) {
    const treatmentId = bookingButton.dataset.treatmentBook || '';
    openBooking(treatmentId);
  }
});

$$('[data-close]').forEach(element => {
  element.addEventListener('click', () => closeModal(element.closest('.modal')));
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') $$('.modal.open').forEach(closeModal);
});

$$('[data-price-mode]').forEach(button => {
  button.addEventListener('click', () => {
    priceMode = button.dataset.priceMode;
    $$('[data-price-mode]').forEach(item => item.classList.toggle('active', item === button));
    renderPrices();
  });
});

['#book-treatment', '#book-party', '#book-duration', '#book-time'].forEach(selector => {
  $(selector)?.addEventListener('change', updateBookingPrice);
  $(selector)?.addEventListener('input', updateBookingPrice);
});

const dateInput = $('#book-date');
if (dateInput) {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  dateInput.min = localDate;
}

$('#booking-form')?.addEventListener('submit', event => {
  event.preventDefault();

  const treatment = treatments.find(item => item.id === $('#book-treatment').value) || treatments[0];
  const party = $('#book-party').value === 'duo' ? 'Duo' : '1 persoon';
  const price = getBookingPrice();
  const note = $('#book-note').value.trim() || '-';

  const message = [
    'Hallo Songseng Thaise Massage, ik wil graag een afspraak aanvragen.',
    '',
    `Behandeling: ${treatment.name}`,
    `Voor wie: ${party}`,
    `Duur: ${$('#book-duration').value} minuten`,
    `Prijsindicatie: €${price}`,
    `Datum: ${$('#book-date').value}`,
    `Tijd: ${$('#book-time').value}`,
    `Naam: ${$('#book-name').value}`,
    `Opmerking: ${note}`,
    '',
    'Is dit tijdstip nog beschikbaar? Ik hoor graag of jullie de afspraak kunnen bevestigen.'
  ].join('\n');

  window.open(`https://wa.me/31621347277?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
});

$('#load-map')?.addEventListener('click', () => {
  $('#map-shell').innerHTML = `
    <iframe
      title="Google Maps locatie Songseng Thaise Massage"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      src="https://www.google.com/maps?q=${encodeURIComponent('Pilatusdam 9, 2712 BD Zoetermeer')}&output=embed">
    </iframe>
  `;
});

$$('[data-legal]').forEach(button => {
  button.addEventListener('click', () => {
    const item = legal[button.dataset.legal];
    if (!item) return;
    $('#legal-content').innerHTML = `
      <p class="eyebrow">Informatie</p>
      <h2>${escapeHtml(item.title)}</h2>
      <p class="legal-text">${escapeHtml(item.body)}</p>
    `;
    openModal('#legal-modal');
  });
});

const menuButton = $('.menu-toggle');
const mobileMenu = $('.mobile-menu');

menuButton?.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  mobileMenu.setAttribute('aria-hidden', String(!open));
});

$$('.mobile-menu a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
  });
});

window.addEventListener('scroll', () => {
  $('.sticky-book')?.classList.toggle('visible', window.scrollY > 520);
}, { passive: true });

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value = '') {
  return escapeHtml(value);
}

loadData();

/* Modern interaction layer */
const header = $('.site-header');
const hero = $('.hero-modern');

function syncHeaderState() {
  header?.classList.toggle('scrolled', window.scrollY > 36);
}
syncHeaderState();
window.addEventListener('scroll', syncHeaderState, { passive: true });

requestAnimationFrame(() => {
  hero?.classList.add('is-ready');
});

const revealTargets = [
  ...$$('.section-heading'),
  ...$$('.treatment-row'),
  ...$$('.quiz-intro'),
  ...$$('.quiz-card'),
  ...$$('.price-switch'),
  ...$$('.price-item'),
  ...$$('.about-copy'),
  ...$$('.about-photo'),
  ...$$('.review-score'),
  ...$$('.review-copy'),
  ...$$('.contact-copy'),
  ...$$('.map-shell')
];

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  revealTargets.forEach((element, index) => {
    element.classList.add('reveal');
    if (index % 4 === 1) element.classList.add('reveal-delay-1');
    if (index % 4 === 2) element.classList.add('reveal-delay-2');
  });

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -40px' });

  revealTargets.forEach(element => revealObserver.observe(element));
} else {
  revealTargets.forEach(element => element.classList.add('is-visible'));
}

if (hero && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.addEventListener('scroll', () => {
    if (window.innerWidth > 920 && window.scrollY < window.innerHeight) {
      const media = hero.querySelector('.hero-media img');
      if (media) media.style.transform = `scale(1) translateY(${Math.min(window.scrollY * 0.035, 16)}px)`;
    }
  }, { passive: true });
}
