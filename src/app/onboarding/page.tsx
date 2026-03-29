"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import LikertScale from "@/components/survey/LikertScale";
import CheckboxSelect from "@/components/survey/CheckboxSelect";

// ── Scale options ────────────────────────────────────────────────────────────
const AGREE = [
  "Strongly disagree",
  "Disagree",
  "Neither agree nor disagree",
  "Agree",
  "Strongly agree",
];
const DIFFICULTY = [
  "Very difficult",
  "Slightly difficult",
  "Neither difficult nor easy",
  "Slightly easy",
  "Very easy",
];
const LIKELIHOOD = [
  "Very unlikely",
  "Slightly unlikely",
  "Neutral",
  "Slightly likely",
  "Very likely",
];
const ADHERENCE_PCT = ["<60%", "60-70%", "70-80%", "80-90%", "90-100%"];
const MATCH_STATUS = [
  "Did not apply",
  "Military",
  "Matched through regular match",
  "Matched through SOAP",
  "Applied but did not match through the match nor SOAP",
];
const STRESSORS = [
  "Staying away from home (i.e. in a hotel or temporary housing)",
  "Moving",
  "Changing to a new job or new school",
  "Separation from a serious romantic relationship",
  "Housing instability",
  "Food insecurity",
  "Education debt",
  "Credit card debt (bills you can't pay off within a month)",
  "Death or medical problem of a loved one",
  "Death or medical problem of a pet",
  "Loved one in prison",
  "Substance use disorder",
  "Mental health disorder (anxiety, depression, ADHD)",
  "Academic probation or disciplinary action at school",
  "Intimate partner violence",
  "Other",
];

// ── Study information text ───────────────────────────────────────────────────
const MED_INFO = `You are being asked to complete this survey as a part of a research project about an educational simulation about medication adherence. This exercise involves taking placebo medications for a week with or without the assistance of a classmate serving in the role of a community health worker. You will be asked to complete a short survey at the beginning and end of the exercise. The exercise itself and the surveys are a required part of your course, but the inclusion of your data in the research study is voluntary. There is no compensation for this study. However, you may be eligible to join a lottery to win a gift card with a value of $50; the number of lottery entries you receive will be based on the level of medication adherence achieved. The risk of educational or personal harm to you by this exercise is minimal. No full personally identifiable information will be collected, and to minimize the risk that someone could extrapolate your identity from the unique identifier code used, the data will only be stored on an encrypted device and only be accessible to faculty personnel. There is a risk of adverse reactions (poor taste, allergies) to the medication placebos given; to minimize this risk, the medication placebos are commercially available food products. If you have food allergies, contact the study investigator (Jenny Baenziger, jbaenz@iu.edu) before starting the exercise. Your participation or abstaining from this study will not affect your course grade; the course director will not be informed of who elected in nor out of the study. If you have questions about the study or if you would like your survey responses to be excluded from the study, please contact Jenny Baenziger, MD (jbaenz@iu.edu).`;

const PHARMACY_INFO = `You are being asked to complete this survey as a part of a research project about an educational simulation about medication adherence. You will be asked to complete a short survey at the beginning and end of the exercise. The exercise itself and the surveys are a required part of your course, but the inclusion of your data in the research study is voluntary. There is no compensation for this study. The risk of educational or personal harm to you by this exercise is minimal but would include: loss of personal data provided in the survey and risk of adverse reactions (poor taste, allergies) to the medication placebos given. The medication placebos will be commercially available food products. If you have food allergies, contact the study investigator (Kyle Hultgren, khultgre@purdue.edu) before starting the exercise. Your participation or abstaining from this study will not affect your course grade; the course director will not be informed of who elected in nor out of the study until after grades are finalized. If you have questions about the study or if you would like your survey responses to be excluded from the study, please contact Kyle Hultgren, PharmD (khultgre@purdue.edu).`;

// ── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
  role: string;
  cohort: { institution: string } | null;
}

type Answers = {
  uniqueIdentifier: string;
  difficultyRating: string;
  chwImprovesAdherence: string;
  chwWorthwhile: string;
  advocateLikelihood: string;
  anticipatedAdherence: string;
  gender: string;
  age: string;
  relationshipStatus: string;
  dependents: string;
  gpa: string;
  step2Score: string;
  matchStatus: string;
  dailyMedications: string;
  helpedLovedOne: string;
  dataConsent: string;
  stressors: string[];
};

const TOTAL_STEPS = 4;

// ── Inline radio component ───────────────────────────────────────────────────
function RadioQ({
  question,
  options,
  value,
  onChange,
}: {
  question: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium text-gray-800 leading-snug">{question}</p>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`w-full text-left rounded-lg border px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${
              value === opt
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span
              className={`flex-shrink-0 h-4 w-4 rounded-full border flex items-center justify-center ${
                value === opt
                  ? "border-indigo-500 bg-indigo-500"
                  : "border-gray-300 bg-white"
              }`}
            >
              {value === opt && (
                <span className="h-2 w-2 rounded-full bg-white" />
              )}
            </span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [consented, setConsented] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    uniqueIdentifier: "",
    difficultyRating: "",
    chwImprovesAdherence: "",
    chwWorthwhile: "",
    advocateLikelihood: "",
    anticipatedAdherence: "",
    gender: "",
    age: "",
    relationshipStatus: "",
    dependents: "",
    gpa: "",
    step2Score: "",
    matchStatus: "",
    dailyMedications: "",
    helpedLovedOne: "",
    dataConsent: "",
    stressors: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d))
      .catch(() => setProfile(null))
      .finally(() => setLoadingProfile(false));
  }, []);

  const isPharmacy = profile?.cohort?.institution
    ?.toLowerCase()
    .includes("pharmacy");
  const isPatient = profile?.role === "patient";
  const studyTitle = isPharmacy
    ? "Study information for pharmacy students"
    : "Study information for medical students";
  const studyInfo = isPharmacy ? PHARMACY_INFO : MED_INFO;

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    if (step === 0) return consented;
    if (step === 1) {
      return (
        answers.uniqueIdentifier.trim().length >= 3 &&
        !!answers.difficultyRating &&
        !!answers.chwImprovesAdherence &&
        !!answers.chwWorthwhile &&
        !!answers.advocateLikelihood &&
        (!isPatient || !!answers.anticipatedAdherence)
      );
    }
    if (step === 2) {
      return (
        !!answers.gender &&
        !!answers.age &&
        !!answers.relationshipStatus &&
        !!answers.dependents &&
        !!answers.dailyMedications &&
        !!answers.helpedLovedOne &&
        (!isPharmacy || answers.gpa.trim().length > 0) &&
        (isPharmacy || (answers.step2Score.trim().length > 0 && !!answers.matchStatus)) &&
        !!answers.dataConsent
      );
    }
    return true; // step 3: stressors optional
  }

  function handleNext() {
    if (!validate()) {
      setError(
        step === 0
          ? "Please check the box to continue."
          : "Please answer all questions before continuing."
      );
      return;
    }
    setError("");
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setError("");
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/survey-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyType: "pre", answers }),
      });
      if (res.ok) {
        router.push(profile?.role === "chw" ? "/chw" : "/patient");
      } else {
        setError("Failed to submit. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Pre-Exercise Survey
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-5 h-1.5 rounded-full bg-gray-200">
          <div
            className="h-1.5 rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          {/* ── STEP 0: Study information ──────────────────────────────── */}
          {step === 0 && (
            <>
              <h2 className="font-semibold text-gray-900">{studyTitle}</h2>
              <div className="max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed border border-gray-200">
                {studyInfo}
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">
                  I have read and understood the above study information and
                  consent to participate.
                </span>
              </label>
            </>
          )}

          {/* ── STEP 1: Unique ID + attitudes ──────────────────────────── */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-800">
                  Your unique identifier
                </p>
                <p className="text-xs text-gray-500 leading-snug">
                  First 3 letters of your birth month + last 3 letters of your
                  mother&apos;s maiden name + last 4 digits of your phone
                  number.{" "}
                  <span className="italic text-gray-400">
                    Example: JANITH8409
                  </span>
                </p>
                <input
                  type="text"
                  value={answers.uniqueIdentifier}
                  onChange={(e) =>
                    set("uniqueIdentifier", e.target.value.toUpperCase())
                  }
                  placeholder="e.g. JANITH8409"
                  maxLength={20}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono text-gray-900 uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <LikertScale
                question="Rate the level of difficulty that you think it is for patients to take all medications as prescribed by a physician."
                options={DIFFICULTY}
                value={answers.difficultyRating}
                onChange={(v) => set("difficultyRating", v)}
              />
              <LikertScale
                question="Working with a community health worker (CHW) improves medication adherence."
                options={AGREE}
                value={answers.chwImprovesAdherence}
                onChange={(v) => set("chwImprovesAdherence", v)}
              />
              <LikertScale
                question="Investments in community health workers (CHW) are a worthwhile expenditure for improving a patient's health."
                options={AGREE}
                value={answers.chwWorthwhile}
                onChange={(v) => set("chwWorthwhile", v)}
              />
              <LikertScale
                question="How likely are you to advocate for including a community health worker in patient care in the future?"
                options={LIKELIHOOD}
                value={answers.advocateLikelihood}
                onChange={(v) => set("advocateLikelihood", v)}
              />

              {isPatient && (
                <RadioQ
                  question="If you are assigned to be a patient for this exercise, what percentage of medications do you anticipate you will take as prescribed?"
                  options={ADHERENCE_PCT}
                  value={answers.anticipatedAdherence}
                  onChange={(v) => set("anticipatedAdherence", v)}
                />
              )}
            </>
          )}

          {/* ── STEP 2: Demographics ───────────────────────────────────── */}
          {step === 2 && (
            <>
              <RadioQ
                question="What is your gender?"
                options={["Male", "Female"]}
                value={answers.gender}
                onChange={(v) => set("gender", v)}
              />
              <RadioQ
                question="What is your age?"
                options={["21-25", "26-30", "31-35", "35-40", "41+"]}
                value={answers.age}
                onChange={(v) => set("age", v)}
              />
              <RadioQ
                question="Which of the following best describes you?"
                options={[
                  "Single",
                  "Married",
                  "Partnered but do not cohabitate",
                  "Cohabitate with a partner",
                ]}
                value={answers.relationshipStatus}
                onChange={(v) => set("relationshipStatus", v)}
              />
              <RadioQ
                question="How many dependents are under your care as a parent or guardian?"
                options={["None", "1", "2", "3", "4", "5+"]}
                value={answers.dependents}
                onChange={(v) => set("dependents", v)}
              />

              {isPharmacy && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-800">
                    What is your GPA?
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    step={0.01}
                    value={answers.gpa}
                    onChange={(e) => set("gpa", e.target.value)}
                    placeholder="e.g. 3.50"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {!isPharmacy && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-800">
                    What was your Step 2 score?
                  </p>
                  <input
                    type="text"
                    value={answers.step2Score}
                    onChange={(e) => set("step2Score", e.target.value)}
                    placeholder="e.g. 240"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {!isPharmacy && (
                <RadioQ
                  question="What is your Match status?"
                  options={MATCH_STATUS}
                  value={answers.matchStatus}
                  onChange={(v) => set("matchStatus", v)}
                />
              )}

              <RadioQ
                question="Are you on any daily, chronic medications?"
                options={[
                  "No",
                  "Yes, 1-2 medicines per day",
                  "Yes, 3+ medicines per day",
                ]}
                value={answers.dailyMedications}
                onChange={(v) => set("dailyMedications", v)}
              />
              <RadioQ
                question="Have you ever assisted a loved one in taking medications?"
                options={[
                  "No",
                  "Yes, short-term medications",
                  "Yes, long-term medications",
                ]}
                value={answers.helpedLovedOne}
                onChange={(v) => set("helpedLovedOne", v)}
              />

              <RadioQ
                question="I agree to have my survey data included in an educational study about this simulation exercise. I understand my data is not personally identifiable in any way."
                options={["Yes", "No"]}
                value={answers.dataConsent}
                onChange={(v) => set("dataConsent", v)}
              />
            </>
          )}

          {/* ── STEP 3: Stressors ──────────────────────────────────────── */}
          {step === 3 && (
            <CheckboxSelect
              question="How many of the following stressors applied to you in the six months before the simulation exercise, or do you anticipate will apply within six months after the exercise? (Check all that apply)"
              options={STRESSORS}
              values={answers.stressors}
              onChange={(v) => set("stressors", v)}
            />
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Navigation */}
          <div
            className={`flex ${step > 0 ? "justify-between" : "justify-end"} gap-3`}
          >
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit & Continue"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
