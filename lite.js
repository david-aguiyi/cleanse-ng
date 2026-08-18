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
  let selectedTimeSlot = '8am - 11am';
  let _pendingWaText = '';

  // Calendar State
  const _todayObj = new Date();
  let calYear = _todayObj.getFullYear();
  let calMonth = _todayObj.getMonth();
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
        if (this.classList.contains('disabled')) return;
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
        const msgEl = document.getElementById('lite-calendar-booking-message');
        if (msgEl) msgEl.textContent = 'Please select an available cleaning date on the calendar.';
        else alert('Please select a cleaning date on the calendar.');
        return;
      }
      goToStep(3);
    });
    document.getElementById('lite-btn-back-to-step2').addEventListener('click', () => goToStep(2));
    document.getElementById('lite-btn-to-step4').addEventListener('click', prepareAndGoToStep4);
    document.getElementById('lite-btn-back-to-step3').addEventListener('click', () => goToStep(3));

    // Success Screen buttons
    const waBtn = document.getElementById('lite-success-wa-btn');
    if (waBtn) {
      waBtn.addEventListener('click', () => {
        if (_pendingWaText) openWaMessage(_pendingWaText);
      });
    }

    const closeBtn = document.getElementById('lite-success-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeLiteBookingModal);
    }

    // Calendar month nav
    document.getElementById('lite-cal-prev').addEventListener('click', () => {
      const today = new Date();
      if (calYear === today.getFullYear() && calMonth === today.getMonth()) return;
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

  function prepareAndGoToStep4() {
    const name = document.getElementById('lite-field-name').value.trim();
    const phone = document.getElementById('lite-field-phone').value.trim();
    const zone = document.getElementById('lite-field-zone').value;
    const address = document.getElementById('lite-field-address').value.trim();
    const valMsg = document.getElementById('step3-validation-msg');

    if (!name || !phone || !zone || !address) {
      if (valMsg) valMsg.textContent = 'Please fill in all required contact details.';
      else alert('Please fill in all required fields.');
      return;
    }
    if (valMsg) valMsg.textContent = '';

    let price = '₦25,000 / month';
    if (selectedPlan.toLowerCase().includes('one-time')) {
      price = '₦7,000 / visit';
    } else if (selectedBedrooms.includes('2 Bedroom')) {
      price = '₦32,000 / month';
    }

    const dateFormatted = selectedDateObj
      ? selectedDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : 'Not specified';

    document.getElementById('lite-sum-plan').textContent = `${selectedPlan} (${selectedBedrooms})`;
    document.getElementById('lite-sum-price').textContent = price;
    document.getElementById('lite-sum-datetime').textContent = `${dateFormatted} (${selectedTimeSlot})`;
    document.getElementById('lite-sum-name').textContent = name;
    document.getElementById('lite-sum-phone').textContent = phone;
    document.getElementById('lite-sum-address').textContent = `${zone} (${address})`;

    goToStep(4);
  }

  function updateSlotPillsForDate(cellDateStr, dayOfWeek) {
    const booked = (bookedSlots[cellDateStr] || []).map(s => String(s).toLowerCase());
    const pills = document.querySelectorAll('.lite-slot-pill');
    let activePillStillValid = false;
    let firstAvailableSlot = null;

    pills.forEach(pill => {
      const slotAttr = pill.getAttribute('data-slot') || '';
      const slotLower = slotAttr.toLowerCase();

      let isBooked = false;
      if (slotLower.includes('8am') && booked.includes('8am - 11am')) isBooked = true;
      if (slotLower.includes('11am') && booked.includes('11am - 2pm')) isBooked = true;
      if (slotLower.includes('2pm') && booked.includes('2pm - 5pm')) isBooked = true;

      // Sundays restricted to late afternoon slot
      const isSundayRestricted = (dayOfWeek === 0 && !slotLower.includes('2pm'));

      if (isBooked || isSundayRestricted) {
        pill.classList.add('disabled');
        pill.classList.remove('active');
      } else {
        pill.classList.remove('disabled');
        if (!firstAvailableSlot) firstAvailableSlot = slotAttr;
        if (slotAttr === selectedTimeSlot) {
          activePillStillValid = true;
          pill.classList.add('active');
        }
      }
    });

    if (!activePillStillValid && firstAvailableSlot) {
      selectedTimeSlot = firstAvailableSlot;
      pills.forEach(p => {
        if (p.getAttribute('data-slot') === firstAvailableSlot) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
    }
  }

  function renderCalendar() {
    const monthYearEl = document.getElementById('lite-cal-month-year');
    const daysGrid = document.getElementById('lite-cal-days-grid');
    if (!monthYearEl || !daysGrid) return;

    if (calYear === undefined || calMonth === undefined) {
      const t = new Date();
      calYear = t.getFullYear();
      calMonth = t.getMonth();
    }

    monthYearEl.textContent = `${monthNames[calMonth]} ${calYear}`;
    daysGrid.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Disable prev month button if showing current month
    const prevBtn = document.getElementById('lite-cal-prev');
    const isCurrentMonth = (calYear === today.getFullYear() && calMonth === today.getMonth());
    if (prevBtn) {
      if (isCurrentMonth) {
        prevBtn.disabled = true;
        prevBtn.style.opacity = '0.3';
        prevBtn.style.cursor = 'not-allowed';
      } else {
        prevBtn.disabled = false;
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
      }
    }

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'lite-cal-day empty';
      daysGrid.appendChild(emptyDiv);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(calYear, calMonth, day);
      dayDate.setHours(0, 0, 0, 0);

      const yyyy = calYear;
      const mm = String(calMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dayDiv = document.createElement('div');
      dayDiv.className = 'lite-cal-day';
      dayDiv.textContent = day;

      const slotsBooked = bookedSlots[dateStr] || [];
      const activeTeamsCount = parseInt(localStorage.getItem('cleanse_active_teams') || '1', 10);
      const isCellSunday = dayDate.getDay() === 0;
      const maxSlots = isCellSunday ? (1 * activeTeamsCount) : (3 * activeTeamsCount);
      const isFullyBooked = slotsBooked.length >= maxSlots;
      const isPartiallyBooked = slotsBooked.length > 0 && slotsBooked.length < maxSlots;
      const isCellToday = dayDate.getTime() === today.getTime();
      const isCellPast = dayDate < today;
      const isSelectable = !isCellPast && !isCellToday;

      if (isCellToday) {
        dayDiv.classList.add('today');
      } else if (isCellPast) {
        dayDiv.classList.add('disabled');
      } else if (isSelectable) {
        if (isFullyBooked) {
          dayDiv.classList.add('fully-booked');
          dayDiv.setAttribute('data-tooltip', '0 Available');
          dayDiv.addEventListener('click', () => {
            const msgEl = document.getElementById('lite-calendar-booking-message');
            if (msgEl) msgEl.textContent = 'This date is fully booked. Please select another date.';
          });
        } else {
          dayDiv.classList.add('selectable');
          const slotsLeft = maxSlots - slotsBooked.length;
          dayDiv.setAttribute('data-tooltip', `${slotsLeft} Available`);

          if (isPartiallyBooked) {
            dayDiv.classList.add('partially-booked');
          }

          if (selectedDateObj && selectedDateObj.toDateString() === dayDate.toDateString()) {
            dayDiv.classList.add('selected');
          }

          dayDiv.addEventListener('click', () => {
            selectedDateObj = dayDate;

            const msgEl = document.getElementById('lite-calendar-booking-message');
            if (msgEl) msgEl.textContent = '';

            const displayEl = document.getElementById('lite-selected-date-display');
            if (displayEl) {
              displayEl.textContent = `Selected: ${dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`;
              displayEl.style.color = 'var(--primary-purple)';
            }

            updateSlotPillsForDate(dateStr, dayDate.getDay());
            renderCalendar();
          });
        }
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

    if (currentStep === 2) {
      renderCalendar();
    }

    const modalTitle = document.getElementById('lite-modal-title');
    const modalSub = document.getElementById('lite-modal-sub');
    if (modalTitle && modalSub) {
      if (currentStep === 1) {
        modalTitle.textContent = "Customize Cleanse Lite";
        modalSub.textContent = "Step 1 of 4 — Select plan and bedroom count";
      } else if (currentStep === 2) {
        modalTitle.textContent = "Pick Date & Time";
        modalSub.textContent = "Step 2 of 4 — Choose your preferred visit slot";
      } else if (currentStep === 3) {
        modalTitle.textContent = "Your Contact Details";
        modalSub.textContent = "Step 3 of 4 — Enter contact & street address";
      } else if (currentStep === 4) {
        modalTitle.textContent = "Verify & Confirm";
        modalSub.textContent = "Step 4 of 4 — Review booking summary";
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
    renderCalendar();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  function closeLiteBookingModal() {
    const modal = document.getElementById('lite-booking-modal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';

    // Reset modal steps & view
    setTimeout(() => {
      const formEl = document.getElementById('lite-booking-form');
      const headerEl = document.querySelector('#lite-booking-modal .lite-modal-header');
      const progressEl = document.querySelector('#lite-booking-modal .lite-modal-progress');
      const successEl = document.getElementById('lite-booking-success-container');

      if (formEl) formEl.style.display = 'block';
      if (headerEl) headerEl.style.display = 'block';
      if (progressEl) progressEl.style.display = 'flex';
      if (successEl) successEl.style.display = 'none';
      goToStep(1);
    }, 300);
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('lite-field-name').value.trim();
    const phone = document.getElementById('lite-field-phone').value.trim();
    const zone = document.getElementById('lite-field-zone').value;
    const address = document.getElementById('lite-field-address').value.trim();

    if (!name || !phone || !zone || !address) {
      goToStep(3);
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
    _pendingWaText =
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

    // Show Success Confirmed View inside Modal
    const formEl = document.getElementById('lite-booking-form');
    const headerEl = document.querySelector('#lite-booking-modal .lite-modal-header');
    const progressEl = document.querySelector('#lite-booking-modal .lite-modal-progress');
    const successEl = document.getElementById('lite-booking-success-container');

    if (formEl) formEl.style.display = 'none';
    if (headerEl) headerEl.style.display = 'none';
    if (progressEl) progressEl.style.display = 'none';
    if (successEl) successEl.style.display = 'block';
  }

  // ── INITIALIZE ON DOM READY ──
  document.addEventListener('DOMContentLoaded', () => {
    initCarousel();
    initWizard();
    syncBookingsFromSpreadsheet();
  });
})();
