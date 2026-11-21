
# 💊 MedSafe – Smart Healthcare & Medicine Management Platform

<p align="center">
  <b>Making healthcare information easier to understand and manage.</b>
</p>

<p align="center">
  A smart healthcare companion designed to help users understand prescriptions, analyze lab reports, track health readings and manage their medicines.
</p>

---

## 📌 About The Project

MedSafe is a smart healthcare management platform that helps users organize and understand important health information in one place.

It focuses on improving accessibility to medical information through prescription reading, lab report analysis, medicine management and health tracking.

The platform also includes Hindi language support to make healthcare information easier to understand.

---

## 🎯 Problem Statement

Patients often find it difficult to understand medical prescriptions, interpret laboratory reports and keep track of their medicines and health readings.

Important healthcare information can become difficult to manage between doctor visits.

MedSafe aims to simplify this process by providing a centralized platform for organizing and understanding health-related information.

---

## ✨ Key Features

### 1. 📄 Smart Prescription Reader
- Extracts medicine information from uploaded prescriptions.
- Displays medicine names and available details.
- Shows dosage, frequency, timing and duration when detected.
- Provides confidence information and verification options.
- Includes Hindi medicine instructions.

### 2. 💊 Medicine Interaction Checker
- Checks potential interactions between medicines.
- Provides medicine safety information.
- Includes warnings for relevant health conditions.
- Helps users identify information that should be discussed with a healthcare professional.

### 3. 🗓️ Smart Medicine Schedule
- Organizes medicine schedules.
- Supports morning, afternoon and night schedules.
- Allows users to track taken medicines.
- Includes medicine expiry warnings.
- Supports medicine information extracted from prescriptions.

### 4. 🧪 Lab Report Analyzer
- Extracts information from uploaded laboratory reports.
- Displays important test values.
- Provides report summaries.
- Supports Hindi translation.
- Presents health data through charts.

### 5. ❤️ Health Tracking
- Supports blood pressure and blood glucose readings.
- Reads uploaded health report images.
- Displays previous readings and history graphs.
- Provides range-based informational warnings.

### 6. 🌐 Hindi & English Language Support
- Hindi and English language support.
- Translation of medical information.
- Hindi text-to-speech support.
- Voice input for filling information.

### 7. 📲 Family Notifications
- Supports sharing health updates with family members through WhatsApp.
- Allows users to enter family contact information.

---

## 🛠️ Technology Stack

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3
- Vite

### Backend
- Node.js
- Express.js

### Database & Authentication
- MongoDB
- Mongoose
- JWT Authentication
- Cookie-based sessions

### AI & Integrations
- Google Gemini API
- FDA Drug Label API
- Browser Speech Recognition
- Text-to-Speech

---

## ⚙️ Project Architecture

MedSafe follows a frontend and backend architecture.

- **Frontend:** React application built using Vite.
- **Backend:** Express.js server handles API requests.
- **Database:** MongoDB stores application data.
- **AI Integration:** Gemini API supports AI-powered analysis features.
- **External API:** FDA Drug Label API provides medicine label information.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- MongoDB Atlas account
- Google Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/pragyasslwsb/Medsafe.git
```

### 2. Navigate to the Project

```bash
cd Medsafe
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root and configure the environment variables required by your application.

Example:

```env
PORT=3001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

Use the exact variable names expected by your backend configuration. Never commit your actual API keys or secrets.

### 5. Run the Application

Start the development environment:

```bash
npm run dev:all
```

Alternatively, use the individual frontend and backend scripts configured in `package.json`.

---

## 📂 Project Structure

```text
Medsafe/
│
├── api/
│   └── Backend API and server files
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── data/
│   └── App.jsx
│
├── public/
├── package.json
├── vite.config.js
└── README.md
```

*Note: Update this structure to match the actual repository folders.*

---

## 🔐 Privacy & Medical Disclaimer

- MedSafe is an informational healthcare support tool.
- It is not a replacement for professional medical advice.
- AI-generated results may contain errors and should be verified.
- Users should consult qualified healthcare professionals before making medical decisions.
- Do not rely on automated analysis for emergency medical decisions.

---

## 🔮 Future Improvements

- Improved medicine interaction coverage.
- More regional language support.
- Enhanced healthcare data visualization.
- Improved patient history management.
- Better integration with healthcare services.

---

## 👩‍💻 Developer

**Pragya Jain**

B.Tech Information Technology Student

GitHub: [@pragyasslwsb](https://github.com/pragyasslwsb)

---

<p align="center">
  <b>MedSafe – Making Healthcare Information More Accessible.</b>
</p>
