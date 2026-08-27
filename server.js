import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL_NAME = 'qwen/qwen3.8-27b';

// 1. Generate Classic / Standard Interview Problems
app.post('/api/generate-problem', async (req, res) => {
  const { language, skill, level } = req.body;

  const systemPrompt = `You are a curriculum designer for standard LeetCode and HackerRank technical interview preparation.
Generate a recognized, clean, standard coding problem testing "${skill}".

DIFFICULTY GUIDELINES:
- Level 1-3: Easy fundamentals (e.g., FizzBuzz, find max/min, reverse string, count vowels, sum array, basic conditionals).
- Level 4-6: Medium fundamentals (e.g., Two Sum, Palindrome check, remove duplicates, merge two sorted arrays, simple recursion factorial/fibonacci).
- Level 7-10: Standard interview algorithms (e.g., Binary Search, Valid Parentheses, Reverse a Linked List / Array, Flatten nested array, Anagram check).

STRICT RULES:
1. NEVER invent confusing, vague, or convoluted custom math puzzles.
2. Stick strictly to classic, widely recognized computer science interview problems.
3. Keep the problem statement concise with 2 clear input/output test examples.
4. Provide a syntactically perfect starter code template and a bug-free reference solution.

Output ONLY valid JSON with this exact structure:
{
  "title": "Classic Problem Title",
  "description": "Clear, concise problem description with 2 sample input/output examples.",
  "starter_code": "// Boilerplate starter function for ${language}",
  "hint": "A short conceptual hint pointing in the right direction.",
  "solution": "// Complete, bug-free, clean reference implementation in ${language}",
  "skill_tags": ["${skill}"]
}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a classic ${language} problem on "${skill}" for Level ${level}/10.` }
      ],
      model: MODEL_NAME,
      response_format: { type: 'json_object' }
    });

    const data = JSON.parse(response.choices[0]?.message?.content || '{}');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Concise Diagnostic Code Evaluation
app.post('/api/evaluate-submission', async (req, res) => {
  const { language, problem, code, skill } = req.body;

  const systemPrompt = `You are an expert compiler and adaptive coding teacher.
Analyze the user's code for logic errors, off-by-one errors, missing edge cases, and undefined variables.
Keep feedback concise (maximum 2-3 sentences), pointing out the specific bug or misconception.
Output ONLY valid JSON with this exact structure:
{
  "correct": true or false,
  "feedback": "Max 2-3 sentences explaining why it passed or the specific mistake made",
  "weak_skill": "${skill}"
}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Language: ${language}\nProblem Statement:\n${problem}\n\nUser Code Submission:\n${code}` 
        }
      ],
      model: MODEL_NAME,
      response_format: { type: 'json_object' }
    });

    const data = JSON.parse(response.choices[0]?.message?.content || '{}');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Convert Problem to Target Language
app.post('/api/convert-problem', async (req, res) => {
  const { language, title, description, starter_code, solution } = req.body;

  const systemPrompt = `You are a coding challenge adapter. 
Translate the provided problem, starter boilerplate, and reference solution into the target language (${language}). 
Preserve the exact same problem logic and difficulty.
CRITICAL: Double-check all variables and syntax in ${language}.
Output ONLY valid JSON with this exact structure:
{
  "title": "${title}",
  "description": "The problem description adapted for ${language} conventions",
  "starter_code": "// Starter code written in ${language}",
  "solution": "// Working reference solution written in ${language}"
}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Adapt this problem and solution to ${language}:\nTitle: ${title}\nDescription: ${description}\nStarter Code:\n${starter_code}\nSolution:\n${solution || ''}` 
        }
      ],
      model: MODEL_NAME,
      response_format: { type: 'json_object' }
    });

    const data = JSON.parse(response.choices[0]?.message?.content || '{}');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. On-Demand Solution Reveal
app.post('/api/reveal-solution', async (req, res) => {
  const { language, problem, starter_code } = req.body;

  const systemPrompt = `You are an expert programming instructor. 
Provide a clean, syntactically perfect, fully working reference solution in ${language} for the given problem.
CRITICAL: Double check all variable names, ensure zero undefined variables, and verify that the logic is bug-free.
Output ONLY valid JSON with this exact structure:
{
  "solution": "// Working reference code with brief comments"
}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Language: ${language}\nProblem:\n${problem}\nStarter Code:\n${starter_code || ''}` 
        }
      ],
      model: MODEL_NAME,
      response_format: { type: 'json_object' }
    });

    const data = JSON.parse(response.choices[0]?.message?.content || '{}');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Teacher Server running at http://localhost:${PORT}`));