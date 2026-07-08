// ═══════════════════════════════════════
// CLONE & SECURITY PROTECTION
// ═══════════════════════════════════════
(function () {
  var allowed = ['cleanse.ng', 'vercel.app', 'localhost', '127.0.0.1', '::1'];
  var isLocal = window.location.protocol === 'file:';
  var host = window.location.hostname;
  var isAllowed = allowed.some(function (d) { return host === d || host.endsWith('.' + d); });
  if (isLocal || (host && !isAllowed)) {
    document.documentElement.style.display = 'none';
    window.location.href = 'https://cleanse.ng';
    return;
  }
})();

// Disable Context Menu (Right Click)
document.addEventListener('contextmenu', function (e) {
  e.preventDefault();
});

// Disable common save / view-source keyboard shortcuts
document.addEventListener('keydown', function (e) {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
    (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's'))
  ) {
    e.preventDefault();
  }
});

// ═══════════════════════════════════════
// SECURITY MODULE
// ═══════════════════════════════════════
const _sc = {
  // WhatsApp number — encoded and split for obfuscation
  // To change your number: update these base64 segments
  // Current: 234 + 913066 + 3739 = 2349130663739
  _p: ['MjM0', 'OTEzMDY2', 'MzczOQ=='],
  maxSubmissions: 3,      // Max form submissions per window
  windowMs: 300000,       // Rate limit window (5 minutes)
  minFormTimeMs: 3000,    // Minimum time to fill form (3 seconds)
};

function _getWaNum() {
  return _sc._p.map(function (p) { return atob(p); }).join('');
}

function _getWaUrl(message) {
  return 'https://wa.me/' + _getWaNum() + (message ? '?text=' + encodeURIComponent(message) : '');
}

function _sanitize(str, maxLen) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/[<>"'`]/g, '').trim().substring(0, maxLen || 500);
}

function _validatePhone(phone) {
  var digits = phone.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function _validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function _checkRateLimit() {
  try {
    var now = Date.now();
    var submissions = JSON.parse(sessionStorage.getItem('_cl_subs') || '[]');
    submissions = submissions.filter(function (t) { return now - t < _sc.windowMs; });
    if (submissions.length >= _sc.maxSubmissions) return false;
    submissions.push(now);
    sessionStorage.setItem('_cl_subs', JSON.stringify(submissions));
    return true;
  } catch (e) { return true; }
}

var _modalOpenTime = 0;

// Initialize all obfuscated WhatsApp links at runtime
document.querySelectorAll('[data-wa-link]').forEach(function (el) {
  el.href = _getWaUrl();
  // Open contact/whatsapp links in a new tab (excluding modal buttons)
  if (!el.classList.contains('pc-btn') && !el.classList.contains('nav-cta') && !el.classList.contains('btn-primary')) {
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  }
});

// Testimonial slider
let testimonialInterval;
let activeSlides = [];
let activeDots = [];
let currentTestimonial = 0;

function showSlide(n) {
  if (activeSlides.length === 0 || activeDots.length === 0) return;
  activeSlides[currentTestimonial].classList.remove('active');
  activeDots[currentTestimonial].classList.remove('active');
  currentTestimonial = (n + activeSlides.length) % activeSlides.length;
  activeSlides[currentTestimonial].classList.add('active');
  activeDots[currentTestimonial].classList.add('active');
}

function initTestimonialSlider() {
  activeSlides = Array.from(document.querySelectorAll('.testimonial-slide'));
  activeDots = Array.from(document.querySelectorAll('.t-dot'));
  currentTestimonial = 0;

  if (testimonialInterval) {
    clearInterval(testimonialInterval);
  }

  const nextBtn = document.getElementById('next-btn');
  const prevBtn = document.getElementById('prev-btn');

  if (nextBtn) {
    const newNext = nextBtn.cloneNode(true);
    nextBtn.replaceWith(newNext);
    newNext.addEventListener('click', () => showSlide(currentTestimonial + 1));
  }
  if (prevBtn) {
    const newPrev = prevBtn.cloneNode(true);
    prevBtn.replaceWith(newPrev);
    newPrev.addEventListener('click', () => showSlide(currentTestimonial - 1));
  }

  activeDots.forEach(dot => {
    const newDot = dot.cloneNode(true);
    dot.replaceWith(newDot);
    newDot.addEventListener('click', () => showSlide(+newDot.dataset.index));
  });

  // Re-query dots to have references to the new elements
  activeDots = Array.from(document.querySelectorAll('.t-dot'));

  if (activeSlides.length > 0) {
    testimonialInterval = setInterval(() => showSlide(currentTestimonial + 1), 6000);
  }
}

// FAQ accordion
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    // Close all other items and set their aria-expanded to false
    document.querySelectorAll('.faq-item.open').forEach(i => {
      i.classList.remove('open');
      const qBtn = i.querySelector('.faq-q');
      if (qBtn) qBtn.setAttribute('aria-expanded', 'false');
    });

    // Toggle current item
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    } else {
      item.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
});

// Dynamic Pricing Toggle Script
const pricingCheckbox = document.getElementById('pricing-toggle-checkbox');
const labelPayPerVisit = document.getElementById('label-pay-per-visit');
const labelMonthly = document.getElementById('label-monthly');

let isPromoApplied = localStorage.getItem('cleanse_promo_applied') === 'true';

const pricingData = {
  oneTime: [
    { primary: '₦10,000', unit: ' / visit', secondary: '', rawPrice: 10000, monthlyPrice: 50000 },
    { primary: '₦15,000', unit: ' / visit', secondary: '', rawPrice: 15000, monthlyPrice: 80000 },
    { primary: '₦20,000', unit: ' / visit', secondary: '', rawPrice: 20000, monthlyPrice: 100000 },
    { primary: '₦25,000', unit: ' / visit', secondary: '', rawPrice: 25000, monthlyPrice: 150000 }
  ],
  monthly: [
    { primary: '₦50,000', unit: ' / month', secondary: '' },
    { primary: '₦80,000', unit: ' / month', secondary: '' },
    { primary: '₦100,000', unit: ' / month', secondary: '' },
    { primary: '₦150,000', unit: ' / month', secondary: '' }
  ]
};

const promoPricingData = {
  oneTime: [
    { primary: '₦10,000', unit: ' / visit', secondary: '', rawPrice: 10000, monthlyPrice: 35000 },
    { primary: '₦15,000', unit: ' / visit', secondary: '', rawPrice: 15000, monthlyPrice: 50000 },
    { primary: '₦20,000', unit: ' / visit', secondary: '', rawPrice: 20000, monthlyPrice: 70000 },
    { primary: '₦25,000', unit: ' / visit', secondary: '', rawPrice: 25000, monthlyPrice: 100000 }
  ],
  monthly: [
    { primary: '₦35,000', unit: ' / month', secondary: '' },
    { primary: '₦50,000', unit: ' / month', secondary: '' },
    { primary: '₦70,000', unit: ' / month', secondary: '' },
    { primary: '₦100,000', unit: ' / month', secondary: '' }
  ]
};

const primaryPriceElements = document.querySelectorAll('.pc-price-primary .price-val');
const primaryUnitElements = document.querySelectorAll('.pc-price-primary .price-unit');
const secondaryPriceElements = document.querySelectorAll('.pc-price-secondary');
const savingsElements = document.querySelectorAll('.pc-savings');

function updatePricing(isMonthly) {
  const currentPricing = pricingData;
  const data = isMonthly ? currentPricing.monthly : currentPricing.oneTime;

  primaryPriceElements.forEach((el, index) => {
    el.textContent = data[index].primary;
  });

  primaryUnitElements.forEach((el, index) => {
    el.textContent = data[index].unit;
  });

  secondaryPriceElements.forEach((el, index) => {
    el.textContent = data[index].secondary;
    if (data[index].secondary) {
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  });

  savingsElements.forEach((el, index) => {
    const item = currentPricing.oneTime[index];
    const oneTimeTotal = item.rawPrice * 8;
    const monthlyTotal = item.monthlyPrice;
    const difference = oneTimeTotal - monthlyTotal;

    if (isMonthly) {
      if (difference > 0) {
        el.textContent = `Save ₦${difference.toLocaleString()}/mo`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      } else if (difference < 0) {
        const savings = Math.abs(difference);
        el.textContent = `Save ₦${savings.toLocaleString()}/mo`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      } else {
        el.style.opacity = '0';
        el.style.transform = 'translateY(5px)';
      }
    } else {
      el.style.opacity = '0';
      el.style.transform = 'translateY(5px)';
    }
  });

  if (isMonthly) {
    labelMonthly.classList.add('active');
    labelPayPerVisit.classList.remove('active');
  } else {
    labelPayPerVisit.classList.add('active');
    labelMonthly.classList.remove('active');
  }
  if (pricingCheckbox) pricingCheckbox.setAttribute('aria-checked', isMonthly ? 'true' : 'false');
}

if (pricingCheckbox) {
  pricingCheckbox.addEventListener('change', () => {
    updatePricing(pricingCheckbox.checked);
  });
}

if (labelPayPerVisit) {
  // Clicking labels toggles checkbox
  labelPayPerVisit.addEventListener('click', () => {
    if (pricingCheckbox && pricingCheckbox.checked) {
      pricingCheckbox.checked = false;
      updatePricing(false);
    }
  });
}

if (labelMonthly) {
  labelMonthly.addEventListener('click', () => {
    if (pricingCheckbox && !pricingCheckbox.checked) {
      pricingCheckbox.checked = true;
      updatePricing(true);
    }
  });
}

// Booking Modal Logic
const modal = document.getElementById('booking-modal');
const closeBtn = document.getElementById('modal-close-btn');
const successCloseBtn = document.getElementById('success-close-btn');
const formContainer = document.getElementById('booking-form-container');
const successContainer = document.getElementById('booking-success-container');
const bookingForm = document.getElementById('booking-plan-form');
const planInput = document.getElementById('booking-selected-plan');
const apartmentSizeInput = document.getElementById('booking-apartment-size');
const visitsSelect = document.getElementById('booking-visits');
const planRow = document.getElementById('plan-row');
const propertyRow = document.getElementById('property-row');
const planSummary = document.getElementById('booking-plan-summary');
const planSummaryText = document.getElementById('booking-plan-summary-text');
const frequencySection = document.getElementById('frequency-section');
const frequencyCardsContainer = document.getElementById('frequency-cards-container');

// Calendar and dynamic schedule options
const bookingDateInput = document.getElementById('booking-date');
const bookingScheduleSelect = document.getElementById('booking-schedule');

if (bookingDateInput) {
  // Set the minimum selectable date to tomorrow (1-day lead time)
  const localTomorrow = new Date();
  localTomorrow.setDate(localTomorrow.getDate() + 1);
  const yyyyTomorrow = localTomorrow.getFullYear();
  const mmTomorrow = String(localTomorrow.getMonth() + 1).padStart(2, '0');
  const ddTomorrow = String(localTomorrow.getDate()).padStart(2, '0');
  const tomorrowStr = `${yyyyTomorrow}-${mmTomorrow}-${ddTomorrow}`;
  bookingDateInput.min = tomorrowStr;

  // Trigger calendar open when clicking anywhere on the input container
  bookingDateInput.addEventListener('click', () => {
    try {
      bookingDateInput.showPicker();
    } catch (err) {
      console.log("showPicker failed: ", err);
    }
  });
}

const scheduleOptions = {
  weekday: [
    { value: "8am - 11am", text: "8am - 11am" },
    { value: "11am - 2pm", text: "11am - 2pm" },
    { value: "2pm - 5pm", text: "2pm - 5pm" }
  ],
  sunday: [
    { value: "2pm - 5pm", text: "2pm - 5pm" }
  ]
};

const bookingSchedulePillsContainer = document.getElementById('booking-schedule-pills');
const wizardStepSize = document.getElementById('wizard-step-size');
const wizardStepPlan = document.getElementById('wizard-step-plan');
const wizardStepSchedule = document.getElementById('wizard-step-schedule');
const wizardStepContact = document.getElementById('wizard-step-contact');
const wizardStepVerifyLeft = document.getElementById('wizard-step-verify-left');
const wizardBackBtn = document.getElementById('wizard-back-btn');
const wizardNextBtn = document.getElementById('wizard-next-btn');
const bookingSubmitBtn = document.getElementById('booking-submit-btn');

const pStep1 = document.getElementById('p-step-1');
const pStep2 = document.getElementById('p-step-2');
const pStep3 = document.getElementById('p-step-3');
const pDiv1 = document.getElementById('p-div-1');
const pDiv2 = document.getElementById('p-div-2');

let _isPlanPreSelected = false;
let _currentWizardStep = 1;

function updateSchedulePills(dayOfWeek) {
  if (!bookingSchedulePillsContainer) return;
  bookingSchedulePillsContainer.innerHTML = '';
  const currentVal = bookingScheduleSelect.value;
  const options = dayOfWeek === 0 ? scheduleOptions.sunday : scheduleOptions.weekday;
  const selectedDate = bookingDateInput.value;
  const booked = bookedSlots[selectedDate] || [];

  // Clear current value if not matching the new list or if it is booked
  const isValid = options.some(opt => opt.value === currentVal && !booked.includes(opt.value));
  if (!isValid) {
    bookingScheduleSelect.value = '';
  }

  options.forEach(opt => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'schedule-pill';

    const isBooked = booked.includes(opt.value);
    if (isBooked) {
      pill.classList.add('disabled');
      pill.disabled = true;
    } else {
      if (opt.value === bookingScheduleSelect.value) {
        pill.classList.add('active');
      }
      pill.addEventListener('click', () => {
        bookingSchedulePillsContainer.querySelectorAll('.schedule-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        bookingScheduleSelect.value = opt.value;
        const step2ValMsg = document.getElementById('step2-validation-msg');
        if (step2ValMsg) step2ValMsg.textContent = '';
        updateBookingSummary();
      });
    }
    pill.textContent = opt.text;
    bookingSchedulePillsContainer.appendChild(pill);
  });
}

function updateFrequencyCards() {
  if (!frequencyCardsContainer) return;
  frequencyCardsContainer.innerHTML = '';

  const selectedPlan = planInput.value;
  if (!selectedPlan || selectedPlan.includes('Custom Plan')) {
    if (frequencySection) frequencySection.style.display = 'none';
    visitsSelect.required = false;
    return;
  }

  if (frequencySection) frequencySection.style.display = 'block';
  visitsSelect.required = true;

  // Determine base rate based on selected plan
  let baseRate = isPromoApplied ? 7000 : 10000;
  if (selectedPlan.includes('2 Bedroom')) baseRate = isPromoApplied ? 10000 : 15000;
  else if (selectedPlan.includes('3 Bedroom')) baseRate = isPromoApplied ? 15000 : 20000;
  else if (selectedPlan.includes('4 Bedroom')) baseRate = isPromoApplied ? 20000 : 25000;

  // Determine Monthly Subscription rate
  let subscriptionRate = isPromoApplied ? 35000 : 50000;
  if (selectedPlan.includes('2 Bedroom')) subscriptionRate = isPromoApplied ? 50000 : 80000;
  else if (selectedPlan.includes('3 Bedroom')) subscriptionRate = isPromoApplied ? 70000 : 100000;
  else if (selectedPlan.includes('4 Bedroom')) subscriptionRate = isPromoApplied ? 100000 : 150000;

  // Parse room size name
  let bedrooms = "1 Bedroom";
  if (selectedPlan.includes("2 Bedroom")) bedrooms = "2 Bedroom";
  else if (selectedPlan.includes("3 Bedroom")) bedrooms = "3 Bedroom";
  else if (selectedPlan.includes("4 Bedroom")) bedrooms = "4 Bedroom";

  const frequencies = [
    {
      value: '8 visits per month',
      title: 'Monthly Subscription',
      subtitle: '8 visits / month',
      totalCost: subscriptionRate,
      isSubscription: true
    },
    {
      value: '1 visit per month',
      title: 'Once monthly',
      subtitle: '1 visit / month (touch-ups)',
      totalCost: baseRate,
      isSubscription: false
    },
    {
      value: '2 visits per month (Twice monthly)',
      title: 'Twice monthly',
      subtitle: '2 visits / month',
      totalCost: baseRate * 2,
      isSubscription: false
    },
    {
      value: '4 visits per month (4 times monthly)',
      title: 'Weekly',
      subtitle: '4 visits / month',
      totalCost: baseRate * 4,
      isSubscription: false
    }
  ];

  // Default to 1 visit if nothing selected yet
  if (!visitsSelect.value) {
    visitsSelect.value = '1 visit per month';
  }

  frequencies.forEach(freq => {
    const card = document.createElement('div');
    card.className = 'frequency-card';
    if (freq.isSubscription) {
      card.classList.add('subscription-card');
    }
    if (visitsSelect.value === freq.value) {
      card.classList.add('active');
    }

    card.innerHTML = `
      <div class="frequency-card-left">
        <div class="frequency-radio-circle">
          ✓
        </div>
        <div class="frequency-card-details">
          <span class="frequency-card-title">${freq.title}</span>
          <span class="frequency-card-subtitle">${freq.subtitle}</span>
        </div>
      </div>
      <span class="frequency-card-price">₦${freq.totalCost.toLocaleString()}</span>
    `;

    card.addEventListener('click', () => {
      frequencyCardsContainer.querySelectorAll('.frequency-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      visitsSelect.value = freq.value;

      // Update planInput based on whether it is subscription or pay per visit
      const size = apartmentSizeInput ? apartmentSizeInput.value : bedrooms;
      if (freq.isSubscription) {
        planInput.value = `${size} — Monthly Subscription (8 visits)`;
      } else {
        planInput.value = `${size} — Pay Per Visit`;
      }

      const step1ValMsg = document.getElementById('step1-validation-msg');
      if (step1ValMsg) step1ValMsg.textContent = '';
      handlePlanChange();
    });

    frequencyCardsContainer.appendChild(card);
  });

  // Append promo/welcome offer notice if applicable
  let noticeEl = document.getElementById('frequency-promo-notice');
  if (isPromoApplied) {
    if (!noticeEl) {
      noticeEl = document.createElement('p');
      noticeEl.id = 'frequency-promo-notice';
      noticeEl.style.fontSize = '12.5px';
      noticeEl.style.color = 'var(--primary-purple)';
      noticeEl.style.fontWeight = '600';
      noticeEl.style.marginTop = '12px';
      noticeEl.style.lineHeight = '1.4';
      frequencyCardsContainer.parentNode.appendChild(noticeEl);
    }
    noticeEl.innerHTML = `ℹ️ <strong>Welcome Offer:</strong> Your first month at a discounted rate. Same 8 visits. Same team. Same standard. After month one, subscription automatically moves to standard monthly pricing.`;
  } else {
    if (noticeEl) noticeEl.remove();
  }
}

function updateBookingSummary() {
  const selectedPlan = planInput.value;
  const visits = visitsSelect.value;
  const preferredDate = document.getElementById('booking-date-display').value;
  const schedule = bookingScheduleSelect.value;
  const propertyTypeVal = document.getElementById('booking-property') ? document.getElementById('booking-property').value : 'Flat';

  const summaryPlanName = document.getElementById('summary-plan-name');
  const summaryExtrasText = document.getElementById('summary-extras-text');
  const summaryFrequencyText = document.getElementById('summary-frequency-text');
  const summaryMetaSched = document.getElementById('summary-meta-schedule');
  const summarySchedText = document.getElementById('summary-schedule-text');
  const summaryBreakdown = document.getElementById('summary-breakdown-container');
  const summaryBreakdownItemName = document.getElementById('summary-breakdown-item-name');
  const summaryBreakdownItemPrice = document.getElementById('summary-breakdown-item-price');
  const summaryBreakdownServiceName = document.getElementById('summary-breakdown-service-name');
  const summaryBreakdownServicePrice = document.getElementById('summary-breakdown-service-price');
  const summaryBreakdownServiceFreq = document.getElementById('summary-breakdown-service-freq');
  const summaryTotal = document.getElementById('summary-total-price');

  if (!selectedPlan) {
    summaryPlanName.textContent = "No Plan Selected";
    summaryExtrasText.textContent = "Extras: -";
    summaryFrequencyText.textContent = "-";
    summaryMetaSched.style.display = 'none';
    summaryBreakdown.style.display = 'none';
    summaryTotal.textContent = "₦0.00";
    return;
  }

  // Parse room size name and property type
  let bedrooms = "1 Bedroom";
  const bedMatch = selectedPlan.match(/(\d+)\s*Bedroom/i);
  if (bedMatch) {
    bedrooms = `${bedMatch[1]} Bedroom`;
  } else if (selectedPlan.includes("2 Bedroom")) bedrooms = "2 Bedroom";
  else if (selectedPlan.includes("3 Bedroom")) bedrooms = "3 Bedroom";
  else if (selectedPlan.includes("4 Bedroom")) bedrooms = "4 Bedroom";

  let propertyType = propertyTypeVal || "Flat";
  if (propertyType === "Apartment") propertyType = "Apartment";
  else if (propertyType === "Duplex") propertyType = "Duplex";

  summaryPlanName.textContent = `${bedrooms} ${propertyType}`;
  summaryBreakdownItemName.textContent = `${bedrooms} ${propertyType}`;
  summaryBreakdownItemPrice.textContent = "₦0.00";

  // Schedule text
  if (preferredDate && schedule) {
    summarySchedText.textContent = `${preferredDate} (${schedule})`;
    summaryMetaSched.style.display = 'flex';
  } else if (preferredDate) {
    summarySchedText.textContent = `${preferredDate}`;
    summaryMetaSched.style.display = 'flex';
  } else {
    summaryMetaSched.style.display = 'none';
  }

  // Pricing calculation
  const planPrices = {
    "1 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 7000 : 10000, type: "per-visit" },
    "1 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 35000 : 50000, type: "fixed" },
    "2 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 10000 : 15000, type: "per-visit" },
    "2 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 50000 : 80000, type: "fixed" },
    "3 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 15000 : 20000, type: "per-visit" },
    "3 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 70000 : 100000, type: "fixed" },
    "4 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 20000 : 25000, type: "per-visit" },
    "4 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 100000 : 150000, type: "fixed" }
  };

  const priceInfo = planPrices[selectedPlan];
  if (priceInfo) {
    summaryBreakdown.style.display = 'flex';

    if (priceInfo.type === "fixed") {
      summaryExtrasText.textContent = `Extras: ${bedrooms}`;
      summaryFrequencyText.textContent = "(8 times monthly)";

      summaryBreakdownServiceName.textContent = `cleanse.ng Monthly Subscription`;
      summaryBreakdownServicePrice.textContent = `₦${priceInfo.rate.toLocaleString()}`;
      summaryBreakdownServiceFreq.textContent = "(8 times monthly)";
      summaryTotal.textContent = `₦${priceInfo.rate.toLocaleString()}`;
    } else {
      let multiplier = 2; // default
      let ratePerVisit = priceInfo.rate;
      let freqLabel = "(Twice monthly)";

      if (visits === "1 visit per month" || visits.includes("Once")) {
        multiplier = 1;
        freqLabel = "(Once monthly)";
      } else if (visits && (visits.includes("2 visits") || visits.includes("Twice"))) {
        multiplier = 2;
        freqLabel = "(Twice monthly)";
      } else if (visits && (visits.includes("4 visits") || visits.includes("Weekly"))) {
        multiplier = 4;
        freqLabel = "(Weekly)";
      }

      summaryExtrasText.textContent = `Extras: ${bedrooms}`;
      summaryFrequencyText.textContent = freqLabel;

      const subtotal = ratePerVisit * multiplier;
      summaryBreakdownServiceName.textContent = `cleanse.ng Pay Per Visit`;
      summaryBreakdownServicePrice.textContent = `₦${subtotal.toLocaleString()}`;
      summaryBreakdownServiceFreq.textContent = freqLabel;
      summaryTotal.textContent = `₦${subtotal.toLocaleString()}`;
    }
  } else {
    summaryBreakdown.style.display = 'flex';
    summaryExtrasText.textContent = `Extras: ${bedrooms} (Custom Plan)`;
    summaryFrequencyText.textContent = "(Pricing to be confirmed)";

    summaryBreakdownServiceName.textContent = `cleanse.ng Custom Plan`;
    summaryBreakdownServicePrice.textContent = `TBD`;
    summaryBreakdownServiceFreq.textContent = "(Pricing to be confirmed)";
    summaryTotal.textContent = `TBD`;
  }
}

function updateWizardUI() {
  if (wizardStepSize) wizardStepSize.classList.remove('active');
  wizardStepPlan.classList.remove('active');
  wizardStepSchedule.classList.remove('active');
  wizardStepContact.classList.remove('active');

  const wizardStepVerifyLeft = document.getElementById('wizard-step-verify-left');
  if (wizardStepVerifyLeft) wizardStepVerifyLeft.classList.remove('active');

  pStep1.className = 'progress-step';
  pStep2.className = 'progress-step';
  pStep3.className = 'progress-step';
  pDiv1.style.background = 'var(--border)';
  pDiv2.style.background = 'var(--border)';

  const wizardTitle = document.getElementById('wizard-title');
  const wizardSubtitle = document.getElementById('wizard-subtitle');
  const modalLeft = document.querySelector('.booking-modal-left');

  const standardSummary = document.getElementById('standard-summary-panel');
  const verifySummary = document.getElementById('wizard-step-verify-right');

  // Common UI reset for modal content layout on steps 1-4 vs step 5
  const modalContent = document.querySelector('.booking-modal-content');
  if (modalContent) {
    modalContent.classList.remove('mobile-show-summary');
    modalContent.classList.remove('verify-step-active');
  }
  if (modalLeft) modalLeft.style.background = '';

  if (_currentWizardStep === 1) {
    if (wizardStepSize) wizardStepSize.classList.add('active');
    pStep1.classList.add('active');

    if (wizardTitle) wizardTitle.textContent = "Select a Service";
    if (wizardSubtitle) wizardSubtitle.textContent = "";

    if (standardSummary) standardSummary.style.display = 'flex';
    if (verifySummary) verifySummary.style.display = 'none';

    wizardBackBtn.style.visibility = 'visible'; // Back button on step 1 to close modal
    wizardNextBtn.style.display = 'none'; // Auto-advances when a size is clicked
    bookingSubmitBtn.style.display = 'none';
  } else if (_currentWizardStep === 2) {
    wizardStepPlan.classList.add('active');
    pStep1.classList.add('active'); // Still step 1 of progress bar

    if (wizardTitle) wizardTitle.textContent = "Select Plan";
    if (wizardSubtitle) wizardSubtitle.textContent = "";

    if (standardSummary) standardSummary.style.display = 'flex';
    if (verifySummary) verifySummary.style.display = 'none';

    wizardBackBtn.style.visibility = 'visible';
    wizardNextBtn.style.display = 'block';
    bookingSubmitBtn.style.display = 'none';
  } else if (_currentWizardStep === 3) {
    wizardStepSchedule.classList.add('active');
    pStep1.classList.add('completed');
    pDiv1.style.background = 'var(--neon-green)';
    pStep2.classList.add('active');

    if (wizardTitle) wizardTitle.textContent = "Select Date & Time";
    if (wizardSubtitle) wizardSubtitle.textContent = "Choose when you'd like our team to arrive.";

    if (standardSummary) standardSummary.style.display = 'flex';
    if (verifySummary) verifySummary.style.display = 'none';

    wizardBackBtn.style.visibility = 'visible';
    wizardNextBtn.style.display = 'block';
    bookingSubmitBtn.style.display = 'none';
  } else if (_currentWizardStep === 4) {
    wizardStepContact.classList.add('active');
    pStep1.classList.add('completed');
    pDiv1.style.background = 'var(--neon-green)';
    pStep2.classList.add('completed');
    pDiv2.style.background = 'var(--neon-green)';
    pStep3.classList.add('active');

    if (wizardTitle) wizardTitle.textContent = "Your Contact Details";
    if (wizardSubtitle) wizardSubtitle.textContent = "Let us know how to contact you and any preferences.";

    if (standardSummary) standardSummary.style.display = 'flex';
    if (verifySummary) verifySummary.style.display = 'none';

    wizardBackBtn.style.visibility = 'visible';
    wizardNextBtn.style.display = 'block';
    bookingSubmitBtn.style.display = 'none';
  } else if (_currentWizardStep === 5) {
    if (wizardStepVerifyLeft) wizardStepVerifyLeft.classList.add('active');
    pStep1.classList.add('completed');
    pDiv1.style.background = 'var(--neon-green)';
    pStep2.classList.add('completed');
    pDiv2.style.background = 'var(--neon-green)';
    pStep3.classList.add('completed');

    if (wizardTitle) wizardTitle.textContent = "";
    if (wizardSubtitle) wizardSubtitle.textContent = "";

    if (standardSummary) standardSummary.style.display = 'none';
    if (verifySummary) verifySummary.style.display = 'flex';
    if (modalLeft) modalLeft.style.background = '#f2f6ff';

    if (modalContent) {
      modalContent.classList.add('mobile-show-summary');
      modalContent.classList.add('verify-step-active');
    }

    updateVerifyStepDetails();

    wizardBackBtn.style.visibility = 'visible';
    wizardNextBtn.style.display = 'none';
    bookingSubmitBtn.style.display = 'block';
    bookingSubmitBtn.textContent = "Confirm Booking";
  }
}

function updateVerifyStepDetails() {
  const nameVal = (document.getElementById('booking-name').value || '').trim() || 'Jane Doe';
  const emailVal = (document.getElementById('booking-email').value || '').trim() || 'jane@example.com';

  document.getElementById('verify-customer-name').textContent = nameVal;
  document.getElementById('verify-customer-email').textContent = emailVal;
  document.getElementById('verify-location').textContent = 'Ibadan';

  // Avatar initials
  const initials = nameVal.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'JD';
  document.getElementById('verify-avatar').textContent = initials;

  // Plan details
  const selectedPlan = planInput.value;
  let bedroomLabel = "2 Bedroom Flat";
  const bedMatch = selectedPlan.match(/(\d+)\s*Bedroom/i);
  if (bedMatch) {
    bedroomLabel = `${bedMatch[1]} Bedroom Flat`;
  } else if (selectedPlan.includes("1 Bedroom")) bedroomLabel = "1 Bedroom Flat";
  else if (selectedPlan.includes("2 Bedroom")) bedroomLabel = "2 Bedroom Flat";
  else if (selectedPlan.includes("3 Bedroom")) bedroomLabel = "3 Bedroom Flat";
  else if (selectedPlan.includes("4 Bedroom")) bedroomLabel = "4 Bedroom Flat";

  document.getElementById('verify-plan-name').textContent = bedroomLabel;
  document.getElementById('verify-breakdown-base-name').textContent = bedroomLabel;

  // Date & Time
  const dateVal = document.getElementById('booking-date-display').value || 'Select Date';
  const scheduleVal = document.getElementById('booking-schedule').value || '';
  let timeStr = "";
  if (scheduleVal) {
    if (scheduleVal.includes("8am - 11am")) timeStr = "10:00 am";
    else if (scheduleVal.includes("11am - 2pm")) timeStr = "12:30 pm";
    else if (scheduleVal.includes("12pm - 2pm")) timeStr = "1:00 pm";
    else if (scheduleVal.includes("2pm - 5pm")) timeStr = "3:00 pm";
    else timeStr = scheduleVal;
  }
  document.getElementById('verify-date-time').textContent = `${dateVal}${timeStr ? ', ' + timeStr : ''}`;

  // Extras & Service details
  const visits = visitsSelect.value;
  const isMonthly = selectedPlan.includes('Monthly Subscription');
  let freqText = "";
  if (isMonthly) {
    freqText = "Monthly Subscription (8 visits)";
  } else if (selectedPlan.includes("Custom Plan")) {
    freqText = "Custom Plan (pricing to be confirmed)";
  } else {
    let freqLabel = "Twice monthly";
    if (visits === "1 visit per month" || visits.includes("Once")) {
      freqLabel = "Once monthly";
    } else if (visits && (visits.includes("2 visits") || visits.includes("Twice"))) {
      freqLabel = "Twice monthly";
    } else if (visits && (visits.includes("4 visits") || visits.includes("Weekly"))) {
      freqLabel = "Weekly";
    }
    freqText = `${bedroomLabel.replace(' Flat', '')} (${freqLabel})`;
  }

  document.getElementById('verify-extras').textContent = `Extras: cleanse.ng ${freqText}`;
  document.getElementById('verify-breakdown-service-name').textContent = `└ cleanse.ng ${freqText}`;

  // Total Price calculation
  const planPrices = {
    "1 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 7000 : 10000, type: "per-visit" },
    "1 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 35000 : 50000, type: "fixed" },
    "2 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 10000 : 15000, type: "per-visit" },
    "2 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 50000 : 80000, type: "fixed" },
    "3 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 15000 : 20000, type: "per-visit" },
    "3 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 70000 : 100000, type: "fixed" },
    "4 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 20000 : 25000, type: "per-visit" },
    "4 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 100000 : 150000, type: "fixed" }
  };

  const priceInfo = planPrices[selectedPlan];
  if (priceInfo) {
    let totalVal = 0;
    if (priceInfo.type === "fixed") {
      totalVal = priceInfo.rate;
    } else {
      let multiplier = 2; // default
      let ratePerVisit = priceInfo.rate;
      if (visits === "1 visit per month" || visits.includes("Once")) {
        multiplier = 1;
      } else if (visits && (visits.includes("2 visits") || visits.includes("Twice"))) {
        multiplier = 2;
      } else if (visits && (visits.includes("4 visits") || visits.includes("Weekly"))) {
        multiplier = 4;
      }
      totalVal = ratePerVisit * multiplier;
    }
    const formattedPrice = `₦${totalVal.toLocaleString()}`;
    document.getElementById('verify-breakdown-service-price').textContent = formattedPrice;
    document.getElementById('verify-total-price').textContent = formattedPrice;
  } else {
    document.getElementById('verify-breakdown-service-price').textContent = "TBD";
    document.getElementById('verify-total-price').textContent = "TBD";
  }
}

// ── CUSTOM INLINE CALENDAR STATE & LOGIC ──
let calendarYear, calendarMonth;
const calendarMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Local fallback / mock database for booked slots
let bookedSlots = {};

// Google Sheet ID for manual booking sync
const GOOGLE_SHEET_ID = "14IMdMV4R_SsgJ2fQ6JmDOpGZynSgCZt4Z31QaGRzD7M";

async function syncBookingsFromSpreadsheet() {
  if (!GOOGLE_SHEET_ID || GOOGLE_SHEET_ID.includes("YOUR_SPREADSHEET_ID")) {
    console.log("No Google Sheet ID configured. Using local/fallback bookedSlots data.");
    return;
  }

  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&t=${Date.now()}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const csvText = await response.text();
    parseSpreadsheetCSV(csvText);

    // Refresh the calendar view if it is currently displayed
    renderCalendar();
  } catch (err) {
    console.error("Failed to sync bookings from Google Sheet:", err);
  }
}

async function syncTestimonialsFromSpreadsheet() {
  if (!GOOGLE_SHEET_ID || GOOGLE_SHEET_ID.includes("YOUR_SPREADSHEET_ID")) {
    return;
  }

  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Testimonials`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const csvText = await response.text();
    const testimonials = parseTestimonialsCSV(csvText);

    if (testimonials.length > 0) {
      renderTestimonials(testimonials);
    }
  } catch (err) {
    console.error("Failed to sync testimonials from Google Sheet:", err);
  }
}

function parseTestimonialsCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) return []; // Header only or empty

  const list = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Split CSV correctly respecting potential quotes
    const cols = [];
    let currentCell = '';
    let inQuotes = false;
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cols.push(currentCell.trim());

    // Clean columns
    const cleanCols = cols.map(cell => cell.replace(/^["']|["']$/g, '').trim());

    if (cleanCols.length >= 2) {
      const quoteVal = cleanCols[0];
      const authorVal = cleanCols[1];
      if (quoteVal && authorVal) {
        list.push({ quote: quoteVal, author: authorVal });
      }
    }
  }
  return list;
}

function renderTestimonials(list) {
  const track = document.querySelector('.testimonial-track');
  const dotsContainer = document.querySelector('.t-dots');
  if (!track || !dotsContainer) return;

  track.innerHTML = '';
  dotsContainer.innerHTML = '';

  list.forEach((item, index) => {
    const slide = document.createElement('div');
    slide.className = `testimonial-slide${index === 0 ? ' active' : ''}`;

    const quoteEl = document.createElement('p');
    quoteEl.className = 'testimonial-quote';
    quoteEl.textContent = item.quote;

    const authorEl = document.createElement('p');
    authorEl.className = 'testimonial-author';
    authorEl.textContent = item.author;

    slide.appendChild(quoteEl);
    slide.appendChild(authorEl);
    track.appendChild(slide);

    const dot = document.createElement('div');
    dot.className = `t-dot${index === 0 ? ' active' : ''}`;
    dot.setAttribute('data-index', index);
    dotsContainer.appendChild(dot);
  });

  initTestimonialSlider();
}

function normalizeSlot(slotStr) {
  if (!slotStr) return "";
  const s = slotStr.toString().toLowerCase().trim();
  if (s.includes("8am") || s.includes("morning")) return "8am - 11am";
  if (s.includes("11am") || s.includes("afternoon")) return "11am - 2pm";
  return "2pm - 5pm";
}

function parseSpreadsheetCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) return; // Header only or empty

  // Reset local bookedSlots before merging
  bookedSlots = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = line.split(',').map(cell => {
      return cell.replace(/^["']|["']$/g, '').trim();
    });

    if (cols.length >= 2) {
      const dateVal = cols[0]; // e.g. "2026-06-25"
      const slotVal = normalizeSlot(cols[1]); // e.g. "8am - 11am"
      const statusVal = cols[2] ? cols[2].toLowerCase() : "";

      if (dateVal && slotVal && (statusVal === "booked" || statusVal === "yes" || statusVal === "")) {
        const normalizedDate = dateVal.replace(/\//g, '-');

        if (!bookedSlots[normalizedDate]) {
          bookedSlots[normalizedDate] = [];
        }
        if (!bookedSlots[normalizedDate].includes(slotVal)) {
          bookedSlots[normalizedDate].push(slotVal);
        }
      }
    }
  }
  console.log("Bookings synced successfully. Updated bookedSlots database:", bookedSlots);
}

function initCustomCalendar() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  calendarYear = tomorrow.getFullYear();
  calendarMonth = tomorrow.getMonth();

  renderCalendar();
}

function renderCalendar() {
  const container = document.getElementById('calendar-widget-container');
  if (!container) return;

  container.innerHTML = `
    <div class="calendar-widget">
      <div class="calendar-header">
        <div class="calendar-month-year" id="calendar-month-year-label">${calendarMonths[calendarMonth]} <span>${calendarYear}</span></div>
        <div class="calendar-nav-btns">
          <button type="button" class="calendar-nav-btn" id="calendar-prev-month">&lt;</button>
          <button type="button" class="calendar-nav-btn" id="calendar-next-month">&gt;</button>
        </div>
      </div>
      <div class="calendar-grid-header">
        <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
      </div>
      <div class="calendar-grid-days" id="calendar-grid-days-container"></div>
      <div class="calendar-booking-message" id="calendar-booking-message"></div>
    </div>
  `;

  const daysContainer = document.getElementById('calendar-grid-days-container');
  const prevBtn = document.getElementById('calendar-prev-month');
  const nextBtn = document.getElementById('calendar-next-month');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Disable prev month button if showing current month
  const isCurrentMonth = (calendarYear === today.getFullYear() && calendarMonth === today.getMonth());
  if (isCurrentMonth) {
    if (prevBtn) {
      prevBtn.disabled = true;
      prevBtn.style.opacity = '0.3';
      prevBtn.style.cursor = 'not-allowed';
    }
  } else {
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        calendarMonth--;
        if (calendarMonth < 0) {
          calendarMonth = 11;
          calendarYear--;
        }
        renderCalendar();
      });
    }
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      calendarMonth++;
      if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
      }
      renderCalendar();
    });
  }

  // Generate grid days
  // First day index (Mon-Sun: 0-6)
  let firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
  if (firstDayIndex === 0) {
    firstDayIndex = 6; // Sunday is 6
  } else {
    firstDayIndex = firstDayIndex - 1; // Mon-Sat: 0-5
  }

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  // Fill initial empty cells
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day-cell empty';
    daysContainer.appendChild(emptyCell);
  }

  // Fill actual day cells
  const activeDateVal = bookingDateInput.value; // yyyy-mm-dd format

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(calendarYear, calendarMonth, day);
    cellDate.setHours(0, 0, 0, 0);

    const cellDateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const isCellToday = cellDate.getTime() === today.getTime();
    const isCellPast = cellDate < today;
    const isCellSunday = cellDate.getDay() === 0;

    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    cell.textContent = day;

    const slotsBooked = bookedSlots[cellDateStr] || [];
    const maxSlots = isCellSunday ? 1 : 3;
    const isFullyBooked = slotsBooked.length >= maxSlots;
    const isPartiallyBooked = slotsBooked.length > 0 && slotsBooked.length < maxSlots;
    const isSelectable = !isCellPast && !isCellToday;

    if (isCellToday) {
      cell.classList.add('today');
    } else if (isCellPast) {
      cell.classList.add('disabled');
    } else if (isSelectable) {
      if (isFullyBooked) {
        cell.classList.add('fully-booked');
        cell.setAttribute('data-tooltip', '0 Available');
        cell.addEventListener('click', () => {
          const msgEl = document.getElementById('calendar-booking-message');
          if (msgEl) msgEl.textContent = 'This date is fully booked. Please select another date.';
        });
      } else {
        cell.classList.add('selectable');
        const slotsLeft = maxSlots - slotsBooked.length;
        cell.setAttribute('data-tooltip', `${slotsLeft} Available`);
        if (isPartiallyBooked) {
          cell.classList.add('partially-booked');
        }

        if (activeDateVal === cellDateStr) {
          cell.classList.add('selected');
        }

        cell.addEventListener('click', () => {
          bookingDateInput.value = cellDateStr;

          const formattedDate = cellDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          document.getElementById('booking-date-display').value = formattedDate;

          // Clear any fully-booked message
          const msgEl = document.getElementById('calendar-booking-message');
          if (msgEl) msgEl.textContent = '';
          const step2ValMsg = document.getElementById('step2-validation-msg');
          if (step2ValMsg) step2ValMsg.textContent = '';

          const dayOfWeek = cellDate.getDay();

          transitionModalSize(() => {
            const slotsContainer = document.getElementById('schedule-slots-container');
            if (slotsContainer) slotsContainer.style.display = 'block';
            updateSchedulePills(dayOfWeek);
            updateBookingSummary();
            if (typeof saveSessionState === 'function') saveSessionState();

            // Auto-scroll to slots container
            setTimeout(() => {
              if (slotsContainer) {
                slotsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }, 380);
          });

          // Re-render to update selected highlight
          renderCalendar();
        });
      }
    }

    daysContainer.appendChild(cell);
  }
}

function openBookingModal(planName) {
  _modalOpenTime = Date.now();

  // Clear validation messages
  ['step1-validation-msg', 'step2-validation-msg', 'step3-validation-msg', 'step4-validation-msg', 'coupon-validation-msg', 'calendar-booking-message'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      if (id === 'coupon-validation-msg') el.style.display = 'none';
    }
  });

  const content = document.querySelector('.booking-modal-content');
  if (content) {
    content.classList.remove('confirmed');
    content.classList.remove('verify-step-active');
    content.style.height = 'auto';
  }

  // Clear defaults
  bookingDateInput.value = "";
  document.getElementById('booking-date-display').value = "";
  const slotsContainer = document.getElementById('schedule-slots-container');
  if (slotsContainer) slotsContainer.style.display = 'none';

  const agreeCheckbox = document.getElementById('booking-agree-policy');
  if (agreeCheckbox) agreeCheckbox.checked = false;

  // Restore session state
  if (typeof restoreSessionState === 'function') {
    restoreSessionState(planName);
  }

  if (planName) {
    // Check if option exists in select
    let optionExists = Array.from(planInput.options).some(opt => opt.value === planName);
    if (!optionExists) {
      const tempOpt = document.createElement('option');
      tempOpt.value = planName;
      tempOpt.textContent = planName;
      tempOpt.selected = true;
      tempOpt.dataset.customOption = "true";
      planInput.appendChild(tempOpt);
    }
    planInput.value = planName;
    _isPlanPreSelected = true;

    // Hide apartment size selector group since the size has been pre-selected
    const apartmentSizeGroup = document.getElementById('apartment-size-group');
    if (apartmentSizeGroup) {
      apartmentSizeGroup.style.display = 'none';
    }

    if (planName.includes('Monthly Subscription') || planName.includes('Custom Plan')) {
      _currentWizardStep = 3; // Skip Size and Plan selection, go straight to Date/Time
    } else {
      _currentWizardStep = 2; // Skip Size selection, go to Plan selection to pick frequency
    }
  } else {
    planInput.value = "";
    if (apartmentSizeInput) {
      apartmentSizeInput.value = "";
      // Sync custom cards active class to clear them
      const aptCards = document.querySelectorAll('.apt-card');
      aptCards.forEach(card => card.classList.remove('active'));
    }
    _isPlanPreSelected = false;

    // Show apartment size selector group for general bookings
    const apartmentSizeGroup = document.getElementById('apartment-size-group');
    if (apartmentSizeGroup) {
      apartmentSizeGroup.style.display = 'block';
    }

    _currentWizardStep = 1;
  }

  handlePlanChange();
  updateWizardUI();
  updateBookingSummary();

  // Render custom calendar
  initCustomCalendar();

  formContainer.style.display = 'block';
  successContainer.classList.remove('active');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function handlePlanChange() {
  const planName = planInput.value;
  const step1ValMsg = document.getElementById('step1-validation-msg');
  if (step1ValMsg) step1ValMsg.textContent = '';

  if (apartmentSizeInput) {
    let apartmentSize = "";
    if (planName.includes("1 Bedroom")) apartmentSize = "1 Bedroom";
    else if (planName.includes("2 Bedroom")) apartmentSize = "2 Bedroom";
    else if (planName.includes("3 Bedroom")) apartmentSize = "3 Bedroom";
    else if (planName.includes("4 Bedroom")) apartmentSize = "4 Bedroom";
    apartmentSizeInput.value = apartmentSize;

    // Sync custom cards active class
    const aptCards = document.querySelectorAll('.apt-card');
    aptCards.forEach(card => {
      if (card.getAttribute('data-val') === apartmentSize) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  if (planName.includes('Monthly Subscription')) {
    visitsSelect.value = "8 visits per month";

    if (planSummary) {
      planSummaryText.textContent = planName;
      planSummary.style.display = 'block';
    }
  } else {
    if (visitsSelect.value.includes("8 visits")) {
      visitsSelect.value = "1 visit per month";
    }

    if (planSummary) {
      planSummary.style.display = 'none';
    }
  }

  updateFrequencyCards();
  updateBookingSummary();
}

function transitionModalSize(actionCallback) {
  const content = document.querySelector('.booking-modal-content');
  if (!content) {
    actionCallback();
    return;
  }

  const prevHeight = content.offsetHeight;
  const prevWidth = content.offsetWidth;
  const prevOverflow = content.style.overflow;

  content.style.overflow = 'hidden';
  content.style.transition = 'none';
  content.style.height = prevHeight + 'px';
  content.style.width = prevWidth + 'px';

  actionCallback();

  // Reset styles temporarily to get auto layout calculations
  content.style.height = 'auto';
  content.style.width = '';

  const newHeight = content.offsetHeight;
  const newWidth = content.offsetWidth;

  // Set back to start value to prepare transition
  content.style.height = prevHeight + 'px';
  content.style.width = prevWidth + 'px';
  content.offsetHeight; // force reflow

  // Apply transitions for height, width, and max-width
  content.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
  content.style.height = newHeight + 'px';
  content.style.width = newWidth + 'px';

  setTimeout(() => {
    content.style.height = 'auto';
    content.style.width = '';
    content.style.overflow = prevOverflow;
  }, 360);
}

function changeWizardStep(nextStep, direction) {
  const steps = {
    1: wizardStepSize,
    2: wizardStepPlan,
    3: wizardStepSchedule,
    4: wizardStepContact,
    5: wizardStepVerifyLeft
  };

  const currentStepEl = steps[_currentWizardStep];
  const nextStepEl = steps[nextStep];

  if (!currentStepEl || !nextStepEl) return;

  wizardNextBtn.disabled = true;
  wizardBackBtn.disabled = true;

  if (direction === 'next') {
    currentStepEl.classList.add('leaving-left');
  } else {
    currentStepEl.classList.add('leaving-right');
  }

  setTimeout(() => {
    transitionModalSize(() => {
      currentStepEl.classList.remove('active', 'leaving-left', 'leaving-right');

      _currentWizardStep = nextStep;

      if (direction === 'next') {
        nextStepEl.classList.add('entering-right');
      } else {
        nextStepEl.classList.add('entering-left');
      }
      nextStepEl.classList.add('active');

      void nextStepEl.offsetWidth;

      nextStepEl.classList.remove('entering-right', 'entering-left');

      updateWizardUI();
    });

    wizardNextBtn.disabled = false;
    wizardBackBtn.disabled = false;
  }, 220);
}

if (wizardNextBtn) {
  wizardNextBtn.addEventListener('click', () => {
    if (_currentWizardStep === 1) {
      if (apartmentSizeInput && !apartmentSizeInput.value) {
        apartmentSizeInput.reportValidity();
        return;
      }
      changeWizardStep(2, 'next');
    } else if (_currentWizardStep === 2) {
      if (!planInput.checkValidity()) {
        planInput.reportValidity();
        return;
      }
      if (!planInput.value.includes('Monthly Subscription') && !visitsSelect.value) {
        const step1ValMsg = document.getElementById('step1-validation-msg');
        if (step1ValMsg) step1ValMsg.textContent = "Please select a plan option.";
        return;
      }
      const propSelect = document.getElementById('booking-property');
      if (propSelect && propSelect.required && !propSelect.value) {
        propSelect.reportValidity();
        return;
      }
      changeWizardStep(3, 'next');
    } else if (_currentWizardStep === 3) {
      // Validate date selected
      const dateVal = bookingDateInput.value;
      if (!dateVal) {
        const step2ValMsg = document.getElementById('step2-validation-msg');
        if (step2ValMsg) step2ValMsg.textContent = "Please select a preferred date on the calendar.";
        return;
      }

      // Safety block for same-day
      const selectedD = new Date(dateVal);
      selectedD.setHours(0, 0, 0, 0);
      const todayD = new Date();
      todayD.setHours(0, 0, 0, 0);
      if (selectedD.getTime() === todayD.getTime()) {
        const step2ValMsg = document.getElementById('step2-validation-msg');
        if (step2ValMsg) step2ValMsg.textContent = "Same-day bookings are not allowed. Please select a future date.";
        return;
      }

      if (!bookingScheduleSelect.value) {
        const step2ValMsg = document.getElementById('step2-validation-msg');
        if (step2ValMsg) step2ValMsg.textContent = "Please select a preferred schedule slot.";
        return;
      }

      changeWizardStep(4, 'next');
    } else if (_currentWizardStep === 4) {
      // Validate step 4 fields: Name, Email, Phone, Location
      const nameInput = document.getElementById('booking-name');
      const emailInput = document.getElementById('booking-email');
      const phoneInput = document.getElementById('booking-phone');
      const locationInput = document.getElementById('booking-location');
      const policyCheckbox = document.getElementById('booking-agree-policy');

      if (!nameInput.checkValidity()) {
        nameInput.reportValidity();
        return;
      }
      if (!emailInput.checkValidity()) {
        emailInput.reportValidity();
        return;
      }
      if (!phoneInput.checkValidity()) {
        phoneInput.reportValidity();
        return;
      }
      if (!locationInput.checkValidity()) {
        locationInput.reportValidity();
        return;
      }

      // Explicit format validation
      if (nameInput.value.trim().length < 2) {
        const step3ValMsg = document.getElementById('step3-validation-msg');
        if (step3ValMsg) step3ValMsg.textContent = 'Please enter a valid name (at least 2 characters).';
        return;
      }
      if (!_validateEmail(emailInput.value.trim())) {
        const step3ValMsg = document.getElementById('step3-validation-msg');
        if (step3ValMsg) step3ValMsg.textContent = 'Please enter a valid email address.';
        return;
      }
      if (!_validatePhone(phoneInput.value.trim())) {
        const step3ValMsg = document.getElementById('step3-validation-msg');
        if (step3ValMsg) step3ValMsg.textContent = 'Please enter a valid phone number (7-15 digits).';
        return;
      }

      if (policyCheckbox && !policyCheckbox.checked) {
        const step3ValMsg = document.getElementById('step3-validation-msg');
        if (step3ValMsg) step3ValMsg.textContent = "Please agree to the Customer Policy to proceed.";
        return;
      }

      changeWizardStep(5, 'next');
    }
  });
}

if (wizardBackBtn) {
  wizardBackBtn.addEventListener('click', () => {
    if (_currentWizardStep === 1) {
      closeBookingModal();
    } else {
      changeWizardStep(_currentWizardStep - 1, 'back');
    }
  });
}

if (planInput) {
  planInput.addEventListener('change', handlePlanChange);
}

if (apartmentSizeInput) {
  apartmentSizeInput.addEventListener('change', () => {
    const size = apartmentSizeInput.value;
    if (size) {
      if (isPromoApplied && selectedPromoType === 'monthly') {
        planInput.value = `${size} — Monthly Subscription (8 visits)`;
        visitsSelect.value = "8 visits per month";
      } else {
        planInput.value = `${size} — Pay Per Visit`;
      }
    } else {
      planInput.value = "";
    }
    handlePlanChange();
  });

  // Handle click on custom apartment size cards
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.apt-card');
    if (card) {
      const val = card.getAttribute('data-val');
      apartmentSizeInput.value = val;
      apartmentSizeInput.dispatchEvent(new Event('change'));

      // Auto-advance to Step 2 with a short click feedback delay
      if (_currentWizardStep === 1) {
        setTimeout(() => {
          changeWizardStep(2, 'next');
        }, 150);
      }
    }
  });
}

function closeBookingModal() {
  if (modal) modal.classList.remove('active');

  // reset policy checkbox & close policy overlay if open
  const policyModal = document.getElementById('customer-policy-modal');
  if (policyModal) policyModal.classList.remove('active');

  const agreeCheckbox = document.getElementById('booking-agree-policy');
  if (agreeCheckbox) agreeCheckbox.checked = false;

  document.body.style.overflow = '';
}

if (closeBtn) closeBtn.addEventListener('click', closeBookingModal);
if (successCloseBtn) successCloseBtn.addEventListener('click', closeBookingModal);

// Close modal when clicking outside content
if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeBookingModal();
    }
  });
}

// Step 4 micro-interactions
const editPencil = document.getElementById('verify-edit-pencil');
if (editPencil) {
  editPencil.addEventListener('click', () => {
    changeWizardStep(3, 'back');
  });
}

const addMoreBtn = document.getElementById('verify-add-more-btn');
if (addMoreBtn) {
  addMoreBtn.addEventListener('click', () => {
    changeWizardStep(1, 'back');
  });
}

const couponLink = document.getElementById('verify-coupon-link');
if (couponLink) {
  couponLink.addEventListener('click', (e) => {
    e.preventDefault();
    const code = prompt("Enter your Coupon Code:");
    const couponMsg = document.getElementById('coupon-validation-msg');
    if (couponMsg) {
      couponMsg.textContent = '';
      couponMsg.style.display = 'none';
    }
    if (code) {
      if (couponMsg) {
        couponMsg.textContent = `Coupon "${code}" applied! (Discount applied on WhatsApp)`;
        couponMsg.style.color = '#008080';
        couponMsg.style.display = 'block';
      }
    }
  });
}

// Customer Policy Modal Logic
const policyModal = document.getElementById('customer-policy-modal');
const policyLink = document.getElementById('policy-link');
const policyCloseBtn = document.getElementById('policy-modal-close-btn');
const policyAgreeBtn = document.getElementById('policy-modal-agree-btn');

if (policyLink && policyModal) {
  // policyLink navigates natively to customer.html in a new tab (via target="_blank")
}

if (policyCloseBtn && policyModal) {
  policyCloseBtn.addEventListener('click', () => {
    policyModal.classList.remove('active');
  });
}

if (policyAgreeBtn && policyModal) {
  policyAgreeBtn.addEventListener('click', () => {
    const agreeCheckbox = document.getElementById('booking-agree-policy');
    if (agreeCheckbox) {
      agreeCheckbox.checked = true;
    }
    policyModal.classList.remove('active');
  });
}

if (policyModal) {
  policyModal.addEventListener('click', (e) => {
    if (e.target === policyModal) {
      policyModal.classList.remove('active');
    }
  });
}

// Intercept click on all Book Appointment buttons
document.querySelectorAll('a[data-wa-link]').forEach(btn => {
  // Only intercept buttons that are styled to book appointments (excluding text links in topbar / footer)
  if (btn.classList.contains('pc-btn') || btn.classList.contains('nav-cta') || btn.classList.contains('btn-primary')) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      isPromoApplied = false;
      localStorage.setItem('cleanse_promo_applied', 'false');

      let planName = '';
      const card = btn.closest('.pricing-card');
      if (card) {
        let bedroomLabel = card.querySelector('.pc-label').textContent.trim();
        if (bedroomLabel === "4 Bedroom+") bedroomLabel = "4 Bedroom";
        const isMonthly = pricingCheckbox ? pricingCheckbox.checked : false;
        planName = `${bedroomLabel} — ${isMonthly ? 'Monthly Subscription (8 visits)' : 'Pay Per Visit'}`;
        openBookingModal(planName);
      } else {
        // Nav or Hero buttons open the modal with no plan selected, allowing choice
        openBookingModal("");
      }
    });
  }
});

if (bookingForm) {
  // Handle Form Submission
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Clear any previous submit validation message
    const step4Val = document.getElementById('step4-validation-msg');
    if (step4Val) step4Val.textContent = '';

    // Validate policy checkbox
    const agreeCheckbox = document.getElementById('booking-agree-policy');
    if (agreeCheckbox && !agreeCheckbox.checked) {
      if (step4Val) step4Val.textContent = "Please agree to the Customer Policy before submitting.";
      return;
    }

    // ─── Security: Honeypot check ───
    const honeypot = document.getElementById('booking-website');
    if (honeypot && honeypot.value) {
      // Bot detected — show fake success, don't actually send
      formContainer.style.display = 'none';
      successContainer.classList.add('active');
      document.getElementById('success-whatsapp-btn').href = '#';
      return;
    }

    // ─── Security: Timing guard ───
    if (_modalOpenTime && (Date.now() - _modalOpenTime < _sc.minFormTimeMs)) {
      if (step4Val) step4Val.textContent = 'Please take a moment to review your details before submitting.';
      return;
    }

    // ─── Security: Rate limiting ───
    if (!_checkRateLimit()) {
      if (step4Val) step4Val.textContent = "You've submitted multiple bookings recently. Please wait a few minutes before trying again.";
      return;
    }

    // Extract and sanitize values
    const selectedPlan = _sanitize(planInput.value, 100);
    const fullName = _sanitize(document.getElementById('booking-name').value, 100);
    const email = document.getElementById('booking-email').value.trim();
    const phone = document.getElementById('booking-phone').value.trim();
    const location = _sanitize(document.getElementById('booking-location').value, 200);

    const propertyTypeVal = document.getElementById('booking-property') ? document.getElementById('booking-property').value : 'Flat';
    const propertyType = selectedPlan.includes('Monthly Subscription')
      ? 'Monthly Subscription'
      : (_sanitize(propertyTypeVal, 50) || 'Flat');
    const preferredDate = _sanitize(document.getElementById('booking-date-display').value, 50);
    const schedule = _sanitize(document.getElementById('booking-schedule').value, 100);
    const visits = _sanitize(visitsSelect.value || 'Not selected', 100);
    const preferences = _sanitize(document.getElementById('booking-preferences').value || 'None', 1000);

    // ─── Security: Input validation ───
    if (fullName.length < 2) {
      if (step4Val) step4Val.textContent = 'Please enter a valid name (at least 2 characters).';
      return;
    }
    if (!_validateEmail(email)) {
      if (step4Val) step4Val.textContent = 'Please enter a valid email address.';
      return;
    }
    if (!_validatePhone(phone)) {
      if (step4Val) step4Val.textContent = 'Please enter a valid phone number (7-15 digits).';
      return;
    }

    const sanitizedPhone = phone.replace(/[^\d\s+\-()]/g, '');

    // Calculate pricing details dynamically
    const planPrices = {
      "1 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 7000 : 10000, type: "per-visit" },
      "1 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 35000 : 50000, type: "fixed" },
      "2 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 10000 : 15000, type: "per-visit" },
      "2 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 50000 : 80000, type: "fixed" },
      "3 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 15000 : 20000, type: "per-visit" },
      "3 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 70000 : 100000, type: "fixed" },
      "4 Bedroom — Pay Per Visit": { rate: isPromoApplied ? 20000 : 25000, type: "per-visit" },
      "4 Bedroom — Monthly Subscription (8 visits)": { rate: isPromoApplied ? 100000 : 150000, type: "fixed" }
    };

    const priceInfo = planPrices[selectedPlan];
    let priceDetailsText = "";
    let visitsText = visits;
    if (priceInfo) {
      if (priceInfo.type === "fixed") {
        const promoText = isPromoApplied ? " (Welcome Offer - 1st month only, then standard monthly pricing)" : "";
        priceDetailsText = `₦${priceInfo.rate.toLocaleString()} / month${promoText}`;
        visitsText = "8 visits per month";
      } else {
        let multiplier = 2; // default
        let ratePerVisit = priceInfo.rate;
        if (visits === "1 visit per month") {
          multiplier = 1;
        } else if (visits && visits.includes("2 visits")) {
          multiplier = 2;
        } else if (visits && visits.includes("4 visits")) {
          multiplier = 4;
        }

        const total = ratePerVisit * multiplier;
        priceDetailsText = `₦${ratePerVisit.toLocaleString()} / visit (Total: ₦${total.toLocaleString()} / month)`;
      }
    } else {
      priceDetailsText = "Custom Plan (pricing to be confirmed)";
    }

    // Construct WhatsApp message template
    let waMessage = `Hello cleanse.ng! I'd like to book a cleaning plan:\n\n`;
    if (isPromoApplied) {
      waMessage += `🎉 *[WELCOME OFFER APPLIED]*\n\n`;
    }
    waMessage += `• *Plan:* ${selectedPlan}\n` +
      `• *Visits per Month:* ${visitsText}\n` +
      `• *Pricing:* ${priceDetailsText}\n` +
      `• *Name:* ${fullName}\n` +
      `• *Email:* ${email}\n` +
      `• *Phone:* ${sanitizedPhone}\n` +
      `• *Home Address:* ${location}\n` +
      `• *Property Type:* ${propertyType}\n` +
      `• *Preferred Date:* ${preferredDate}\n` +
      `• *Preferred Schedule:* ${schedule}\n` +
      `• *Preferences:* ${preferences}`;

    const whatsappUrl = _getWaUrl(waMessage);

    // Set the WhatsApp link on the thank you page
    document.getElementById('success-whatsapp-btn').href = whatsappUrl;

    // Immediately open WhatsApp URL in a new window/tab
    window.open(whatsappUrl, '_blank');

    // Clear saved session state so a new booking starts fresh
    sessionStorage.removeItem('cleanse_booking_state');

    // Transition modal to success view
    transitionModalSize(() => {
      formContainer.style.display = 'none';
      successContainer.classList.add('active');
      const content = document.querySelector('.booking-modal-content');
      if (content) {
        content.classList.remove('verify-step-active');
        content.classList.remove('mobile-show-summary');
        content.classList.add('confirmed');
      }
    });
  });
}

// Custom Pricing Modal Logic for >4 Bedrooms
const customPricingLink = document.getElementById('custom-bedrooms-link');
const customModal = document.getElementById('custom-bedrooms-modal');
const customCloseBtn = document.getElementById('custom-modal-close-btn');
const customSubmitBtn = document.getElementById('custom-bedrooms-submit-btn');
const customInput = document.getElementById('custom-bedrooms-count');

if (customPricingLink) {
  customPricingLink.addEventListener('click', (e) => {
    e.preventDefault();
    customModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
}

if (customCloseBtn) {
  customCloseBtn.addEventListener('click', () => {
    customModal.classList.remove('active');
    document.body.style.overflow = '';
  });
}

// Close when clicking outside content
if (customModal) {
  customModal.addEventListener('click', (e) => {
    if (e.target === customModal) {
      customModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

if (customSubmitBtn) {
  customSubmitBtn.addEventListener('click', () => {
    const numRooms = _sanitize(customInput.value, 10).replace(/[^\d]/g, '');
    if (numRooms && numRooms.trim() !== "") {
      customModal.classList.remove('active');
      document.body.style.overflow = '';
      openBookingModal(`${numRooms} Bedrooms — Custom Plan`);
    }
  });
}

// Clear step3 / step4 validation errors on input changes
['booking-name', 'booking-email', 'booking-phone', 'booking-location', 'booking-agree-policy'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    const clearMsg = () => {
      const step3ValMsg = document.getElementById('step3-validation-msg');
      if (step3ValMsg) step3ValMsg.textContent = '';
      const step4ValMsg = document.getElementById('step4-validation-msg');
      if (step4ValMsg) step4ValMsg.textContent = '';
    };
    el.addEventListener('input', clearMsg);
    el.addEventListener('change', clearMsg);
  }
});

// ═══════════════════════════════════════
// UX ENHANCEMENTS & PERSISTENCE MODULE
// ═══════════════════════════════════════

function validateStep3Field(id, validatorFn, errorMsg) {
  const el = document.getElementById(id);
  if (!el) return false;
  const formGroup = el.closest('.form-group');
  if (!formGroup) return false;
  const errorEl = formGroup.querySelector('.field-error-msg');
  const val = el.value.trim();

  // Clear states
  formGroup.classList.remove('invalid', 'valid');
  if (errorEl) errorEl.textContent = '';

  if (el.required && !val) {
    formGroup.classList.add('invalid');
    if (errorEl) errorEl.textContent = 'This field is required.';
    return false;
  }

  if (val && validatorFn && !validatorFn(val)) {
    formGroup.classList.add('invalid');
    if (errorEl) errorEl.textContent = errorMsg;
    return false;
  }

  formGroup.classList.add('valid');
  return true;
}

function runRealtimeValidation() {
  const nameInput = document.getElementById('booking-name');
  const emailInput = document.getElementById('booking-email');
  const phoneInput = document.getElementById('booking-phone');
  const locationInput = document.getElementById('booking-location');

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      validateStep3Field('booking-name', (v) => v.length >= 2, 'Please enter at least 2 characters.');
    });
  }
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      validateStep3Field('booking-email', _validateEmail, 'Please enter a valid email address.');
    });
  }
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      validateStep3Field('booking-phone', _validatePhone, 'Please enter a valid phone number (7-15 digits).');
    });
  }
  if (locationInput) {
    locationInput.addEventListener('input', () => {
      validateStep3Field('booking-location', (v) => v.length > 0, 'This field is required.');
    });
  }
}

function saveSessionState() {
  const state = {
    plan: planInput.value || '',
    visits: visitsSelect.value || '',
    date: bookingDateInput.value || '',
    dateDisplay: document.getElementById('booking-date-display').value || '',
    schedule: bookingScheduleSelect.value || '',
    name: document.getElementById('booking-name').value || '',
    email: document.getElementById('booking-email').value || '',
    phone: document.getElementById('booking-phone').value || '',
    location: document.getElementById('booking-location').value || '',
    preferences: document.getElementById('booking-preferences').value || '',
    currentStep: _currentWizardStep || 1
  };
  sessionStorage.setItem('cleanse_booking_state', JSON.stringify(state));
}

function restoreSessionState(forcePlanName) {
  try {
    const raw = sessionStorage.getItem('cleanse_booking_state');
    if (!raw) return;
    const state = JSON.parse(raw);

    // Restore inputs
    if (state.name) document.getElementById('booking-name').value = state.name;
    if (state.email) document.getElementById('booking-email').value = state.email;
    if (state.phone) document.getElementById('booking-phone').value = state.phone;
    if (state.location) document.getElementById('booking-location').value = state.location;
    if (state.preferences) document.getElementById('booking-preferences').value = state.preferences;

    if (state.date) {
      bookingDateInput.value = state.date;
      const parts = state.date.split('-');
      if (parts.length === 3) {
        _selectedDateObject = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
    }
    if (state.dateDisplay) document.getElementById('booking-date-display').value = state.dateDisplay;
    if (state.schedule) bookingScheduleSelect.value = state.schedule;

    if (!forcePlanName) {
      if (state.plan) {
        let optionExists = Array.from(planInput.options).some(opt => opt.value === state.plan);
        if (!optionExists) {
          const tempOpt = document.createElement('option');
          tempOpt.value = state.plan;
          tempOpt.textContent = state.plan;
          planInput.appendChild(tempOpt);
        }
        planInput.value = state.plan;
      }
      if (state.visits) visitsSelect.value = state.visits;
      if (state.currentStep) _currentWizardStep = state.currentStep;
    } else {
      _currentWizardStep = forcePlanName.includes('Monthly Subscription') ? 2 : 1;
    }

    handlePlanChange();
    updateBookingSummary();
  } catch (e) {
    console.error('Error restoring session state:', e);
  }
}

function setupStep4InlineEditing() {
  const editPencil = document.getElementById('verify-edit-pencil');
  const viewState = document.getElementById('verify-customer-view-state');
  const editState = document.getElementById('verify-customer-edit-state');
  const inputName = document.getElementById('verify-input-name');
  const inputEmail = document.getElementById('verify-input-email');
  const saveBtn = document.getElementById('verify-save-btn');
  const cancelBtn = document.getElementById('verify-cancel-btn');

  if (editPencil && viewState && editState) {
    // Cloning to clear previous click listeners
    const newEditPencil = editPencil.cloneNode(true);
    editPencil.replaceWith(newEditPencil);

    newEditPencil.addEventListener('click', (e) => {
      e.preventDefault();
      viewState.style.display = 'none';
      editState.style.display = 'flex';
      if (inputName) inputName.value = document.getElementById('booking-name').value;
      if (inputEmail) inputEmail.value = document.getElementById('booking-email').value;
    });
  }

  if (saveBtn && viewState && editState) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();

      const nameVal = inputName.value.trim();
      const emailVal = inputEmail.value.trim();
      let isValid = true;

      inputName.classList.remove('invalid');
      inputEmail.classList.remove('invalid');

      if (nameVal.length < 2) {
        inputName.classList.add('invalid');
        isValid = false;
      }
      if (!_validateEmail(emailVal)) {
        inputEmail.classList.add('invalid');
        isValid = false;
      }

      if (!isValid) return;

      document.getElementById('booking-name').value = nameVal;
      document.getElementById('booking-email').value = emailVal;

      saveSessionState();
      updateVerifyStepDetails();

      viewState.style.display = 'flex';
      editState.style.display = 'none';
    });
  }

  if (cancelBtn && viewState && editState) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      viewState.style.display = 'flex';
      editState.style.display = 'none';
    });
  }
}

// Safari/iOS outside-form submit workaround
function setupSafariFormSubmitWorkaround() {
  const mobileConfirmBtn = document.querySelector('.mobile-confirm-btn');
  if (mobileConfirmBtn) {
    mobileConfirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const bookingForm = document.getElementById('booking-plan-form');
      if (bookingForm) {
        const step4Val = document.getElementById('step4-validation-msg');
        if (step4Val) step4Val.textContent = '';

        if (typeof bookingForm.requestSubmit === 'function') {
          bookingForm.requestSubmit();
        } else {
          const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
          bookingForm.dispatchEvent(submitEvent);
        }
      }
    });
  }
}

// Initialize all features on load
window.addEventListener('DOMContentLoaded', () => {
  runRealtimeValidation();
  setupStep4InlineEditing();
  setupSafariFormSubmitWorkaround();
  restoreSessionState();

  // Initialize testimonial slider & fetch Google Sheet data
  initTestimonialSlider();
  syncBookingsFromSpreadsheet();
  syncTestimonialsFromSpreadsheet();

  // Periodically fetch updates every 5 minutes (300,000 ms)
  setInterval(() => {
    syncBookingsFromSpreadsheet();
    syncTestimonialsFromSpreadsheet();
  }, 300000);

  // Watch inputs for autosave
  const persistFields = [
    'booking-selected-plan', 'booking-visits', 'booking-date',
    'booking-date-display', 'booking-schedule', 'booking-name',
    'booking-email', 'booking-phone', 'booking-location',
    'booking-preferences'
  ];
  persistFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', saveSessionState);
      el.addEventListener('change', saveSessionState);
    }
  });
});


// Waitlist Modal logic
const waitlistModal = document.getElementById('waitlist-modal');
const waitlistCloseBtn = document.getElementById('waitlist-modal-close-btn');
const waitlistSuccessCloseBtn = document.getElementById('waitlist-success-close-btn');
const waitlistFormContainer = document.getElementById('waitlist-form-container');
const waitlistSuccessContainer = document.getElementById('waitlist-success-container');
const waitlistForm = document.getElementById('waitlist-form');

const waitlistAreaSelect = document.getElementById('waitlist-area');
const waitlistAreaOtherInput = document.getElementById('waitlist-area-other');

let _waitlistModalOpenTime = 0;

function openWaitlistModal() {
  _waitlistModalOpenTime = Date.now();
  if (waitlistFormContainer) waitlistFormContainer.style.display = 'flex';
  if (waitlistSuccessContainer) {
    waitlistSuccessContainer.style.display = 'none';
    waitlistSuccessContainer.classList.remove('active');
  }
  if (waitlistAreaSelect && waitlistAreaOtherInput) {
    waitlistAreaSelect.style.display = 'block';
    waitlistAreaSelect.value = '';
    waitlistAreaOtherInput.style.display = 'none';
    waitlistAreaOtherInput.value = '';
    waitlistAreaOtherInput.required = false;
  }
  if (waitlistModal) {
    waitlistModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeWaitlistModal() {
  if (waitlistModal) {
    waitlistModal.classList.remove('active');
    document.body.style.overflow = '';
  }
  sessionStorage.setItem('waitlist_popup_dismissed', 'true');
}

if (waitlistCloseBtn) waitlistCloseBtn.addEventListener('click', closeWaitlistModal);
if (waitlistSuccessCloseBtn) waitlistSuccessCloseBtn.addEventListener('click', closeWaitlistModal);

if (waitlistModal) {
  waitlistModal.addEventListener('click', (e) => {
    if (e.target === waitlistModal) {
      closeWaitlistModal();
    }
  });
}

if (waitlistAreaSelect && waitlistAreaOtherInput) {
  waitlistAreaSelect.addEventListener('change', () => {
    if (waitlistAreaSelect.value === 'Other') {
      waitlistAreaSelect.style.display = 'none';
      waitlistAreaOtherInput.style.display = 'block';
      waitlistAreaOtherInput.required = true;
      waitlistAreaOtherInput.focus();
    }
  });
}

if (waitlistForm) {
  waitlistForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const valMsg = document.getElementById('waitlist-validation-msg');
    if (valMsg) valMsg.textContent = '';

    const honeypot = document.getElementById('waitlist-website');
    if (honeypot && honeypot.value) {
      // Bot detected
      if (waitlistFormContainer) waitlistFormContainer.style.display = 'none';
      if (waitlistSuccessContainer) {
        waitlistSuccessContainer.style.display = 'flex';
        waitlistSuccessContainer.classList.add('active');
      }
      return;
    }

    if (_waitlistModalOpenTime && (Date.now() - _waitlistModalOpenTime < 2000)) {
      if (valMsg) valMsg.textContent = 'Please take a moment to review your details before submitting.';
      return;
    }

    const name = _sanitize(document.getElementById('waitlist-name').value, 100);
    const phone = document.getElementById('waitlist-phone').value.trim();
    
    let area = "";
    if (waitlistAreaSelect && waitlistAreaSelect.style.display === 'none' && waitlistAreaOtherInput) {
      area = _sanitize(waitlistAreaOtherInput.value, 100);
    } else if (waitlistAreaSelect) {
      area = _sanitize(waitlistAreaSelect.value, 100);
    }

    if (name.length < 2) {
      if (valMsg) valMsg.textContent = 'Please enter a valid name (at least 2 characters).';
      return;
    }
    if (!_validatePhone(phone)) {
      if (valMsg) valMsg.textContent = 'Please enter a valid phone number (7-15 digits).';
      return;
    }
    if (!area || area.trim() === "") {
      if (valMsg) valMsg.textContent = 'Please specify your estate / area.';
      return;
    }

    // Save to local storage
    const waitlist = JSON.parse(localStorage.getItem('cleanse_waitlist_signups') || '[]');
    waitlist.push({ name, phone, area, timestamp: new Date().toISOString() });
    localStorage.setItem('cleanse_waitlist_signups', JSON.stringify(waitlist));

    sessionStorage.setItem('waitlist_popup_dismissed', 'true');
    if (waitlistFormContainer) waitlistFormContainer.style.display = 'none';
    if (waitlistSuccessContainer) {
      waitlistSuccessContainer.style.display = 'flex';
      waitlistSuccessContainer.classList.add('active');
    }
  });
}

// Clear waitlist validation errors on input changes
['waitlist-name', 'waitlist-phone', 'waitlist-area', 'waitlist-area-other'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    const clearMsg = () => {
      const valMsg = document.getElementById('waitlist-validation-msg');
      if (valMsg) valMsg.textContent = '';
    };
    el.addEventListener('input', clearMsg);
    el.addEventListener('change', clearMsg);
  }
});

// Promotional Modal Logic for First-Time Users
let selectedPromoType = 'monthly';

window.addEventListener('DOMContentLoaded', () => {
  const promoModal = document.getElementById('promo-modal');
  const optOnetime = document.getElementById('promo-opt-onetime');
  const optMonthly = document.getElementById('promo-opt-monthly');

  if (optOnetime && optMonthly) {
    optOnetime.addEventListener('click', () => {
      selectedPromoType = 'onetime';
      optOnetime.style.border = '3px solid var(--deep-purple)';
      optOnetime.style.boxShadow = '4px 4px 0px var(--deep-purple)';
      optOnetime.querySelector('span').style.color = 'var(--deep-purple)';

      optMonthly.style.border = '2px solid var(--border)';
      optMonthly.style.boxShadow = 'none';
      optMonthly.querySelector('span').style.color = 'var(--mid-gray)';
    });

    optMonthly.addEventListener('click', () => {
      selectedPromoType = 'monthly';
      optMonthly.style.border = '3px solid var(--deep-purple)';
      optMonthly.style.boxShadow = '4px 4px 0px var(--deep-purple)';
      optMonthly.querySelector('span').style.color = 'var(--deep-purple)';

      optOnetime.style.border = '2px solid var(--border)';
      optOnetime.style.boxShadow = 'none';
      optOnetime.querySelector('span').style.color = 'var(--mid-gray)';
    });
  }
  const promoClaimBtn = document.getElementById('promo-claim-btn');
  const promoDeclineBtn = document.getElementById('promo-decline-btn');
  const promoCloseBtn = document.getElementById('promo-close-btn');

  // Check if user has already seen/dismissed the promo
  const hasSeenPromo = localStorage.getItem('cleanse_promo_dismissed');

  if (!hasSeenPromo && promoModal) {
    // Show after 1.5 seconds delay
    setTimeout(() => {
      promoModal.style.display = 'flex';
      promoModal.classList.add('active');
    }, 1500);
  }

  function dismissPromo(claim) {
    if (promoModal) {
      promoModal.style.display = 'none';
      promoModal.classList.remove('active');
    }
    localStorage.setItem('cleanse_promo_dismissed', 'true');
    if (claim) {
      isPromoApplied = true;
      localStorage.setItem('cleanse_promo_applied', 'true');
      
      // Update homepage pricing cards and booking steps instantly
      const pricingCheckbox = document.getElementById('pricing-toggle-checkbox');
      const isMonthly = pricingCheckbox ? pricingCheckbox.checked : false;
      updatePricing(isMonthly);
      updateFrequencyCards();
      updateBookingSummary();

      // Automatically launch the booking modal at Step 1 (Size selection)
      // Since isPromoApplied is true and selectedPromoType is set, it will auto-default
      // to the correct plan type (Monthly Subscription or Pay Per Visit) on Step 2.
      openBookingModal("");
    }
  }

  if (promoClaimBtn) {
    promoClaimBtn.addEventListener('click', () => dismissPromo(true));
  }
  if (promoCloseBtn) {
    promoCloseBtn.addEventListener('click', () => dismissPromo(false));
  }

  // Close promo modal when clicking outside the card content (backdrop click)
  if (promoModal) {
    promoModal.addEventListener('click', (e) => {
      if (e.target === promoModal) {
        dismissPromo(false);
      }
    });
  }

  const triggerPromoBtn = document.getElementById('trigger-promo-btn');
  if (triggerPromoBtn) {
    triggerPromoBtn.addEventListener('click', () => {
      if (promoModal) {
        promoModal.style.display = 'flex';
        promoModal.classList.add('active');
      }
    });
  }
});

