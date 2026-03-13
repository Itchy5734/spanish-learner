// ─────────────────────────────────────────────────────────
//  src/lib/ai.js
//  Handles AI question generation via Claude API.
//  Called from the Tutor dashboard when generating questions.
// ─────────────────────────────────────────────────────────

/**
 * generateQuestions
 * Asks Claude to generate Spanish sentence builder questions.
 *
 * @param {string} topic      - e.g. "food", "travel", "family"
 * @param {string} difficulty - "easy", "medium", or "hard"
 * @param {number} count      - how many questions to generate
 * @returns {Array}           - array of question objects ready to save
 */
export async function generateQuestions(topic, difficulty, count = 10) {

  const difficultyGuide = {
    easy:   'short simple sentences, present tense, common everyday words, max 6 words',
    medium: 'medium length sentences, mix of tenses, some less common vocabulary, 6-10 words',
    hard:   'complex sentences, subjunctive or conditional tense, idiomatic phrases, 10+ words'
  }

  const prompt = `You are a Spanish language teacher creating exercises for a language learning app.

Generate exactly ${count} Spanish sentence builder exercises on the topic of "${topic}".
Difficulty level: ${difficulty} (${difficultyGuide[difficulty]}).

For each exercise return:
- english: the English sentence
- spanish: the correct Spanish translation
- distractors: exactly 5 wrong Spanish words that sound plausible but are not in the correct sentence

Rules:
- Vary the sentence structures
- Make distractors believable but clearly wrong in context
- Ensure Spanish is grammatically correct with proper accents
- Do not repeat sentences

Return ONLY a valid JSON array, no explanation, no markdown, just the raw JSON array like:
[
  {
    "english": "I would like a table for two",
    "spanish": "Me gustaría una mesa para dos",
    "distractors": ["tengo","quiero","grande","libre","bonita"]
  }
]`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.content[0].text.trim()

  // Parse the JSON array Claude returns
  const questions = JSON.parse(text)

  // Format for our database schema
  return questions.map(q => ({
    type:        'sentence_builder',
    english:     q.english,
    spanish:     q.spanish,
    distractors: q.distractors,
    difficulty:  difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
    topic:       topic,
    active:      true
  }))
}
