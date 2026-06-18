// ═══════════════════════════════════════
// CLONE & SECURITY PROTECTION
// ═══════════════════════════════════════
(function() {
  var allowed = ['cleanse.ng', 'localhost', '127.0.0.1', '::1'];
  var isLocal = window.location.protocol === 'file:';
  var host = window.location.hostname;
  var isAllowed = allowed.some(function(d) { return host === d || host.endsWith('.' + d); });
  if (isLocal || (host && !isAllowed)) {
    document.documentElement.style.display = 'none';
    window.location.href = 'https://cleanse.ng';
    return;
  }
})();

// Disable Context Menu (Right Click)
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
});

// Disable common save / view-source keyboard shortcuts
document.addEventListener('keydown', function(e) {
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
  return _sc._p.map(function(p) { return atob(p); }).join('');
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
    submissions = submissions.filter(function(t) { return now - t < _sc.windowMs; });
    if (submissions.length >= _sc.maxSubmissions) return false;
    submissions.push(now);
    sessionStorage.setItem('_cl_subs', JSON.stringify(submissions));
    return true;
  } catch(e) { return true; }
}

var _modalOpenTime = 0;

// Initialize all obfuscated WhatsApp links at runtime
document.querySelectorAll('[data-wa-link]').forEach(function(el) {
  el.href = _getWaUrl();
});

// Testimonial slider
const slides = document.querySelectorAll('.testimonial-slide');
const dots = document.querySelectorAll('.t-dot');
let current = 0;

function showSlide(n) {
  if (slides.length === 0 || dots.length === 0) return;
  slides[current].classList.remove('active');
  dots[current].classList.remove('active');
  current = (n + slides.length) % slides.length;
  slides[current].classList.add('active');
  dots[current].classList.add('active');
}

const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
if (nextBtn) nextBtn.addEventListener('click', () => showSlide(current + 1));
if (prevBtn) prevBtn.addEventListener('click', () => showSlide(current - 1));
dots.forEach(dot => dot.addEventListener('click', () => showSlide(+dot.dataset.index)));

if (slides.length > 0) {
  setInterval(() => showSlide(current + 1), 6000);
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

const pricingData = {
  oneTime: [
    { primary: '₦9,999', unit: ' / visit', secondary: '₦60,000 / month (8 visits)', rawPrice: 9999, monthlyPrice: 60000 },
    { primary: '₦11,999', unit: ' / visit', secondary: '₦100,000 / month (8 visits)', rawPrice: 11999, monthlyPrice: 100000 },
    { primary: '₦13,999', unit: ' / visit', secondary: '₦150,000 / month (8 visits)', rawPrice: 13999, monthlyPrice: 150000 },
    { primary: '₦19,999', unit: ' / visit', secondary: '₦200,000 / month (8 visits)', rawPrice: 19999, monthlyPrice: 200000 }
  ],
  monthly: [
    { primary: '₦60,000', unit: ' / month', secondary: '₦9,999 / visit' },
    { primary: '₦100,000', unit: ' / month', secondary: '₦11,999 / visit' },
    { primary: '₦150,000', unit: ' / month', secondary: '₦13,999 / visit' },
    { primary: '₦200,000', unit: ' / month', secondary: '₦19,999 / visit' }
  ]
};

const primaryPriceElements = document.querySelectorAll('.pc-price-primary .price-val');
const primaryUnitElements = document.querySelectorAll('.pc-price-primary .price-unit');
const secondaryPriceElements = document.querySelectorAll('.pc-price-secondary');
const savingsElements = document.querySelectorAll('.pc-savings');

function updatePricing(isMonthly) {
  const data = isMonthly ? pricingData.monthly : pricingData.oneTime;
  
  primaryPriceElements.forEach((el, index) => {
    el.textContent = data[index].primary;
  });
  
  primaryUnitElements.forEach((el, index) => {
    el.textContent = data[index].unit;
  });

  secondaryPriceElements.forEach((el, index) => {
    el.textContent = data[index].secondary;
  });

  savingsElements.forEach((el, index) => {
    const item = pricingData.oneTime[index];
    const oneTimeTotal = item.rawPrice * 8;
    const monthlyTotal = item.monthlyPrice;
    const difference = oneTimeTotal - monthlyTotal;
    
    if (isMonthly) {
      if (difference > 0) {
        el.textContent = `Saves ₦${difference.toLocaleString()}/mo`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      } else if (difference < 0) {
        const savings = Math.abs(difference);
        el.textContent = `Saves ₦${savings.toLocaleString()}/mo`;
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
    { value: "2pm - 4pm", text: "2pm - 4pm" },
    { value: "4pm - 6pm", text: "4pm - 6pm" }
  ]
};

const bookingSchedulePillsContainer = document.getElementById('booking-schedule-pills');
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
  if (!selectedPlan || selectedPlan.includes('Monthly Subscription') || selectedPlan.includes('Custom Plan')) {
    if (frequencySection) frequencySection.style.display = 'none';
    visitsSelect.required = false;
    return;
  }
  
  if (frequencySection) frequencySection.style.display = 'block';
  visitsSelect.required = true;
  
  // Determine base rate based on selected plan
  let baseRate = 9999;
  if (selectedPlan.includes('2 Bedroom')) baseRate = 11999;
  else if (selectedPlan.includes('3 Bedroom')) baseRate = 13999;
  else if (selectedPlan.includes('4 Bedroom')) baseRate = 19999;
  
  // Parse room size name
  let bedrooms = "1 Bedroom";
  if (selectedPlan.includes("2 Bedroom")) bedrooms = "2 Bedroom";
  else if (selectedPlan.includes("3 Bedroom")) bedrooms = "3 Bedroom";
  else if (selectedPlan.includes("4 Bedroom")) bedrooms = "4 Bedroom";
  
  const frequencies = [
    {
      value: '1 visit per month',
      title: 'Once monthly',
      subtitle: '1 visit / month (touch-ups)',
      rate: baseRate,
      multiplier: 1
    },
    {
      value: '2 visits per month (Twice monthly)',
      title: 'Twice monthly',
      subtitle: '2 visits / month (Saves ₦800/visit)',
      rate: baseRate - 800,
      multiplier: 2
    },
    {
      value: '4 visits per month (4 times monthly)',
      title: 'Weekly',
      subtitle: '4 visits / month (Saves ₦1,600/visit)',
      rate: baseRate - 1600,
      multiplier: 4
    }
  ];
  
  // Default to 1 visit if nothing selected yet
  if (!visitsSelect.value) {
    visitsSelect.value = '1 visit per month';
  }
  
  frequencies.forEach(freq => {
    const totalCost = freq.rate * freq.multiplier;
    const card = document.createElement('div');
    card.className = 'frequency-card';
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
      <span class="frequency-card-price">₦${totalCost.toLocaleString()}</span>
    `;
    
    card.addEventListener('click', () => {
      frequencyCardsContainer.querySelectorAll('.frequency-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      visitsSelect.value = freq.value;
      const step1ValMsg = document.getElementById('step1-validation-msg');
      if (step1ValMsg) step1ValMsg.textContent = '';
      updateBookingSummary();
    });
    
    frequencyCardsContainer.appendChild(card);
  });
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
    "1 Bedroom — Pay Per Visit": { rate: 9999, type: "per-visit" },
    "1 Bedroom — Monthly Subscription (8 visits)": { rate: 60000, type: "fixed" },
    "2 Bedroom — Pay Per Visit": { rate: 11999, type: "per-visit" },
    "2 Bedroom — Monthly Subscription (8 visits)": { rate: 100000, type: "fixed" },
    "3 Bedroom — Pay Per Visit": { rate: 13999, type: "per-visit" },
    "3 Bedroom — Monthly Subscription (8 visits)": { rate: 150000, type: "fixed" },
    "4 Bedroom — Pay Per Visit": { rate: 19999, type: "per-visit" },
    "4 Bedroom — Monthly Subscription (8 visits)": { rate: 200000, type: "fixed" }
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
        ratePerVisit = priceInfo.rate - 800;
        freqLabel = "(Twice monthly)";
      } else if (visits && (visits.includes("4 visits") || visits.includes("Weekly"))) {
        multiplier = 4;
        ratePerVisit = priceInfo.rate - 1600;
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

  if (_currentWizardStep === 1) {
    wizardStepPlan.classList.add('active');
    pStep1.classList.add('active');
    
    if (wizardTitle) wizardTitle.textContent = "Select a Service";
    if (wizardSubtitle) wizardSubtitle.textContent = "";

    if (standardSummary) standardSummary.style.display = 'flex';
    if (verifySummary) verifySummary.style.display = 'none';
    if (modalLeft) modalLeft.style.background = '';
    document.querySelector('.booking-modal-content').classList.remove('mobile-show-summary');
    
    wizardBackBtn.style.visibility = 'visible'; // Back button on step 1 to close modal
    wizardNextBtn.style.display = 'block';
    bookingSubmitBtn.style.display = 'none';
  } else if (_currentWizardStep === 2) {
    wizardStepSchedule.classList.add('active');
    pStep1.classList.add('completed');
    pDiv1.style.background = 'var(--neon-green)';
    pStep2.classList.add('active');

    if (wizardTitle) wizardTitle.textContent = "Select Date & Time";
    if (wizardSubtitle) wizardSubtitle.textContent = "Choose when you'd like our team to arrive.";

    if (standardSummary) standardSummary.style.display = 'flex';
    if (verifySummary) verifySummary.style.display = 'none';
    if (modalLeft) modalLeft.style.background = '';
    document.querySelector('.booking-modal-content').classList.remove('mobile-show-summary');

    wizardBackBtn.style.visibility = 'visible';
    wizardNextBtn.style.display = 'block';
    bookingSubmitBtn.style.display = 'none';
  } else if (_currentWizardStep === 3) {
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
    if (modalLeft) modalLeft.style.background = '';
    document.querySelector('.booking-modal-content').classList.remove('mobile-show-summary');

    wizardBackBtn.style.visibility = 'visible';
    wizardNextBtn.style.display = 'block';
    bookingSubmitBtn.style.display = 'none';
  } else if (_currentWizardStep === 4) {
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
    document.querySelector('.booking-modal-content').classList.add('mobile-show-summary');

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
    "1 Bedroom — Pay Per Visit": { rate: 9999, type: "per-visit" },
    "1 Bedroom — Monthly Subscription (8 visits)": { rate: 60000, type: "fixed" },
    "2 Bedroom — Pay Per Visit": { rate: 11999, type: "per-visit" },
    "2 Bedroom — Monthly Subscription (8 visits)": { rate: 100000, type: "fixed" },
    "3 Bedroom — Pay Per Visit": { rate: 13999, type: "per-visit" },
    "3 Bedroom — Monthly Subscription (8 visits)": { rate: 150000, type: "fixed" },
    "4 Bedroom — Pay Per Visit": { rate: 19999, type: "per-visit" },
    "4 Bedroom — Monthly Subscription (8 visits)": { rate: 200000, type: "fixed" }
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
        ratePerVisit = priceInfo.rate - 800;
      } else if (visits && (visits.includes("4 visits") || visits.includes("Weekly"))) {
        multiplier = 4;
        ratePerVisit = priceInfo.rate - 1600;
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
let bookedSlots = {
  "2026-06-25": ["8am - 11am"], // 1 slot booked -> Orange underline, disables 8am-11am
  "2026-06-26": ["8am - 11am", "11am - 2pm", "2pm - 5pm"] // 3 slots booked -> Red underline, disabled day
};

// Google Sheet ID for manual booking sync
const GOOGLE_SHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; 

async function syncBookingsFromSpreadsheet() {
  if (!GOOGLE_SHEET_ID || GOOGLE_SHEET_ID.includes("YOUR_SPREADSHEET_ID")) {
    console.log("No Google Sheet ID configured. Using local/fallback bookedSlots data.");
    return;
  }

  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv`;
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
      const slotVal = cols[1]; // e.g. "8am - 11am"
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
    const maxSlots = isCellSunday ? 2 : 3;
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
  
  // Clear previously selected dates, display, and policy checkbox
  bookingDateInput.value = "";
  document.getElementById('booking-date-display').value = "";
  const slotsContainer = document.getElementById('schedule-slots-container');
  if (slotsContainer) slotsContainer.style.display = 'none';
  
  const agreeCheckbox = document.getElementById('booking-agree-policy');
  if (agreeCheckbox) agreeCheckbox.checked = false;
  
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
    content.style.height = 'auto';
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
    if (planName.includes('Monthly Subscription') || planName.includes('Custom Plan')) {
      _currentWizardStep = 2; // Skip step 1 (Plan Selection)
    } else {
      _currentWizardStep = 1; // Pay-Per-Visit must select frequency
    }
  } else {
    planInput.value = "2 Bedroom — Pay Per Visit"; // Default
    _isPlanPreSelected = false;
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
  
  if (planName.includes('Monthly Subscription')) {
    visitsSelect.value = "8 visits per month (2x per week)";
    
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
    1: wizardStepPlan,
    2: wizardStepSchedule,
    3: wizardStepContact,
    4: wizardStepVerifyLeft
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
      if (!planInput.checkValidity()) {
        planInput.reportValidity();
        return;
      }
      if (!planInput.value.includes('Monthly Subscription') && !visitsSelect.value) {
        const step1ValMsg = document.getElementById('step1-validation-msg');
        if (step1ValMsg) step1ValMsg.textContent = "Please select a frequency option.";
        return;
      }
      const propSelect = document.getElementById('booking-property');
      if (propSelect && propSelect.required && !propSelect.value) {
        propSelect.reportValidity();
        return;
      }
      
      changeWizardStep(2, 'next');
    } else if (_currentWizardStep === 2) {
      // Validate date selected
      const dateVal = bookingDateInput.value;
      if (!dateVal) {
        const step2ValMsg = document.getElementById('step2-validation-msg');
        if (step2ValMsg) step2ValMsg.textContent = "Please select a preferred date on the calendar.";
        return;
      }
      
      // Safety block for same-day
      const selectedD = new Date(dateVal);
      selectedD.setHours(0,0,0,0);
      const todayD = new Date();
      todayD.setHours(0,0,0,0);
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
      
      changeWizardStep(3, 'next');
    } else if (_currentWizardStep === 3) {
      // Validate step 3 fields: Name, Email, Phone, Location
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

      changeWizardStep(4, 'next');
    }
  });
}

if (wizardBackBtn) {
  wizardBackBtn.addEventListener('click', () => {
    if (_currentWizardStep === 1) {
      closeBookingModal();
    } else {
      const minStep = _isPlanPreSelected && (planInput.value.includes('Monthly Subscription') || planInput.value.includes('Custom Plan')) ? 2 : 1;
      if (_currentWizardStep > minStep) {
        changeWizardStep(_currentWizardStep - 1, 'back');
      }
    }
  });
}

if (planInput) {
  planInput.addEventListener('change', handlePlanChange);
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
  policyLink.addEventListener('click', (e) => {
    e.preventDefault();
    policyModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
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
      
      let planName = '';
      const card = btn.closest('.pricing-card');
      if (card) {
        const bedroomLabel = card.querySelector('.pc-label').textContent.trim();
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
      "1 Bedroom — Pay Per Visit": { rate: 9999, type: "per-visit" },
      "1 Bedroom — Monthly Subscription (8 visits)": { rate: 60000, type: "fixed" },
      "2 Bedroom — Pay Per Visit": { rate: 11999, type: "per-visit" },
      "2 Bedroom — Monthly Subscription (8 visits)": { rate: 100000, type: "fixed" },
      "3 Bedroom — Pay Per Visit": { rate: 13999, type: "per-visit" },
      "3 Bedroom — Monthly Subscription (8 visits)": { rate: 150000, type: "fixed" },
      "4 Bedroom — Pay Per Visit": { rate: 19999, type: "per-visit" },
      "4 Bedroom — Monthly Subscription (8 visits)": { rate: 200000, type: "fixed" }
    };

    const priceInfo = planPrices[selectedPlan];
    let priceDetailsText = "";
    let visitsText = visits;
    if (priceInfo) {
      if (priceInfo.type === "fixed") {
        priceDetailsText = `₦${priceInfo.rate.toLocaleString()} / month`;
        visitsText = "8 visits per month";
      } else {
        let multiplier = 2; // default
        let ratePerVisit = priceInfo.rate;
        if (visits === "1 visit per month") {
          multiplier = 1;
        } else if (visits && visits.includes("2 visits")) {
          multiplier = 2;
          ratePerVisit = priceInfo.rate - 800;
        } else if (visits && visits.includes("4 visits")) {
          multiplier = 4;
          ratePerVisit = priceInfo.rate - 1600;
        }
        
        const total = ratePerVisit * multiplier;
        priceDetailsText = `₦${ratePerVisit.toLocaleString()} / visit (Total: ₦${total.toLocaleString()} / month)`;
      }
    } else {
      priceDetailsText = "Custom Plan (pricing to be confirmed)";
    }
    
    // Construct WhatsApp message template
    const waMessage = `Hello cleanse.ng! I'd like to book a cleaning plan:\n\n` +
                      `• *Plan:* ${selectedPlan}\n` +
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
    
    // Transition modal to success view
    transitionModalSize(() => {
      formContainer.style.display = 'none';
      successContainer.classList.add('active');
      const content = document.querySelector('.booking-modal-content');
      if (content) {
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

// Discount Modal logic
const discountModal = document.getElementById('discount-modal');
const discountCloseBtn = document.getElementById('discount-modal-close-btn');
const discountSuccessCloseBtn = document.getElementById('discount-success-close-btn');
const discountFormContainer = document.getElementById('discount-form-container');
const discountSuccessContainer = document.getElementById('discount-success-container');
const discountForm = document.getElementById('discount-form');
const discountBirthdayInput = document.getElementById('discount-birthday');
const discountBirthdayDisplay = document.getElementById('discount-birthday-display');

let _discountModalOpenTime = 0;

function openDiscountModal() {
  _discountModalOpenTime = Date.now();
  discountFormContainer.style.display = 'flex';
  discountSuccessContainer.classList.remove('active');
  discountModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDiscountModal() {
  discountModal.classList.remove('active');
  document.body.style.overflow = '';
  localStorage.setItem('discount_popup_dismissed', 'true');
}

if (discountCloseBtn) discountCloseBtn.addEventListener('click', closeDiscountModal);
if (discountSuccessCloseBtn) discountSuccessCloseBtn.addEventListener('click', closeDiscountModal);

if (discountModal) {
  discountModal.addEventListener('click', (e) => {
    if (e.target === discountModal) {
      closeDiscountModal();
    }
  });
}

if (discountBirthdayInput) {
  // Set max date to today
  const bToday = new Date();
  const bYyyy = bToday.getFullYear();
  const bMm = String(bToday.getMonth() + 1).padStart(2, '0');
  const bDd = String(bToday.getDate()).padStart(2, '0');
  discountBirthdayInput.max = `${bYyyy}-${bMm}-${bDd}`;

  discountBirthdayInput.addEventListener('click', () => {
    try {
      discountBirthdayInput.showPicker();
    } catch (err) {
      console.log("showPicker failed: ", err);
    }
  });

  discountBirthdayInput.addEventListener('change', () => {
    if (!discountBirthdayInput.value) {
      discountBirthdayDisplay.value = "";
      return;
    }
    const parts = discountBirthdayInput.value.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const formatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    discountBirthdayDisplay.value = formatted;
  });
}

if (discountForm) {
  discountForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const discValMsg = document.getElementById('discount-validation-msg');
    if (discValMsg) discValMsg.textContent = '';
    
    const honeypot = document.getElementById('discount-website');
    if (honeypot && honeypot.value) {
      discountFormContainer.style.display = 'none';
      discountSuccessContainer.classList.add('active');
      return;
    }

    if (_discountModalOpenTime && (Date.now() - _discountModalOpenTime < 2000)) {
      if (discValMsg) discValMsg.textContent = 'Please take a moment to review your details before submitting.';
      return;
    }

    const name = _sanitize(document.getElementById('discount-name').value, 100);
    const email = document.getElementById('discount-email').value.trim();
    const birthday = _sanitize(discountBirthdayDisplay.value, 100);
    const location = _sanitize(document.getElementById('discount-location').value, 100);

    if (name.length < 2) {
      if (discValMsg) discValMsg.textContent = 'Please enter a valid name (at least 2 characters).';
      return;
    }
    if (!_validateEmail(email)) {
      if (discValMsg) discValMsg.textContent = 'Please enter a valid email address.';
      return;
    }

    localStorage.setItem('discount_popup_dismissed', 'true');
    discountFormContainer.style.display = 'none';
    discountSuccessContainer.classList.add('active');
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

// Clear discount validation errors on input changes
['discount-name', 'discount-email', 'discount-birthday', 'discount-location'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    const clearMsg = () => {
      const discValMsg = document.getElementById('discount-validation-msg');
      if (discValMsg) discValMsg.textContent = '';
    };
    el.addEventListener('input', clearMsg);
    el.addEventListener('change', clearMsg);
  }
});

// Automatically open discount modal on page load for all screen sizes
window.addEventListener('DOMContentLoaded', () => {
  syncBookingsFromSpreadsheet();

  if (localStorage.getItem('discount_popup_dismissed') === 'true') {
    return;
  }

  let popupOpened = false;
  function triggerPopup() {
    if (popupOpened) return;
    popupOpened = true;
    if (discountModal && !discountModal.classList.contains('active') && modal && !modal.classList.contains('active')) {
      openDiscountModal();
    }
    window.removeEventListener('scroll', handleScrollTrigger);
  }

  // Trigger on scroll past 20% page height
  function handleScrollTrigger() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0 && (scrollTop / docHeight) >= 0.20) {
      triggerPopup();
    }
  }

  window.addEventListener('scroll', handleScrollTrigger);

  // Backup timer: trigger after 5 seconds
  setTimeout(triggerPopup, 5000);
});
