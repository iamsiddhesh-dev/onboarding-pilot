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

// Technical/hard skills only (no soft skills like "communication" or
// "teamwork") — powers the native datalist typeahead on the skills input.
const SKILL_SUGGESTIONS = [
  'Python', 'PyTorch', 'TensorFlow', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST APIs',
  'React', 'Vue', 'Node.js', 'Django', 'FastAPI', 'Flask',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Terraform', 'Linux',
  'Git', 'Figma', 'A/B Testing', 'Data Analysis', 'Machine Learning', 'Pandas', 'NumPy',
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
  const isActualSwitch = state.mode !== mode;
  state.mode = mode;

  // Before and After are two independent demos of the same scenario — carrying
  // selections across the toggle would let Before-mode duplicates (allowed by
  // design) slip into an After-mode save. Reset everything except the pasted
  // resume text, which is annoying to have to re-type when comparing modes.
  if (isActualSwitch) {
    state.industries = [];
    state.jobTitles = [];
    state.skills = [];
    state.yearsExperience = null;
    document.getElementById('name-input').value = '';
    document.getElementById('years-input').value = '';
    document.getElementById('autofill-status').textContent = '';
    document.getElementById('save-status').textContent = '';
  }

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
  renderSaveButton();
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

function renderSaveButton() {
  const btn = document.getElementById('save-profile-btn');

  // All fields are mandatory. The over-cap block mirrors the old "Next"
  // button's fix-mode-only behavior: Before mode still lets you save over
  // cap (that's the bug being demonstrated), After mode blocks it.
  const overCapInAfterMode = state.mode === 'after' && state.skills.length > SKILLS_CAP;
  const allFilled =
    document.getElementById('name-input').value.trim() &&
    state.industries.length > 0 &&
    state.jobTitles.length > 0 &&
    state.yearsExperience !== null &&
    state.skills.length > 0;

  btn.classList.remove('btn-success');
  btn.textContent = 'Save Profile';
  btn.disabled = !allFilled || overCapInAfterMode;
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

  if (state.mode === 'after') {
    // fix: same duplicate-prevention the industries/job-titles dropdowns get,
    // just case-insensitive since skills are free text, not a fixed list.
    const isDuplicate = state.skills.some((t) => t.value.toLowerCase() === value.toLowerCase());
    if (isDuplicate) return;

    if (state.skills.length >= SKILLS_CAP) {
      renderSkillsState(); // surface the warning even if something tried to sneak past the disabled button
      return;
    }
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
    status.textContent = 'Upload your resume or introduce yourself first.';
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

    // Autofill touches Name, Industries, and Skills. Job Titles and Years
    // of Experience are picked by the user themselves — what role you're
    // searching for isn't something AI should guess on your behalf.

    // Only fill the name if the user hasn't already typed one — autofill
    // shouldn't clobber something they entered themselves.
    const nameInput = document.getElementById('name-input');
    if (data.name && !nameInput.value.trim()) {
      nameInput.value = data.name;
    }

    // Route through the same add* functions manual entry uses, so
    // autofilled tags obey the same before/after dedupe behavior.
    (data.industries || []).forEach((value) => addIndustrySelection(value));
    (data.skills || []).forEach((value) => addSkill(value));
    renderSaveButton(); // in case both came back empty, the name change still needs to be reflected

    status.textContent = data.name
      ? `Filled name, ${data.industries.length} industries, and ${data.skills.length} skills.`
      : `Filled ${data.industries.length} industries and ${data.skills.length} skills.`;
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

  // The button is disabled whenever a mandatory field is missing, but guard
  // here too in case this is ever called programmatically.
  if (!name || state.industries.length === 0 || state.jobTitles.length === 0 ||
      state.yearsExperience === null || state.skills.length === 0) {
    status.textContent = 'Please fill in every field before saving.';
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

    await res.json();
    status.textContent = '';
    btn.classList.add('btn-success');
    btn.textContent = '✓ Saved';
  } catch (err) {
    status.textContent = `Save failed: ${err.message}`;
    btn.disabled = false;
  }
}

// ---------- Init ----------

document.addEventListener('DOMContentLoaded', () => {
  const skillsDatalist = document.getElementById('skills-datalist');
  SKILL_SUGGESTIONS.forEach((skill) => {
    const opt = document.createElement('option');
    opt.value = skill;
    skillsDatalist.appendChild(opt);
  });

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

  document.getElementById('name-input').addEventListener('input', renderSaveButton);

  document.getElementById('years-input').addEventListener('input', (e) => {
    state.yearsExperience = e.target.value === '' ? null : parseInt(e.target.value, 10);
    renderSaveButton();
  });

  document.getElementById('resume-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.getElementById('autofill-status');
    status.textContent = 'Reading file...';

    try {
      // PDFs can't be read as plain text client-side, so any uploaded file
      // (txt/md/pdf) is parsed server-side and comes back as plain text.
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-resume-file', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed (${res.status})`);
      }

      const data = await res.json();
      document.getElementById('resume-textarea').value = data.text;
      status.textContent = 'File loaded — click "Autofill with AI" to extract.';
    } catch (err) {
      status.textContent = `Couldn't read file: ${err.message}`;
    } finally {
      e.target.value = ''; // allow re-selecting the same file later
    }
  });

  document.getElementById('autofill-btn').addEventListener('click', submitAutofill);
  document.getElementById('save-profile-btn').addEventListener('click', saveProfile);

  setMode('before');
});
