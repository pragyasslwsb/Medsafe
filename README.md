# MedSafe

MedSafe is an existing Vite + React healthcare app with an Express API. The prescription reader sends a user-selected image to Gemini for transcription; its clearly labeled sample is fictional and does not call the AI.

## Set up the Gemini key

1. In this folder, copy `.env.example` to `.env`.
2. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
3. Configure the private history database and session secret in `.env`:

   ```env
   GEMINI_API_KEY=your_actual_key_here
   MONGODB_URI=mongodb+srv://<database-user>:<password>@<your-cluster>/<database>?retryWrites=true&w=majority
   JWT_SECRET=your_random_secret_at_least_32_characters_long
   ```

Create a MongoDB Atlas database user and allow the development machine's IP in Atlas Network Access. Generate a JWT secret locally in PowerShell with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Keep `.env` private; it is excluded from Git. Database credentials, the JWT secret, and the Gemini key are used only by the backend and are never included in the browser app.

## Run on Windows

Open a terminal in the `medsafe` folder and install dependencies once:

```powershell
npm install
```

Run the API and Vite in **two separate terminals**:

```powershell
npm run server
```

```powershell
npm run dev
```

Or start both in one terminal:

```powershell
npm run dev:all
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). The Vite `/api` proxy forwards requests to `http://localhost:3001`.
The API binds to `127.0.0.1` by default so local development does not expose patient sessions to the network. For a separate frontend origin, set `CORS_ORIGINS` to a comma-separated allowlist. Production deployments should terminate HTTPS at a trusted reverse proxy and keep the API bound to loopback.

Run the local checks before a demo:

```powershell
npm test
npm run lint
npm run build
```

## Notes

- Prescription photos must be JPG, JPEG, or PNG and no larger than 7 MB. The backend checks the image signature, rate-limits reads, and sends the image to Gemini `gemini-3.5-flash-lite`; it does not save the photo. Check Google's data-use terms for the API tier you use, and avoid including patient names or other personal details.
- `POST /api/read-prescription` returns structured transcription fields and marks unreadable fields for verification. The results are not medical advice: compare every detail with the original, and ask a doctor or pharmacist to confirm unclear medicine names or doses before use.
- `POST /api/check-interactions` looks for explicit medicine-pair mentions in U.S. FDA openFDA drug-label interaction sections. It requires manually confirmed medicine names, but it is not comprehensive; no match is not evidence that a combination is safe. Ask a doctor or pharmacist to review the full list and never stop or change prescribed medicines based on this tool.
- The legacy interaction list is a small reference only, not a complete clinical interaction service.
- MedSafe does not suggest generic substitutions. A pharmacist must confirm the active ingredient, strength, dosage form, route, and release type before considering an alternative.
- The schedule, taken checkboxes, My Health profile, and readings are stored in this browser's local storage. Use **Clear saved health data on this device** before sharing a browser profile; it does not delete reports saved to your account.
- This is not medical advice. Always confirm with your doctor or pharmacist.

## My Health

The **My Health** tab stores a patient profile and timestamped sugar/BP readings in local storage. It includes manual, voice, and meter-photo entry; photo reads use `POST /api/read-meter`. Safety statuses and trend warnings are rule-based in `src/healthSafety.js`, with limits in `src/data/thresholds.js`.

Use **Load demo data** to view fictional Ramesh Kumar readings, the rising-trend warning, and a critical sugar alert. If this browser already has a health profile or readings, the app asks for confirmation before replacing them. Add a real family WhatsApp number in the profile to test family alerts.

## Lab Report

The **Lab Report** tab can read a JPEG, PNG, WebP photo, or PDF (up to 7 MB) with `POST /api/read-lab-report`, or display its built-in demo without calling the API. Images are resized in the browser; PDFs are sent as selected. Hide patient names and IDs before uploading. Restart `npm run server` after changing `server.js` so the new endpoint is available.

The Lab Report **Health History** supports account registration and sign-in, private saved extracted reports, report comparison, actual-data trend charts, and a user-confirmed appointment summary download/WhatsApp share. Authenticated report endpoints derive the patient identity from a signed HTTP-only session cookie and only query that patient's records. Only extracted report data and user-entered date/lab details are saved; the original photo is not stored. Demo results cannot be saved. Set `MONGODB_URI` and a 32-character-or-longer `JWT_SECRET` to enable these account features. Existing medicine, health profile, and reading localStorage data is retained.

Auth and history endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/patient/reports`, `POST /api/patient/reports`, `GET /api/patient/reports/:reportId`, and `POST /api/patient/reports/compare`.
