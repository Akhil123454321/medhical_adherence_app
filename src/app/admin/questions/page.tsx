"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import QuestionForm from "@/components/admin/QuestionForm";
import { mockQuestions, mockCohorts } from "@/lib/mock-data";
import { Question } from "@/lib/types";
import { Plus, Trash2, Tag } from "lucide-react";

const typeLabels: Record<string, string> = {
  text: "Text",
  number: "Number",
  select: "Multiple Choice",
  boolean: "Yes/No",
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");

  const categories = [...new Set(questions.map((q) => q.category))];

  const filteredQuestions =
    filterCategory === "all"
      ? questions
      : questions.filter((q) => q.category === filterCategory);

  function handleAddQuestion(data: {
    text: string;
    type: "text" | "number" | "select" | "boolean";
    category: string;
    options?: string[];
  }) {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      ...data,
      cohortIds: [],
    };
    setQuestions([...questions, newQuestion]);
    setShowAddModal(false);
  }

  function handleDelete(id: string) {
    setQuestions(questions.filter((q) => q.id !== id));
  }

  function toggleCohort(questionId: string, cohortId: string) {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const cohortIds = q.cohortIds.includes(cohortId)
          ? q.cohortIds.filter((c) => c !== cohortId)
          : [...q.cohortIds, cohortId];
        return { ...q, cohortIds };
      })
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage questions asked during patient signup
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filterCategory === "all" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setFilterCategory("all")}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={filterCategory === cat ? "primary" : "secondary"}
            size="sm"
            onClick={() => setFilterCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredQuestions.map((question) => (
          <Card key={question.id}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{question.text}</p>
                  <Badge variant="default">{typeLabels[question.type]}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {question.category}
                  </span>
                </div>
                {question.options && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {question.options.map((opt) => (
                      <Badge key={opt} variant="default">
                        {opt}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    Enabled for cohorts:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {mockCohorts.map((cohort) => (
                      <button
                        key={cohort.id}
                        onClick={() => toggleCohort(question.id, cohort.id)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          question.cohortIds.includes(cohort.id)
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        {cohort.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(question.id)}
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Question"
      >
        <QuestionForm
          onSubmit={handleAddQuestion}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
}
