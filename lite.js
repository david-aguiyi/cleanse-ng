/* ═══════════════════════════════════════════════════════════════════
   CLEANSE LITE — JAVASCRIPT MODULE (UPDATED WITH BACKEND SYNC)
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  // ── SECURITY & WHATSAPP OBFUSCATION ──
  const _sc = {
    _p: ['MjM0', 'OTEzMDY2', 'MzczOQ==']
  };

  function getWaNum() {
    return _sc._p.map(p => atob(p)).join('');
  }

  function openWaMessage(text) {
    const num = getWaNum();
    const url = 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ── BACKEND GOOGLE SHEET & SCRIPT INTEGRATION ──
  const GOOGLE_SHEET_ID = "14IMdMV4R_SsgJ2fQ6JmDOpGZynSgCZt4Z31QaGRzD7M";
  const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxwufAH1eCu-hSD5OZogSqG7NRI053CyQyRU4x5pMt7To_bQpY_LKHrtOfZiRj2-C42JA/exec";
  let bookedSlots = {}; // { '2026-08-25': ['8am - 11am'] }

  function getScriptUrl() {
    return localStorage.getItem('cleanse_script_url') || DEFAULT_SCRIPT_URL;
  }

  async function syncBookingsFromSpreadsheet() {
    if (!GOOGLE_SHEET_ID) return;
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&t=${Date.now()}`;
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const csvText = await response.text();
      parseSpreadsheetCSV(csvText);
      renderCalendar();
    } catch (err) {
      console.log("Using local calendar state:", err);
    }
  }

  function parseSpreadsheetCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length <= 1) return;
    bookedSlots = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const cols = line.split(',').map(cell => cell.replace(/^["']|["']$/g, '').trim());
      if (cols.length >= 2) {
        const dateVal = cols[0];
        const slotVal = cols[1];
        const statusVal = cols[2] ? cols[2].toLowerCase() : "";
        if (dateVal && (statusVal === "booked" || statusVal === "yes" || statusVal === "")) {
          const normalizedDate = dateVal.replace(/\//g, '-');
          if (!bookedSlots[normalizedDate]) bookedSlots[normalizedDate] = [];
          bookedSlots[normalizedDate].push(slotVal.toLowerCase());
        }
      }
    }
  }

  // ── TESTIMONIALS CAROUSEL ──
  let currentSlide = 0;
  let autoSlideTimer = null;
  const slideTrack = document.getElementById('lite-testimonial-track');
  const slides = document.querySelectorAll('.lite-carousel-slide');
  const dotsContainer = document.getElementById('lite-carousel-dots');
  const prevBtn = document.getElementById('lite-carousel-prev');
  const nextBtn = document.getElementById('lite-carousel-next');

  function initCarousel() {
    if (!slideTrack || slides.length === 0) return;
    dotsContainer.innerHTML = '';
    slides.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = 'lite-carousel-dot' + (idx === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
      dot.addEventListener('click', () => goToSlide(idx));
      dotsContainer.appendChild(dot);
    });

    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));
    startAutoSlide();

    const carouselSection = document.querySelector('.lite-testimonials-section');
    if (carouselSection) {
      carouselSection.addEventListener('mouseenter', stopAutoSlide);
      carouselSection.addEventListener('mouseleave', startAutoSlide);
    }
  }

  function goToSlide(idx) {
    if (slides.length === 0) return;
    if (idx < 0) currentSlide = slides.length - 1;
    else if (idx >= slides.length) currentSlide = 0;
    else currentSlide = idx;

    slideTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
    const dots = dotsContainer.querySelectorAll('.lite-carousel-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  function startAutoSlide() {
    stopAutoSlide();
    autoSlideTimer = setInterval(() => {
      goToSlide(currentSlide + 1);
    }, 5000);
  }

  function stopAutoSlide() {
    if (autoSlideTimer) clearInterval(autoSlideTimer);
  }

  // ── MULTI-STEP BOOKING WIZARD ──
  let currentStep = 1;
  let selectedPlan = 'Monthly — Cleanse Lite';
  let selectedBedrooms = '1 Bedroom';
  let selectedDateObj = null;
  let selectedTimeSlot = 'Morning (8am - 11am)';

  // Calendar State
  let calYear, calMonth;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function initWizard() {
    const modal = document.getElementById('lite-booking-modal');
    if (!modal) return;

    document.getElementById('lite-modal-close').addEventListener('click', closeLiteBookingModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLiteBookingModal();
    });

    // Plan options
    document.querySelectorAll('.lite-modal-plan-opt').forEach(opt => {
      opt.addEventListener('click', function () {
        document.querySelectorAll('.lite-modal-plan-opt').forEach(o => o.classList.remove('active'));
        this.classList.add('active');
        selectedPlan = this.getAttribute('data-plan');
      });
    });

    // Bedroom options
    document.querySelectorAll('.lite-modal-bed-opt').forEach(opt => {
      opt.addEventListener('click', function () {
        document.querySelectorAll('.lite-modal-bed-opt').forEach(o => o.classList.remove('active'));
        this.classList.add('active');
        selectedBedrooms = this.getAttribute('data-bed');
      });
    });

    // Slot pills (Bubble Form)
    document.querySelectorAll('.lite-slot-pill').forEach(pill => {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.lite-slot-pill').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        selectedTimeSlot = this.getAttribute('data-slot');
      });
    });

    // Wizard navigation buttons
    document.getElementById('lite-btn-to-step2').addEventListener('click', () => goToStep(2));
    document.getElementById('lite-btn-to-step1').addEventListener('click', () => goToStep(1));
    document.getElementById('lite-btn-to-step3').addEventListener('click', () => {
      if (!selectedDateObj) {
        alert('Please select a cleaning date on the calendar.');
        return;
      }
      goToStep(3);
    });
    document.getElementById('lite-btn-to-step2-back').addEventListener('click', () => goToStep(2));

    // Calendar month nav
    const today = new Date();
    calYear = today.getFullYear();
    calMonth = today.getMonth();

    document.getElementById('lite-cal-prev').addEventListener('click', () => {
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      renderCalendar();
    });

    document.getElementById('lite-cal-next').addEventListener('click', () => {
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      renderCalendar();
    });

    renderCalendar();

    // Form submit
    document.getElementById('lite-booking-form').addEventListener('submit', handleFormSubmit);
  }

  function renderCalendar() {
    const monthYearEl = document.getElementById('lite-cal-month-year');
    const daysGrid = document.getElementById('lite-cal-days-grid');
    if (!monthYearEl || !daysGrid) return;

    monthYearEl.textContent = `${monthNames[calMonth]} ${calYear}`;
    daysGrid.innerHTML = '';

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDay; i++) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'lite-cal-day empty';
      daysGrid.appendChild(emptyDiv);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(calYear, calMonth, day);
      const dayDiv = document.createElement('div');
      dayDiv.className = 'lite-cal-day';
      dayDiv.textContent = day;

      const yyyy = calYear;
      const mm = String(calMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      if (dayDate < today) {
        dayDiv.classList.add('disabled');
      } else {
        if (selectedDateObj && selectedDateObj.toDateString() === dayDate.toDateString()) {
          dayDiv.classList.add('selected');
        }

        dayDiv.addEventListener('click', () => {
          selectedDateObj = dayDate;
          renderCalendar();
          const displayEl = document.getElementById('lite-selected-date-display');
          if (displayEl) {
            displayEl.textContent = `Selected: ${dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`;
            displayEl.style.color = 'var(--primary-purple)';
          }
        });
      }
      daysGrid.appendChild(dayDiv);
    }
  }

  function goToStep(step) {
    currentStep = step;
    document.querySelectorAll('.lite-wizard-step').forEach((el, idx) => {
      el.classList.toggle('active', idx + 1 === currentStep);
    });

    document.querySelectorAll('.lite-progress-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx + 1 <= currentStep);
    });

    const modalTitle = document.getElementById('lite-modal-title');
    const modalSub = document.getElementById('lite-modal-sub');
    if (modalTitle && modalSub) {
      if (currentStep === 1) {
        modalTitle.textContent = "Customize Cleanse Lite";
        modalSub.textContent = "Step 1 of 3 — Select plan and bedroom count";
      } else if (currentStep === 2) {
        modalTitle.textContent = "Pick Date & Time";
        modalSub.textContent = "Step 2 of 3 — Choose your preferred visit slot";
      } else if (currentStep === 3) {
        modalTitle.textContent = "Your Contact Details";
        modalSub.textContent = "Step 3 of 3 — Finalize booking on WhatsApp";
      }
    }
  }

  window.openLiteBookingModal = function (defaultPlan) {
    const modal = document.getElementById('lite-booking-modal');
    if (!modal) return;

    if (defaultPlan) {
      selectedPlan = defaultPlan;
      document.querySelectorAll('.lite-modal-plan-opt').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-plan') === defaultPlan);
      });
    }

    goToStep(1);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  function closeLiteBookingModal() {
    const modal = document.getElementById('lite-booking-modal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('lite-field-name').value.trim();
    const phone = document.getElementById('lite-field-phone').value.trim();
    const zone = document.getElementById('lite-field-zone').value;
    const address = document.getElementById('lite-field-address').value.trim();

    if (!name || !phone || !zone || !address) {
      alert('Please fill in all required fields.');
      return;
    }

    const dateFormatted = selectedDateObj
      ? selectedDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : 'Not specified';
    const dateISO = selectedDateObj ? selectedDateObj.toISOString().split('T')[0] : '';

    // Calculate price
    let price = '₦25,000 / month';
    if (selectedPlan.toLowerCase().includes('one-time')) {
      price = '₦7,000 / visit';
    } else if (selectedBedrooms.includes('2 Bedroom')) {
      price = '₦32,000 / month';
    }

    // Submit to Google Apps Script backend database
    const scriptUrl = getScriptUrl();
    const payload = {
      action: 'book',
      date: dateISO,
      slot: selectedTimeSlot,
      name: name,
      phone: phone,
      plan: `Cleanse Lite — ${selectedPlan} (${selectedBedrooms})`,
      zone: zone,
      address: address,
      price: price
    };

    try {
      fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.log("Posted backend payload:", err);
    }

    // Format WhatsApp message payload
    const text =
`*NEW CLEANSE LITE BOOKING* 🟢

*Plan:* ${selectedPlan} (${selectedBedrooms})
*Price:* ${price}
*Date:* ${dateFormatted}
*Time Slot:* ${selectedTimeSlot}

*Client Name:* ${name}
*Phone:* ${phone}
*Zone:* ${zone}
*Address:* ${address}

_Submitted via Cleanse Lite Booking System_`;

    closeLiteBookingModal();
    openWaMessage(text);
  }

  // ── INITIALIZE ON DOM READY ──
  document.addEventListener('DOMContentLoaded', () => {
    initCarousel();
    initWizard();
    syncBookingsFromSpreadsheet();
  });
})();
