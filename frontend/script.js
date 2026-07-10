'use strict';

// ---------- Static option lists ----------

const INDUSTRY_OPTIONS = [
  'Gaming', 'Fintech', 'Healthcare', 'E-commerce', 'Education',
  'SaaS', 'Manufacturing', 'Retail', 'Media & Entertainment',
  'Real Estate', 'Non-profit', 'Logistics',
];

const JOB_TITLE_OPTIONS = [
  'Software Engineer', 'Product Manager', 'Designer', 'Data Scientist',
  'Data Analyst', 'DevOps Engineer', 'QA Engineer', 'Engineering Manager',
  'Solutions Architect', 'Customer Success Manager', 'Sales Engineer', 'Technical Writer',
];

const SKILLS_CAP = 10;

// ---------- State ----------
// Every selected tag is { instanceId: crypto.randomUUID(), value }.
// "before" mode intentionally reproduces the real bugs found in the wizard:
//   - duplicate values can be added repeatedly
//   - removing one tag removes every tag sharing its value (keyed by value, not instance)
//   - the skills cap is not enforced at all
// "after" mode is the fix: keyed by instanceId, already-picked options are
// disabled in the dropdown, and skills hard-cap at 10.

const state = {
  mode: 'before', // 'before' | 'after'
  industries: [],
  jobTitles: [],
  skills: [],
  yearsExperience: null,
};

function makeTag(value) {
  return { instanceId: crypto.randomUUID(), value };
}

// ---------- Mode toggle ----------

function setMode(mode) {
  state.mode = mode;

  document.body.classList.toggle('mode-before', mode === 'before');
  document.body.classList.toggle('mode-after', mode === 'after');

  document.getElementById('mode-before-btn').classList.toggle('mode-btn--active', mode === 'before');
  document.getElementById('mode-after-btn').classList.toggle('mode-btn--active', mode === 'after');

  const caption = document.getElementById('mode-caption');
  caption.innerHTML = mode === 'before'
    ? '<strong>Before mode:</strong> reproduces the 3 real bugs found in the onboarding wizard &mdash; duplicate tags, synchronized delete, and an unenforced skills cap. Toggle to <strong>After</strong> to see the fix.'
    : '<strong>After mode:</strong> the fix &mdash; tags are keyed by a unique instance id (removing one never touches its siblings), already-selected dropdown options are disabled, and skills are hard-capped at 10.';

  renderAll();
}

// ---------- Rendering ----------

function renderAll() {
  renderSelectOptions('industry-select', INDUSTRY_OPTIONS, state.industries);
  renderSelectOptions('jobtitle-select', JOB_TITLE_OPTIONS, state.jobTitles);
  renderTags('industry-tags', state.industries, removeIndustry);
  renderTags('jobtitle-tags', state.jobTitles, removeJobTitle);
  renderTags('skills-tags', state.skills, removeSkill);
  renderSkillsState();
  renderNextButton();
}

function renderSelectOptions(selectId, options, selectedList) {
  const select = document.getElementById(selectId);
  const selectedValues = new Set(selectedList.map((t) => t.value));

  select.querySelectorAll('option:not([value=""])').forEach((opt) => opt.remove());

  options.forEach((optionValue) => {
    const opt = document.createElement('option');
    opt.value = optionValue;

    if (state.mode === 'after' && selectedValues.has(optionValue)) {
      opt.disabled = true;
      opt.textContent = `${optionValue} (added)`;
    } else {
      opt.textContent = optionValue;
    }

    select.appendChild(opt);
  });

  select.value = '';
}

function renderTags(containerId, list, removeHandler) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  list.forEach((tag) => {
    const pill = document.createElement('span');
    pill.className = 'tag';
    pill.dataset.instanceId = tag.instanceId;

    const label = document.createElement('span');
    label.textContent = tag.value;
    pill.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'tag-remove';
    removeBtn.setAttribute('aria-label', `Remove ${tag.value}`);
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removeHandler(tag));
    pill.appendChild(removeBtn);

    container.appendChild(pill);
  });
}

function renderSkillsState() {
  const warning = document.getElementById('skills-warning');
  const addBtn = document.getElementById('skills-add-btn');
  const input = document.getElementById('skills-input');

  const atOrOverCap = state.mode === 'after' && state.skills.length >= SKILLS_CAP;

  warning.hidden = !atOrOverCap;
  addBtn.disabled = atOrOverCap;
  input.disabled = atOrOverCap;
}

function renderNextButton() {
  const nextBtn = document.getElementById('next-btn');
  const overCap = state.skills.length > SKILLS_CAP;
  // The bug: in "before" mode Next stays enabled no matter what.
  // The fix: in "after" mode Next is blocked if skills ever end up over cap.
  nextBtn.disabled = state.mode === 'after' && overCap;
}

// ---------- Industries ----------

function addIndustrySelection(value) {
  if (!value) return;

  if (state.mode === 'after' && state.industries.some((t) => t.value === value)) {
    return; // fix: already-selected options are disabled, this is just a safety net
  }

  state.industries.push(makeTag(value));
  renderAll();
}

function removeIndustry(tag) {
  if (state.mode === 'before') {
    // bug: keyed by value, so removing one duplicate removes them all
    state.industries = state.industries.filter((t) => t.value !== tag.value);
  } else {
    // fix: keyed by instanceId, removing one never touches siblings
    state.industries = state.industries.filter((t) => t.instanceId !== tag.instanceId);
  }
  renderAll();
}

// ---------- Job Titles ----------

function addJobTitleSelection(value) {
  if (!value) return;

  if (state.mode === 'after' && state.jobTitles.some((t) => t.value === value)) {
    return;
  }

  state.jobTitles.push(makeTag(value));
  renderAll();
}

function removeJobTitle(tag) {
  if (state.mode === 'before') {
    state.jobTitles = state.jobTitles.filter((t) => t.value !== tag.value);
  } else {
    state.jobTitles = state.jobTitles.filter((t) => t.instanceId !== tag.instanceId);
  }
  renderAll();
}

// ---------- Skills ----------

function addSkill(rawValue) {
  const value = rawValue.trim();
  if (!value) return;

  if (state.mode === 'after' && state.skills.length >= SKILLS_CAP) {
    renderSkillsState(); // surface the warning even if something tried to sneak past the disabled button
    return;
  }

  state.skills.push(makeTag(value));
  renderAll();
}

function removeSkill(tag) {
  if (state.mode === 'before') {
    state.skills = state.skills.filter((t) => t.value !== tag.value);
  } else {
    state.skills = state.skills.filter((t) => t.instanceId !== tag.instanceId);
  }
  renderAll();
}

// ---------- AI autofill + save profile ----------

async function submitAutofill() {
  const textarea = document.getElementById('resume-textarea');
  const status = document.getElementById('autofill-status');
  const btn = document.getElementById('autofill-btn');
  const text = textarea.value.trim();

  if (!text) {
    status.textContent = 'Paste some resume/bio text first.';
    return;
  }

  btn.disabled = true;
  status.textContent = 'Extracting...';

  try {
    const res = await fetch('/api/extract-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    const data = await res.json();

    // Route through the same add* functions manual selection uses, so
    // autofilled tags obey the same before/after dedupe behavior.
    (data.industries || []).forEach((value) => addIndustrySelection(value));
    (data.job_titles || []).forEach((value) => addJobTitleSelection(value));
    (data.skills || []).forEach((value) => addSkill(value));
    state.yearsExperience = data.years_experience ?? null;

    status.textContent =
      `Filled ${data.industries.length} industries, ${data.job_titles.length} job titles, ` +
      `${data.skills.length} skills.`;
  } catch (err) {
    status.textContent = `Autofill failed: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
}

async function saveProfile() {
  const nameInput = document.getElementById('name-input');
  const status = document.getElementById('save-status');
  const btn = document.getElementById('save-profile-btn');
  const name = nameInput.value.trim();

  if (!name) {
    status.textContent = 'Enter a name first.';
    return;
  }

  const payload = {
    name,
    industries: state.industries.map((t) => t.value),
    job_titles: state.jobTitles.map((t) => t.value),
    years_experience: state.yearsExperience,
    skills: state.skills.map((t) => t.value).slice(0, SKILLS_CAP),
  };

  btn.disabled = true;
  status.textContent = 'Saving...';

  try {
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    const saved = await res.json();
    status.textContent = `Saved as profile #${saved.id}.`;
  } catch (err) {
    status.textContent = `Save failed: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
}

// ---------- Init ----------

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mode-before-btn').addEventListener('click', () => setMode('before'));
  document.getElementById('mode-after-btn').addEventListener('click', () => setMode('after'));

  document.getElementById('industry-select').addEventListener('change', (e) => {
    addIndustrySelection(e.target.value);
  });

  document.getElementById('jobtitle-select').addEventListener('change', (e) => {
    addJobTitleSelection(e.target.value);
  });

  const skillsInput = document.getElementById('skills-input');
  document.getElementById('skills-add-btn').addEventListener('click', () => {
    addSkill(skillsInput.value);
    skillsInput.value = '';
    skillsInput.focus();
  });
  skillsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(skillsInput.value);
      skillsInput.value = '';
    }
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    console.log('Next clicked, current state:', JSON.parse(JSON.stringify(state)));
  });

  document.getElementById('autofill-btn').addEventListener('click', submitAutofill);
  document.getElementById('save-profile-btn').addEventListener('click', saveProfile);

  setMode('before');
});
