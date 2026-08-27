# Adaptive Code Coach

A coding practice tool that behaves less like an auto-grader and more like a mentor sitting next to you. Instead of a flat "Wrong Answer" when a test case fails, it reads your actual code, figures out the specific reasoning mistake behind the bug, and reshapes what you practice next based on where you're actually struggling.

## Why I built this

Every coding practice site I've used follows the same loop: solve a problem, get a pass/fail, move to the next problem picked more or less at random. If you fail because of an off-by-one error, nothing about the next problem accounts for that. You just keep hitting the same wall in slightly different disguises until it clicks on its own, or it doesn't.

Adaptive Code Coach tries to close that gap. It tracks five core skill areas (loops, arrays, conditionals, functions, recursion), and every submission feeds back into a skill profile. Struggle with recursion twice in a row and the system doesn't just serve you another random problem — it serves you a recursion problem specifically, at a difficulty tuned to where you're stuck, until that gap closes.

## What it actually does

- **Generates problems on the fly.** Rather than pulling from a static question bank, challenges are generated per-user based on their current skill ratings, so no two people necessarily see the same progression.
- **Diagnoses the failure, not just the outcome.** When code doesn't pass, the backend doesn't just run it against test cases — it reads the logic and returns a short, specific explanation of what went wrong (an off-by-one in a loop bound, a missing base case, an unhandled edge case), not a generic error string.
- **Adapts the path forward.** Skill scores update after every submission, and the next problem generated is weighted toward whichever area is weakest, closing the loop between diagnosis and practice.
- **Tracks progress visually.** A radar chart built with Chart.js updates live after every submission, so your skill distribution across the five categories is visible at a glance rather than buried in a stats page.
- **Switches languages without losing your place.** The same problem, starter code, and progress can be translated across JavaScript, Python, and C++ mid-session, so you're not locked into one language from the start.
- **Gives you a way out when you're stuck.** Progressive hints are available if you want a nudge, and a full reference solution if you want to see the answer and move on rather than stall.
- **Remembers you.** Multiple user profiles persist independently in the browser, so streaks, levels, and skill ratings survive across sessions without needing an account system.
- **Plays audio cues generated in-browser.** Pass and fail sounds are synthesized directly with the Web Audio API — no external audio files, nothing to load.

## Stack

**Frontend:** Plain HTML5, CSS (dark theme, glassmorphism), and vanilla JavaScript — no framework, no build step. Chart.js handles the radar visualization.

**Backend:** Node.js with Express. The Groq SDK handles inference for problem generation and code evaluation, chosen mainly for the low latency, which matters when the whole point of the tool is fast feedback.

**Config:** `dotenv` for keeping the API key out of the codebase.

## Project layout

```
adaptive-code-coach/
├── index.html        # Dashboard UI and layout
├── style.css          # Dark theme, glassmorphism, responsive grid
├── app.js              # Frontend logic: radar chart, audio, API calls
├── server.js           # Express server, Groq API route handlers
├── package.json        # Dependencies and scripts
└── .gitignore           # Excludes node_modules and .env
```

## Running it locally

**You'll need:**
- Node.js v18 or higher
- A free Groq API key from console.groq.com

**Steps:**

```bash
git clone https://github.com/swagath20/adaptive-code-coach.git
cd adaptive-code-coach
npm install
```

Create a `.env` file in the project root:

```
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
```

Then start the server:

```bash
node server.js
```

Open `http://localhost:3000` in a browser.

## API endpoints

| Method | Endpoint | What it does |
|---|---|---|
| POST | `/api/generate-problem` | Generates a challenge targeted to a specific skill and difficulty |
| POST | `/api/evaluate-submission` | Analyzes submitted code and returns pass/fail with diagnostic feedback |
| POST | `/api/convert-problem` | Translates the current problem and starter code into another language |
| POST | `/api/reveal-solution` | Produces a clean reference implementation on request |

## How it works, step by step

1. **Profile load.** On startup, the app reads a skill matrix from `localStorage`, or initializes one at baseline Level 1 if this is a new profile.
2. **Problem generation.** The app requests a challenge weighted toward the user's current weakest skill and matching difficulty rating.
3. **Evaluation.** The user writes code in the built-in editor and submits it. The backend sends the code and problem constraints to the inference engine for evaluation.
4. **Feedback loop.** A correct submission raises the relevant skill score, increments the streak, plays a success cue, and expands that section of the radar chart. An incorrect one explains the specific bug, resets the streak, and the next generated problem is chosen to target that same gap.

## What's next

- In-browser code execution via WebAssembly (Pyodide), for hybrid static and dynamic evaluation instead of relying solely on the model reading the code
- Additional skill categories: trees, graphs, dynamic programming
- A timed mock-interview mode with voice-to-text problem walkthroughs

## License

MIT.