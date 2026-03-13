# 🇪🇸 Spanish Learner — Complete Deployment Guide

## What you have
A full web app with:
- Student login, progress saving, assignments
- Tutor dashboard with student progress view
- AI question generation (Claude API)
- Content editor — add/edit questions in-app
- Live updates — change code, everyone sees it instantly

---

## STEP 1 — Set up Supabase database

1. Go to **supabase.com** and open your `spanish-learner` project
2. In the left sidebar click **SQL Editor**
3. Click **New Query**
4. Open the file `supabase/schema.sql` from this project
5. Copy the entire contents and paste into the SQL editor
6. Click **Run** (green button)
7. You should see "Success" — your database tables are now created

**Get your Supabase keys:**
1. In Supabase left sidebar → **Settings** → **API**
2. Copy **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy **anon / public** key (long string starting with `eyJ...`)
4. Keep these — you'll need them in Step 3

---

## STEP 2 — Get your Anthropic API key (for AI question generation)

1. Go to **console.anthropic.com**
2. Sign up or log in
3. Click **API Keys** in the left sidebar
4. Click **Create Key**, give it a name like `spanish-learner`
5. Copy the key (starts with `sk-ant-...`) — you only see it once!

> **Cost:** Generating 50 questions costs roughly 1–2 pence.
> You only generate when you want new content — it's not a running cost.

---

## STEP 3 — Upload code to GitHub

1. Go to **github.com** and open your `spanish-learner` repository
2. You need to upload all these files keeping the folder structure:

```
spanish-learner/
├── public/
│   └── index.html
├── src/
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── AuthContext.js
│   │   └── ai.js
│   ├── pages/
│   │   ├── LoginPage.js
│   │   ├── StudentDashboard.js
│   │   ├── TutorDashboard.js
│   │   └── GamePage.js
│   ├── App.js
│   └── index.js
├── supabase/
│   └── schema.sql
├── package.json
├── .gitignore
└── .env.example
```

**Easiest way to upload:**
1. In your GitHub repo click **Add file** → **Upload files**
2. Drag all the files in — GitHub will keep the folder structure
3. Click **Commit changes**

---

## STEP 4 — Deploy on Vercel

1. Go to **vercel.com** and open your project
2. Click **Settings** → **Environment Variables**
3. Add these three variables one by one:

| Name | Value |
|------|-------|
| `REACT_APP_SUPABASE_URL` | Your Supabase Project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `REACT_APP_ANTHROPIC_KEY` | Your Anthropic API key |

4. After adding all three, click **Deployments** in the top menu
5. Click the three dots on your latest deployment → **Redeploy**
6. Wait about 60 seconds — your app is live!

---

## STEP 5 — Create your Tutor account

1. Open your live app URL (e.g. `spanish-learner-xxx.vercel.app`)
2. Click **Sign Up**
3. Select **I am a Tutor**
4. Enter the tutor PIN: **`1234`**
   *(Change this! See "Changing the tutor PIN" below)*
5. Fill in your details and create the account
6. Check your email and click the confirmation link
7. Log back in — you'll land on the Tutor Dashboard

---

## STEP 6 — Share with students

Give students your app URL. They:
1. Click **Sign Up**
2. Select **I am a Student** (no PIN needed)
3. Create their account, confirm email, log in
4. Land on their personal Student Dashboard

Students can also be invited — just share the link.

---

## How updates work

**To update content (questions, assignments):**
- Log in as tutor → use the dashboard
- No code changes needed — saves instantly

**To update the app itself (new features, bug fixes):**
1. Edit the files in GitHub
2. Vercel auto-detects the change
3. Rebuilds and deploys in ~60 seconds
4. Everyone sees the new version next page load

---

## Changing the Tutor PIN

Open `src/pages/LoginPage.js` and find this line (around line 30):

```javascript
const TUTOR_PIN = '1234'
```

Change `'1234'` to whatever you want, save, and push to GitHub.

---

## Generating 1000 questions with AI

1. Log in as tutor
2. Go to **AI Generator** tab
3. Pick a topic (food, travel, etc.) and difficulty
4. Set count to 50, click **Generate with AI**
5. Review the preview, remove any you don't want
6. Click **Save All to Database**
7. Repeat for different topics and difficulties
8. 20 batches of 50 = 1000 questions in about 10 minutes

---

## Troubleshooting

**App shows blank screen:**
- Check Vercel environment variables are set correctly
- Check browser console (F12) for error messages

**Can't log in:**
- Check Supabase → Authentication → Users — is the account there?
- Make sure email was confirmed

**AI generation fails:**
- Check your Anthropic API key is correct in Vercel settings
- Make sure you have credits in your Anthropic account

**Questions not showing in game:**
- Check Supabase → Table Editor → questions
- Make sure `active` column is `true`

---

## File you should NOT touch
- `.env.local` — never commit this to GitHub (it's in .gitignore)
- `supabase/schema.sql` — only run this once during setup
