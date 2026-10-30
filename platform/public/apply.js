// Become a Cleanse Pro: collects the application form and posts it to
// /api/v1/applications. The server re-validates everything (schemas.ts).
(function () {
  var form = document.getElementById('apply-form');
  if (!form) return;
  var errorBox = document.getElementById('apply-error');
  var submitBtn = document.getElementById('apply-submit');
  var done = document.getElementById('apply-done');

  // Date of birth: no future dates, and default the picker towards adults.
  var dob = form.elements.date_of_birth;
  var today = new Date();
  var max = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  dob.max = max.toISOString().slice(0, 10);
  dob.min = (today.getFullYear() - 80) + '-01-01';

  var LABELS = {
    full_name: 'your full name', whatsapp: 'your WhatsApp number', date_of_birth: 'your date of birth',
    gender: 'your gender', has_children: 'whether you have children', address: 'your home address',
    languages: 'the languages you speak', experience: 'your experience', experience_places: 'where you have cleaned before',
    available_days: 'the days you can work', start_when: 'how soon you can start', transport: 'how you will get to jobs',
    has_smartphone: 'the smartphone question', has_valid_id: 'the ID question', willing_guarantor: 'the guarantor question',
    can_give_references: 'the references question', willing_training: 'the training question',
    why_cleanse: 'why you want to work with Cleanse', arrival_time: 'the arrival time question',
    found_money: 'the money question', days_per_week: 'how many days a week you can commit',
    attention_check: 'the last question', consent: 'the privacy agreement'
  };

  function checked(group) {
    return Array.prototype.map.call(
      form.querySelectorAll('[data-group="' + group + '"] input:checked'),
      function (el) { return el.value; }
    );
  }
  function yesNo(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value === 'yes' : undefined;
  }
  function val(name) { return (form.elements[name].value || '').trim(); }

  function collect() {
    return {
      full_name: val('full_name'), whatsapp: val('whatsapp'), date_of_birth: val('date_of_birth'),
      gender: val('gender'), has_children: val('has_children'), address: val('address'),
      landmark: val('landmark'), languages: checked('languages'), heard_from: val('heard_from'),
      experience: val('experience'), experience_places: checked('experience_places'),
      available_days: checked('available_days'), start_when: val('start_when'), transport: val('transport'),
      has_smartphone: yesNo('has_smartphone'), has_valid_id: yesNo('has_valid_id'),
      willing_guarantor: yesNo('willing_guarantor'), can_give_references: yesNo('can_give_references'),
      willing_training: yesNo('willing_training'),
      why_cleanse: val('why_cleanse'), arrival_time: val('arrival_time'), found_money: val('found_money'),
      days_per_week: val('days_per_week'), attention_check: val('attention_check'),
      consent: form.elements.consent.checked, website: val('website')
    };
  }

  // Quick in-browser check so people see what is missing before sending.
  function missing(data) {
    var out = [];
    Object.keys(LABELS).forEach(function (k) {
      var v = data[k];
      if (k === 'consent' ? v !== true : (v === undefined || v === '' || (Array.isArray(v) && !v.length))) out.push(k);
    });
    return out;
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.hidden = true;
    var data = collect();
    var gaps = missing(data);
    if (gaps.length) {
      showError('Please fill in ' + gaps.slice(0, 3).map(function (k) { return LABELS[k]; }).join(', ') +
        (gaps.length > 3 ? ' and ' + (gaps.length - 3) + ' more.' : '.'));
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    fetch('/api/v1/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json.ok) {
          form.hidden = true;
          done.hidden = false;
          done.focus();
          done.scrollIntoView({ block: 'center' });
          return;
        }
        var fields = json.error && json.error.details && json.error.details.fieldErrors;
        var first = fields && Object.keys(fields)[0];
        showError(first ? fields[first][0] : (json.error && json.error.message) || 'Something went wrong. Please try again.');
      })
      .catch(function () {
        showError('We could not send your application. Check your internet connection and try again.');
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send my application';
      });
  });
})();
