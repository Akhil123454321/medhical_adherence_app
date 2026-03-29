# MedAdhere — User Instructions

---

## Table of Contents

1. [Admin Instructions](#admin-instructions)
2. [Patient Instructions](#patient-instructions)
3. [CHW (Community Health Worker) Instructions](#chw-instructions)

---

---

# Admin Instructions

## Getting Started

### Logging In
1. Go to **https://medadhere.org/login**
2. Enter your admin email address and click **Continue**
3. Enter your password and click **Sign in**
4. You will be taken to the Admin Dashboard

### Changing Your Password
After logging in, click the **Change Password** button (key icon) in the top-right corner of any page. Enter your current password, then your new password twice. Click **Change Password** to save. Your new password must be at least 8 characters.

---

## Dashboard

The Dashboard gives you a high-level overview of the study:

- **Active Cohorts** — number of cohorts currently running
- **Active Caps** — number of smart pill bottles currently assigned to participants
- **Total Users** — total number of registered participants (patients + CHWs)
- **Adherence Rate** — overall percentage of doses confirmed by cap data

The bottom panels show your active cohorts and a live activity feed.

---

## Cohorts

### Creating a Cohort
1. Go to **Cohorts** in the left sidebar
2. Click **New Cohort**
3. Fill in the form:
   - **Name** — give the cohort a descriptive name (e.g., "IU Med School Spring 2026")
   - **Institution** — the school or organization
   - **Start Date / End Date** — the simulation period
   - **Description** — optional notes
   - **Cap Range** — the range of cap IDs assigned to this cohort (e.g., 1–50)
   - **Participant Emails** — paste participant email addresses, one per line or comma-separated
4. Click **Create Cohort**

When you include participant emails, the system automatically creates accounts for each person and sends them a verification email with a link to set their password. A credentials summary will appear after creation.

> **Note:** Participants log in with their email address. They do not need a password from you — they set it themselves via the verification link.

---

## User Management

### Viewing Users
Go to **Users** in the sidebar. The table shows all registered participants with their name, email, role, cohort, cap ID, dosing frequency, and paired assignment.

Use the **search bar** to find a specific person by name or email. Use the **Role** and **Cohort** filters to narrow the list.

### Editing a User
Click on any row to open the edit modal. You can change:
- **Role** — Patient, CHW, or Admin
- **Dosing Frequency** — 1x daily, 2x daily, or 3x daily
- **Assigned CHW** (for patients) — which CHW is paired with this patient
- **Assigned Patient** (for CHWs) — which patient this CHW monitors

Click **Save Changes** when done.

### Resetting Onboarding
If a participant needs to redo the pre-survey, open their edit modal and click **Reset Onboarding** (shown in red at the bottom of the modal). This clears their survey responses and sends them back through the onboarding survey on their next login.

### Importing Users via CSV
1. Click **Import CSV** in the top-right of the Users page
2. Prepare a CSV file with the following columns:
   - `email` (required)
   - `role` (required — must be `patient` or `chw`)
   - `first name` (optional)
   - `last name` (optional)
3. Upload the file and review the preview table
4. Click **Import** to create the accounts

If a first/last name is not provided, it will be derived from the email address. Accounts that already exist will be skipped.

---

## Randomization

The Randomization tool assigns roles, dosing frequencies, and pairings to a group of students automatically.

### Steps
1. Go to **Randomization** in the sidebar
2. **Select a Cohort** from the dropdown
3. **Upload a student list** — CSV with `firstName` and `lastName` columns
4. **Preview** — review the list (first 20 shown). The system will assign approximately:
   - 1/3 as Patients paired with a CHW
   - 1/3 as Patients without a CHW
   - 1/3 as CHWs
5. Click **Confirm & Save** to apply the assignments

Dosing regimens (BID or TID) are randomly assigned. CHWs are automatically paired with eligible patients.

---

## Cap Inventory

Go to **Caps** to see the full inventory of smart pill bottles.

- Use the **Status filter** to view Available, Assigned, or Broken caps
- Search by Cap ID
- Select multiple caps using the checkboxes to bulk-update their status (Mark Available or Mark Broken)

---

## Cap Event Logs

Go to **Logs** to upload and view cap data.

### Uploading Cap Logs
1. Click **Choose Files** and select one or more CSV files from Kyle's upload machine
2. Each CSV file must have the cap ID on the first line, followed by rows of `event,timestamp`
3. Click **Upload** — the system will confirm how many events were imported per cap

### Viewing a Cap Log
Enter a Cap ID in the input field and click **View Log** to see the full event history for that cap, including open/close timestamps and time between events.

---

## Question Bank

Go to **Questions** to manage the survey question bank.

- **Add a question** using the button in the top-right
- Set the question text, type (text, number, multiple choice, or yes/no), and category
- Use the **cohort toggle buttons** on each question to control which cohorts see that question
- Delete a question using the trash icon

---

## Data & Analytics

Go to **Data** to analyze adherence results.

1. Select a cohort from the dropdown
2. View summary stats (self-reported, CHW recorded, CHW notified, cap confirmed)
3. Toggle between **Bar** and **Line** chart to view daily adherence trends
4. Scroll down for the **per-patient breakdown table**, which shows each participant's adherence counts and a comparison between self-reported and cap-verified data
5. Click **Export CSV** to download the full adherence dataset for that cohort

---

---

# Patient Instructions

## Getting Started

### Setting Up Your Account (First Time)
1. You will receive an **email from MedAdhere** with a link to set up your account
2. Click the link in the email — it will open a page where you create your password
3. Your password must be at least 8 characters
4. After setting your password, you will be taken to the **onboarding survey** — complete all steps before accessing your home page

### Logging In (Returning Users)
1. Go to **https://medadhere.org/login**
2. Enter your email address and click **Continue**
3. Enter your password and click **Sign in**

### Changing Your Password
After logging in, your name appears in the top-right corner. If you need to change your password, contact your study administrator.

---

## Onboarding Survey

The first time you log in, you will complete a **4-step pre-exercise survey** before accessing your home page. This is required and takes approximately 5–10 minutes.

### Step 1: Consent
Read the study information carefully. Check the box to confirm you understand and consent to participate, then click **Next**.

### Step 2: Attitudes & Unique Identifier
- Create your **Unique Identifier**: the first 3 letters of your birth month + the last 3 letters of your mother's maiden name + the last 4 digits of your phone number
  - Example: If born in January, mother's maiden name is Smith, phone ends in 8409 → **JANITH8409**
  - **Write this down — you will need it again for the post-exercise survey**
- Answer the attitude questions using the 5-point scales provided
- Answer the question about your anticipated medication adherence percentage

### Step 3: Demographics
Complete the demographic questions (gender, age, relationship status, dependents, medications, etc.). Some questions may vary depending on your school/program.

### Step 4: Stressors (Optional)
Select any life stressors that apply to you. This step is optional — you may skip it or select "None" and continue.

After completing all steps, you will be taken to your **Patient Home** page.

---

## Patient Home Page

Your home page has three main sections:

### Recording Your Medication
When you take your medication, tap the large **"I took my medication"** button. The app will record the time and date of your dose.

- If you have already recorded a dose today, you will see a green checkmark that says **"Taken today"** instead of the button
- You do not need to tap the button multiple times per day — one tap records one dose for that day

### Study Info
The right side of your screen shows:
- Your cohort name and institution
- Simulation start and end dates
- Time remaining in the study
- Your dosing regimen (e.g., Once daily, Twice daily, Three times daily)
- Your assigned Cap ID (the smart pill bottle number)
- Your assigned CHW's name (if applicable)

### Adherence History
Below the main section, you can see your **last 14 days** of recorded doses. Each entry shows:
- The date and time
- How it was recorded (by you, by your CHW, or a reminder from your CHW)

---

## Post-Exercise Survey

After the simulation ends, a card will appear on your home page with a link to the **Post-Exercise Survey**.

> The post-exercise survey is only available **on or after the cohort end date**. If the link is grayed out, the simulation has not yet ended.

### Completing the Survey
1. Click **"Complete after the simulation ends"**
2. **Step 1**: Enter your unique identifier (the one you created during onboarding) and confirm your assigned role
3. **Step 2**: Answer updated attitude questions
4. **Step 3**: Provide open-ended feedback (optional)
5. **Step 4**: Answer questions specific to your experience as a patient

Once submitted, you will see a confirmation message. You cannot re-submit the survey.

---

---

# CHW Instructions

## Getting Started

### Setting Up Your Account (First Time)
1. You will receive an **email from MedAdhere** with a link to set up your account
2. Click the link in the email — it will open a page where you create your password
3. Your password must be at least 8 characters
4. After setting your password, you will be taken to the **onboarding survey** — complete all steps before accessing your home page

### Logging In (Returning Users)
1. Go to **https://medadhere.org/login**
2. Enter your email address and click **Continue**
3. Enter your password and click **Sign in**

---

## Onboarding Survey

The onboarding survey is the same as for patients (see Patient Instructions above). Complete all 4 steps — it takes approximately 5–10 minutes.

**Remember to write down your Unique Identifier** — you will need it for the post-exercise survey.

---

## CHW Home Page

Your home page shows a list of the patients assigned to you. Each patient card shows their name, email, and today's activity.

### Recording That a Patient Took Their Medication
If you observed or confirmed that your patient took their medication:
1. Click **"Record taken"** on the patient's card
2. A contact method selector will appear — choose how you confirmed this:
   - Text
   - Email
   - Phone call
   - In person
   - Other
3. Click **Confirm** — the record will appear in the patient's history immediately

### Sending a Reminder to a Patient
If you reminded your patient to take their medication:
1. Click **"Notified patient"** on the patient's card
2. Select the contact method you used (text, email, phone, in person, or other)
3. Click **Confirm** — this logs that you reached out

> **Note:** "Record taken" means you confirmed the patient actually took the medication. "Notified patient" means you sent a reminder but have not yet confirmed they took it.

### Viewing Today's Activity
Each patient card shows a log of today's entries below the action buttons, including:
- Whether the patient self-reported
- Whether you recorded a dose on their behalf
- Whether you sent a reminder
- The time and contact method for each entry

---

## Post-Exercise Survey

After the simulation ends, a card will appear at the top of your home page with a link to the **Post-Exercise Survey**.

> The post-exercise survey is only available **on or after the cohort end date**.

### Completing the Survey
1. Click **"Complete after the simulation ends"**
2. **Step 1**: Enter your unique identifier and confirm your assigned role
3. **Step 2**: Answer updated attitude questions
4. **Step 3**: Provide open-ended feedback (optional)
5. **Step 4**: Answer CHW-specific questions about strategies you used and barriers you faced

Once submitted, you will see a confirmation message. You cannot re-submit the survey.

---

## Tips for CHWs

- **Check the app regularly** — your patient may have already self-reported before you reach out
- **Contact method matters** — always select the correct contact method so the study has accurate data on how CHW support was delivered
- **You do not need to record every day** — only log actions when you actually took one
- **If you have no patients assigned**, contact your study administrator

---

*For technical issues, contact your study administrator.*
