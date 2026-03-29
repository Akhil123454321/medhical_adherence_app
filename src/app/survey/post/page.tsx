"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import LikertScale from "@/components/survey/LikertScale";
import CheckboxSelect from "@/components/survey/CheckboxSelect";
import RatingScale from "@/components/survey/RatingScale";

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
const EMPATHY = [
  "Decreased significantly",
  "Decreased slightly",
  "Unchanged",
  "Increased slightly",
  "Increased significantly",
];
const SIMULATION_ROLES = [
  "BID Patient with an assigned community health worker",
  "TID Patient with an assigned community health worker",
  "BID Patient withOUT an assigned community health worker",
  "TID Patient withOUT an assigned community health worker",
  "Community health worker for a BID patient",
  "Community health worker for a TID patient",
];
const PATIENT_BARRIERS = [
  "Busy schedule",
  "Forgetfulness",
  "Family responsibilities",
  "Medication frequency",
  "Inconvenient timing of doses",
  "Medication taste",
  "Medication side effects",
  "Other priorities",
  "Other",
];
const PATIENT_STRATEGIES = [
  "Being paired with a CHW",
  "Setting a reminder",
  "Leaving the pill bottle out",
  "Leaving a note out",
  "Other",
];
const CHW_BARRIERS = [
  "Busy schedule",
  "Forgetfulness",
  "Family responsibilities",
  "Medication frequency",
  "Inconvenient timing of doses",
  "Didn't want to bother my patient",
  "Didn't know how to contact my patient",
  "Other",
];
const CHW_STRATEGIES = [
  "Text reminders",
  "Call reminders",
  "Discussion of strategies to help them remember",
  "Other",
];
const PCT_TAKEN = ["<60%", "60-70%", "70-80%", "80-90%", "90-100%"];
const MISSED = ["Yes", "No", "Unsure"];

// ── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
  role: string;
  dosingRegimen: string | null;
  assignedChwId: string | null;
  assignedPatient: { dosingRegimen: string | null } | null;
  cohort: { endDate: string; name: string } | null;
}

type PostAnswers = {
  uniqueIdentifier: string;
  assignedRole: string;
  difficultyRating: string;
  chwImprovesAdherence: string;
  chwWorthwhile: string;
  advocateLikelihood: string;
  empathyChange: string;
  educationalValue: number | null;
  beneficialAspects: string;
  difficultAspects: string;
  otherComments: string;
  missedMoreThanExpected: string;
  percentageTaken: string;
  barriers: string[];
  strategiesUsed: string[];
  strategiesOther: string;
  chwHelpedRemember: string;
  betterUnderstandingCHW_patient: string;
  pillBottleRating: number | null;
  pillBottleFeedback: string;
  betterUnderstandingCHW_noChw: string;
  pillBottleRating_noChw: number | null;
  pillBottleFeedback_noChw: string;
  chwBarriers: string[];
  chwBarriersOther: string;
  chwStrategies: string[];
  betterUnderstandingCHW_chw: string;
};

const TOTAL_STEPS = 4;

// ── Role helpers ─────────────────────────────────────────────────────────────
function isPatientWithChw(role: string) {
  return role.includes("Patient") && role.includes("with an assigned");
}
function isPatientWithoutChw(role: string) {
  return role.includes("Patient") && role.includes("withOUT");
}
function isChwRole(role: string) {
  return role.includes("Community health worker");
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Reusable sub-components ──────────────────────────────────────────────────
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
              {value === opt && <span className="h-2 w-2 rounded-full bg-white" />}
            </span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
      />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PostSurveyPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [surveyAvailable, setSurveyAvailable] = useState(true);
  const [preUniqueId, setPreUniqueId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [answers, setAnswers] = useState<PostAnswers>({
    uniqueIdentifier: "",
    assignedRole: "",
    difficultyRating: "",
    chwImprovesAdherence: "",
    chwWorthwhile: "",
    advocateLikelihood: "",
    empathyChange: "",
    educationalValue: null,
    beneficialAspects: "",
    difficultAspects: "",
    otherComments: "",
    missedMoreThanExpected: "",
    percentageTaken: "",
    barriers: [],
    strategiesUsed: [],
    strategiesOther: "",
    chwHelpedRemember: "",
    betterUnderstandingCHW_patient: "",
    pillBottleRating: null,
    pillBottleFeedback: "",
    betterUnderstandingCHW_noChw: "",
    pillBottleRating_noChw: null,
    pillBottleFeedback_noChw: "",
    chwBarriers: [],
    chwBarriersOther: "",
    chwStrategies: [],
    betterUnderstandingCHW_chw: "",
  });

  useEffect(() => {
    async function init() {
      try {
        const [profileRes, postRes, preRes] = await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/survey-responses?surveyType=post"),
          fetch("/api/survey-responses?surveyType=pre"),
        ]);

        const profileData: UserProfile = await profileRes.json();
        setProfile(profileData);

        // Check cohort end date
        if (profileData.cohort?.endDate) {
          const today = new Date().toISOString().split("T")[0];
          if (today < profileData.cohort.endDate) {
            setSurveyAvailable(false);
          }
        }

        // Check if already submitted
        const postData = await postRes.json();
        if (Array.isArray(postData) && postData.length > 0) {
          setAlreadySubmitted(true);
        }

        // Get pre-survey unique identifier for validation
        const preData = await preRes.json();
        if (Array.isArray(preData) && preData.length > 0) {
          const id = preData[0].answers?.uniqueIdentifier;
          if (id) setPreUniqueId(String(id));
        }

        // Pre-populate assigned role
        setAnswers((prev) => ({
          ...prev,
          assignedRole: guessRole(profileData),
        }));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function guessRole(p: UserProfile): string {
    const dosing = p.dosingRegimen;
    const bid = dosing === "2x" ? "BID" : dosing === "3x" ? "TID" : "";
    const patientDosing = p.assignedPatient?.dosingRegimen;
    const chwBid =
      patientDosing === "2x" ? "BID" : patientDosing === "3x" ? "TID" : "";

    if (p.role === "chw") {
      return chwBid ? `Community health worker for a ${chwBid} patient` : "";
    }
    if (p.role === "patient") {
      const hasCHW = !!p.assignedChwId;
      if (bid) {
        return hasCHW
          ? `${bid} Patient with an assigned community health worker`
          : `${bid} Patient withOUT an assigned community health worker`;
      }
    }
    return "";
  }

  function set<K extends keyof PostAnswers>(key: K, value: PostAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    if (step === 0)
      return (
        answers.uniqueIdentifier.trim().length >= 3 && !!answers.assignedRole
      );
    if (step === 1)
      return (
        !!answers.difficultyRating &&
        !!answers.chwImprovesAdherence &&
        !!answers.chwWorthwhile &&
        !!answers.advocateLikelihood &&
        !!answers.empathyChange &&
        answers.educationalValue !== null
      );
    return true;
  }

  function handleNext() {
    if (!validate()) {
      setError("Please answer all questions before continuing.");
      return;
    }
    // Validate unique identifier against pre-survey on step 0
    if (step === 0 && preUniqueId) {
      if (
        answers.uniqueIdentifier.toUpperCase().trim() !==
        preUniqueId.toUpperCase().trim()
      ) {
        setError(
          "Unique identifier doesn't match your pre-survey response. Please check and try again."
        );
        return;
      }
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
        body: JSON.stringify({ surveyType: "post", answers }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError("Failed to submit. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  // ── Not yet available ────────────────────────────────────────────────────
  if (!surveyAvailable) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Not available yet</h1>
          <p className="text-sm text-gray-500">
            The post-exercise survey will be available from{" "}
            <span className="font-semibold text-gray-700">
              {profile?.cohort?.endDate
                ? formatDate(profile.cohort.endDate)
                : "the cohort end date"}
            </span>
            .
          </p>
          <button
            onClick={() =>
              router.push(profile?.role === "chw" ? "/chw" : "/patient")
            }
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  // ── Already submitted ────────────────────────────────────────────────────
  if (alreadySubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Already submitted</h1>
          <p className="text-sm text-gray-500">
            You&apos;ve already completed the post-exercise survey. Thank you
            for your participation!
          </p>
          <button
            onClick={() =>
              router.push(profile?.role === "chw" ? "/chw" : "/patient")
            }
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  // ── Submitted just now ───────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Survey submitted!</h1>
          <p className="text-sm text-gray-500">
            Thank you for completing the post-exercise survey.
          </p>
          <button
            onClick={() =>
              router.push(profile?.role === "chw" ? "/chw" : "/patient")
            }
            className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const role = answers.assignedRole;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Post-Exercise Survey</h1>
          {profile?.cohort?.name && (
            <p className="mt-0.5 text-xs text-gray-400">{profile.cohort.name}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-5 h-1.5 rounded-full bg-gray-200">
          <div
            className="h-1.5 rounded-full bg-teal-600 transition-all duration-300"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          {/* ── STEP 0: Unique ID + Role ──────────────────────────────── */}
          {step === 0 && (
            <>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600 leading-relaxed">
                Please enter your unique identifier. As a reminder, your unique
                identifier is: first 3 letters of your birth month + last 3
                letters of your mother&apos;s maiden name + last 4 digits of
                your phone number.{" "}
                <span className="italic text-gray-400">
                  Example: JANITH8409
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-800">
                  Your unique identifier
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
                {preUniqueId && (
                  <p className="text-xs text-gray-400">
                    Must match what you entered in the pre-survey.
                  </p>
                )}
              </div>
              <RadioQ
                question="What was your assigned role in the simulation?"
                options={SIMULATION_ROLES}
                value={answers.assignedRole}
                onChange={(v) => set("assignedRole", v)}
              />
            </>
          )}

          {/* ── STEP 1: Updated attitudes ────────────────────────────── */}
          {step === 1 && (
            <>
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
              <LikertScale
                question="How did this simulation change your empathy for patients?"
                options={EMPATHY}
                value={answers.empathyChange}
                onChange={(v) => set("empathyChange", v)}
              />
              <RatingScale
                question="Please rate the educational value of this exercise."
                value={answers.educationalValue}
                onChange={(v) => set("educationalValue", v)}
                minLabel="Not valuable at all"
                maxLabel="Extremely valuable"
              />
            </>
          )}

          {/* ── STEP 2: Open-ended feedback ──────────────────────────── */}
          {step === 2 && (
            <>
              <Textarea
                label="What was beneficial about this exercise that should be kept for future classes?"
                value={answers.beneficialAspects}
                onChange={(v) => set("beneficialAspects", v)}
                placeholder="Share what worked well…"
              />
              <Textarea
                label="What was difficult about this exercise that needs to be improved or changed?"
                value={answers.difficultAspects}
                onChange={(v) => set("difficultAspects", v)}
                placeholder="Share what could be improved…"
              />
              <Textarea
                label="Other comments, suggestions, and feedback"
                value={answers.otherComments}
                onChange={(v) => set("otherComments", v)}
                placeholder="Any other thoughts…"
              />
            </>
          )}

          {/* ── STEP 3: Role-specific ────────────────────────────────── */}
          {step === 3 && (
            <>
              {/* Patient WITH CHW */}
              {isPatientWithChw(role) && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Additional questions — Patient with CHW
                  </p>
                  <RadioQ
                    question="Did you miss more medication doses than you expected you would?"
                    options={MISSED}
                    value={answers.missedMoreThanExpected}
                    onChange={(v) => set("missedMoreThanExpected", v)}
                  />
                  <RadioQ
                    question="What percentage of medications do you think you took as prescribed?"
                    options={PCT_TAKEN}
                    value={answers.percentageTaken}
                    onChange={(v) => set("percentageTaken", v)}
                  />
                  <CheckboxSelect
                    question="What barriers made it challenging to adhere to your medication? (Check all that apply)"
                    options={PATIENT_BARRIERS}
                    values={answers.barriers}
                    onChange={(v) => set("barriers", v)}
                  />
                  <CheckboxSelect
                    question="What strategies improved your medication adherence? (Check all that apply)"
                    options={PATIENT_STRATEGIES}
                    values={answers.strategiesUsed}
                    onChange={(v) => set("strategiesUsed", v)}
                  />
                  {answers.strategiesUsed.includes("Other") && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-800">
                        Other strategy (please describe)
                      </p>
                      <input
                        type="text"
                        value={answers.strategiesOther}
                        onChange={(e) => set("strategiesOther", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  <LikertScale
                    question="Having a community health worker helped me remember to take my medication."
                    options={AGREE}
                    value={answers.chwHelpedRemember}
                    onChange={(v) => set("chwHelpedRemember", v)}
                  />
                  <LikertScale
                    question="Because of this project I have a better understanding of the value of community health workers."
                    options={AGREE}
                    value={answers.betterUnderstandingCHW_patient}
                    onChange={(v) => set("betterUnderstandingCHW_patient", v)}
                  />
                  <RatingScale
                    question="Please rate your experience using the pill bottles."
                    value={answers.pillBottleRating}
                    onChange={(v) => set("pillBottleRating", v)}
                    minLabel="Lots of problems"
                    maxLabel="Straightforward"
                  />
                  <Textarea
                    label="Please provide feedback about the pill bottles."
                    value={answers.pillBottleFeedback}
                    onChange={(v) => set("pillBottleFeedback", v)}
                  />
                </>
              )}

              {/* Patient WITHOUT CHW */}
              {isPatientWithoutChw(role) && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Additional questions — Patient without CHW
                  </p>
                  <RadioQ
                    question="Did you miss more medication doses than you expected?"
                    options={MISSED}
                    value={answers.missedMoreThanExpected}
                    onChange={(v) => set("missedMoreThanExpected", v)}
                  />
                  <RadioQ
                    question="What percentage of medications do you think you took as prescribed?"
                    options={PCT_TAKEN}
                    value={answers.percentageTaken}
                    onChange={(v) => set("percentageTaken", v)}
                  />
                  <CheckboxSelect
                    question="What barriers made it challenging to adhere to your medication? (Check all that apply)"
                    options={PATIENT_BARRIERS}
                    values={answers.barriers}
                    onChange={(v) => set("barriers", v)}
                  />
                  <CheckboxSelect
                    question="What strategies improved your medication adherence? (Check all that apply)"
                    options={PATIENT_STRATEGIES}
                    values={answers.strategiesUsed}
                    onChange={(v) => set("strategiesUsed", v)}
                  />
                  {answers.strategiesUsed.includes("Other") && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-800">
                        Other strategy (please describe)
                      </p>
                      <input
                        type="text"
                        value={answers.strategiesOther}
                        onChange={(e) => set("strategiesOther", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  <LikertScale
                    question="Because of this project I have a better understanding of the value of CHWs."
                    options={AGREE}
                    value={answers.betterUnderstandingCHW_noChw}
                    onChange={(v) => set("betterUnderstandingCHW_noChw", v)}
                  />
                  <RatingScale
                    question="Please rate your experience using the pill bottles."
                    value={answers.pillBottleRating_noChw}
                    onChange={(v) => set("pillBottleRating_noChw", v)}
                    minLabel="Lots of problems"
                    maxLabel="Straightforward"
                  />
                  <Textarea
                    label="Please provide feedback about the pill bottles."
                    value={answers.pillBottleFeedback_noChw}
                    onChange={(v) => set("pillBottleFeedback_noChw", v)}
                  />
                </>
              )}

              {/* CHW */}
              {isChwRole(role) && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Additional questions — Community health worker
                  </p>
                  <CheckboxSelect
                    question="What barriers made it challenging to assist your partner with medication adherence? (Check all that apply)"
                    options={CHW_BARRIERS}
                    values={answers.chwBarriers}
                    onChange={(v) => set("chwBarriers", v)}
                  />
                  {answers.chwBarriers.includes("Other") && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-800">
                        Other barrier (please describe)
                      </p>
                      <input
                        type="text"
                        value={answers.chwBarriersOther}
                        onChange={(e) => set("chwBarriersOther", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  <CheckboxSelect
                    question="What strategies did you use to assist your assigned patient with remembering to take their medications? (Check all that apply)"
                    options={CHW_STRATEGIES}
                    values={answers.chwStrategies}
                    onChange={(v) => set("chwStrategies", v)}
                  />
                  <LikertScale
                    question="Because of this project I have a better understanding of the value of CHWs."
                    options={AGREE}
                    value={answers.betterUnderstandingCHW_chw}
                    onChange={(v) => set("betterUnderstandingCHW_chw", v)}
                  />
                </>
              )}

              {!isPatientWithChw(role) &&
                !isPatientWithoutChw(role) &&
                !isChwRole(role) && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Please go back and select your assigned role to see the
                    relevant questions.
                  </p>
                )}
            </>
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
                className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit Survey"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
