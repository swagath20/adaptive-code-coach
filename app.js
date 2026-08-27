// Web Audio API Sound Synthesizer
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(type) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'pass') {
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } else if (type === 'fail') {
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  }
}

// User Profile & State Management
const DEFAULT_STATE = {
  language: 'JavaScript',
  level: 1,
  streak: 0,
  skills: { loops: 1, arrays: 1, conditionals: 1, functions: 1, recursion: 1 },
  currentSkill: 'loops',
  currentProblem: null
};

const skillRotation = ['loops', 'conditionals', 'arrays', 'functions', 'recursion'];
let currentUserId = localStorage.getItem('coach_active_user') || 'user_guest';

function loadUserState(userId) {
  const saved = localStorage.getItem(`coach_state_${userId}`);
  return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_STATE));
}

let state = loadUserState(currentUserId);

function saveState() {
  localStorage.setItem(`coach_state_${currentUserId}`, JSON.stringify(state));
}

// DOM Elements
const problemTitle = document.getElementById('problem-title');
const problemDesc = document.getElementById('problem-desc');
const problemHint = document.getElementById('problem-hint');
const toggleHintBtn = document.getElementById('toggle-hint-btn');
const skillTag = document.getElementById('skill-tag');
const diffTag = document.getElementById('diff-tag');
const codeEditor = document.getElementById('code-editor');
const runBtn = document.getElementById('run-btn');
const nextBtn = document.getElementById('next-btn');
const termOutput = document.getElementById('term-output');
const evalStatus = document.getElementById('eval-status');
const langSelect = document.getElementById('lang-select');
const userSelect = document.getElementById('user-select');
const fileExt = document.getElementById('file-ext');
const levelBadge = document.getElementById('level-badge');
const streakBadge = document.getElementById('streak-badge');
const resetBtn = document.getElementById('reset-btn');

// Solution Modal Elements
const revealSolutionBtn = document.getElementById('reveal-solution-btn');
const solutionModal = document.getElementById('solution-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const solutionCodeBlock = document.getElementById('solution-code-block');
const applySolutionBtn = document.getElementById('apply-solution-btn');

// Chart.js Radar Initialization
let radarChart;
function initChart() {
  const ctx = document.getElementById('skillRadarChart').getContext('2d');
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Loops', 'Arrays', 'Conditionals', 'Functions', 'Recursion'],
      datasets: [{
        data: [
          state.skills.loops,
          state.skills.arrays,
          state.skills.conditionals,
          state.skills.functions,
          state.skills.recursion
        ],
        backgroundColor: 'rgba(47, 129, 247, 0.15)',
        borderColor: '#2f81f7',
        pointBackgroundColor: '#58a6ff',
        pointBorderColor: '#161b22',
        borderWidth: 1.5,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 10,
          ticks: { display: false, stepSize: 2 },
          grid: { color: '#21262d' },
          angleLines: { color: '#21262d' },
          pointLabels: { color: '#8b949e', font: { size: 10, family: 'JetBrains Mono' } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function updateChart() {
  if (!radarChart) return;
  radarChart.data.datasets[0].data = [
    state.skills.loops,
    state.skills.arrays,
    state.skills.conditionals,
    state.skills.functions,
    state.skills.recursion
  ];
  radarChart.update();
}

function syncFileExtension() {
  fileExt.textContent = state.language === 'Python' ? '.py' : (state.language === 'C++' ? '.cpp' : '.js');
}

// Fetch Problem from Server
async function fetchProblem() {
  nextBtn.classList.add('hidden');
  runBtn.disabled = true;
  problemTitle.textContent = "Synthesizing challenge...";
  problemDesc.textContent = "AI compiler generating scenario based on proficiency profile...";
  problemHint.textContent = "Loading diagnostic hint...";
  problemHint.classList.add('blur');
  toggleHintBtn.textContent = "Reveal Hint";
  evalStatus.textContent = "GENERATING";
  evalStatus.className = "status-indicator";

  syncFileExtension();

  try {
    const currentSkillScore = state.skills[state.currentSkill] || 1;
    const res = await fetch('/api/generate-problem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: state.language,
        skill: state.currentSkill,
        level: currentSkillScore
      })
    });

    const data = await res.json();
    state.currentProblem = data;
    saveState();

    problemTitle.textContent = data.title;
    problemDesc.textContent = data.description;
    problemHint.textContent = data.hint || "Analyze the base constraints and boundary conditions carefully.";
    skillTag.textContent = state.currentSkill.toUpperCase();
    diffTag.textContent = `LVL ${currentSkillScore}`;
    codeEditor.value = data.starter_code || `// Solution for ${data.title}\n`;
    
    evalStatus.textContent = "STANDBY";
    termOutput.innerHTML = `<p class="console-idle">Payload loaded. Submit solution for verification.</p>`;
  } catch (err) {
    problemTitle.textContent = "Connection Error";
    problemDesc.textContent = "Failed to communicate with runtime server.";
    evalStatus.textContent = "ERROR";
  } finally {
    runBtn.disabled = false;
  }
}

// Evaluate Code Submission
async function evaluateSubmission() {
  const userCode = codeEditor.value.trim();
  if (!userCode) return;

  runBtn.disabled = true;
  evalStatus.textContent = "RUNNING";
  evalStatus.className = "status-indicator";
  termOutput.innerHTML = `<p class="console-idle">Evaluating logical execution paths...</p>`;

  try {
    const res = await fetch('/api/evaluate-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: state.language,
        problem: state.currentProblem.description,
        code: userCode,
        skill: state.currentSkill
      })
    });

    const result = await res.json();

    if (result.correct) {
      playTone('pass');
      state.streak += 1;
      state.skills[state.currentSkill] = Math.min(10, state.skills[state.currentSkill] + 1);
      state.level += 1;
      saveState();

      evalStatus.textContent = "PASSED";
      evalStatus.className = "status-indicator status-pass";
      termOutput.innerHTML = `
        <p class="console-pass">[VERIFICATION SUCCESS]</p>
        <p style="margin-top: 6px; color: #8b949e;">${result.feedback}</p>
      `;

      nextBtn.classList.remove('hidden');
      updateUI();
    } else {
      playTone('fail');
      state.streak = 0;
      saveState();

      evalStatus.textContent = "FAILED";
      evalStatus.className = "status-indicator status-fail";
      termOutput.innerHTML = `
        <p class="console-fail">[DIAGNOSTIC FAILURE]</p>
        <p style="margin-top: 6px; color: #e6edf3;">${result.feedback}</p>
      `;
      updateUI();
    }
  } catch (err) {
    evalStatus.textContent = "ERROR";
    termOutput.innerHTML = `<p class="console-fail">Runtime inspection failed: ${err.message}</p>`;
  } finally {
    runBtn.disabled = false;
  }
}

function advanceToNext() {
  const nextIndex = (skillRotation.indexOf(state.currentSkill) + 1) % skillRotation.length;
  state.currentSkill = skillRotation[nextIndex];
  saveState();
  fetchProblem();
}

function updateUI() {
  levelBadge.textContent = state.level;
  streakBadge.textContent = state.streak;
  
  const currentSkillScore = state.skills[state.currentSkill] || 1;
  diffTag.textContent = `LVL ${currentSkillScore}`;
  
  syncFileExtension();
  updateChart();
}

// Event Listeners
runBtn.addEventListener('click', evaluateSubmission);
nextBtn.addEventListener('click', advanceToNext);

// Hint Blur Toggle
toggleHintBtn.addEventListener('click', () => {
  if (problemHint.classList.contains('blur')) {
    problemHint.classList.remove('blur');
    toggleHintBtn.textContent = "Hide Hint";
  } else {
    problemHint.classList.add('blur');
    toggleHintBtn.textContent = "Reveal Hint";
  }
});

// Solution Modal Handlers with Guaranteed Async Injection
revealSolutionBtn.addEventListener('click', async () => {
  if (!state.currentProblem) return;

  // Streak penalty for giving up
  state.streak = 0;
  saveState();
  updateUI();

  // If a valid reference solution is already cached, display and enable button immediately
  if (
    state.currentProblem.solution && 
    state.currentProblem.solution.trim() !== '' && 
    !state.currentProblem.solution.includes("pass")
  ) {
    solutionCodeBlock.textContent = state.currentProblem.solution;
    solutionModal.classList.remove('hidden');
    applySolutionBtn.disabled = false;
    return;
  }

  // Fetch dynamically if missing
  solutionCodeBlock.textContent = "// Synthesizing reference solution...";
  solutionModal.classList.remove('hidden');
  applySolutionBtn.disabled = true;

  try {
    const res = await fetch('/api/reveal-solution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: state.language,
        problem: state.currentProblem.description,
        starter_code: state.currentProblem.starter_code
      })
    });

    const data = await res.json();
    if (data.solution && data.solution.trim() !== '') {
      state.currentProblem.solution = data.solution;
      saveState();
      solutionCodeBlock.textContent = data.solution;
      applySolutionBtn.disabled = false;
    } else {
      solutionCodeBlock.textContent = "// Could not generate solution. Please retry.";
    }
  } catch (err) {
    solutionCodeBlock.textContent = `// Error retrieving solution: ${err.message}`;
  }
});

closeModalBtn.addEventListener('click', () => {
  solutionModal.classList.add('hidden');
});

applySolutionBtn.addEventListener('click', () => {
  if (state.currentProblem?.solution) {
    codeEditor.value = state.currentProblem.solution;
  }
  solutionModal.classList.add('hidden');
});

// Profile Switcher
userSelect.value = currentUserId;
userSelect.addEventListener('change', (e) => {
  currentUserId = e.target.value;
  localStorage.setItem('coach_active_user', currentUserId);
  state = loadUserState(currentUserId);
  langSelect.value = state.language;
  updateUI();
  fetchProblem();
});

// Language Switcher / Conversion
langSelect.value = state.language;
langSelect.addEventListener('change', async (e) => {
  state.language = e.target.value;
  saveState();
  syncFileExtension();

  if (!state.currentProblem) {
    fetchProblem();
    return;
  }

  evalStatus.textContent = "TRANSLATING";
  termOutput.innerHTML = `<p class="console-idle">Converting current challenge to ${state.language}...</p>`;
  runBtn.disabled = true;

  try {
    const res = await fetch('/api/convert-problem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: state.language,
        title: state.currentProblem.title,
        description: state.currentProblem.description,
        starter_code: state.currentProblem.starter_code,
        solution: state.currentProblem.solution || ''
      })
    });

    const data = await res.json();
    state.currentProblem.starter_code = data.starter_code;
    state.currentProblem.solution = data.solution;
    state.currentProblem.description = data.description || state.currentProblem.description;
    saveState();

    problemDesc.textContent = state.currentProblem.description;
    codeEditor.value = data.starter_code;
    evalStatus.textContent = "STANDBY";
    termOutput.innerHTML = `<p class="console-idle">Challenge converted to ${state.language}. Ready for submission.</p>`;
  } catch (err) {
    termOutput.innerHTML = `<p class="console-fail">Failed to convert challenge: ${err.message}</p>`;
  } finally {
    runBtn.disabled = false;
  }
});

// Reset State
resetBtn.addEventListener('click', () => {
  localStorage.removeItem(`coach_state_${currentUserId}`);
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  langSelect.value = state.language;
  updateUI();
  fetchProblem();
});

// Boot Application
window.addEventListener('DOMContentLoaded', () => {
  initChart();
  updateUI();
  fetchProblem();
});