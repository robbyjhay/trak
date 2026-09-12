"use client";

import { useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { apiSend } from "@/lib/api/client";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import { INNOVATION_CATEGORIES } from "@/lib/types";
import type { Innovation } from "@/lib/types";
import { INNOVATION_CATEGORY_LABELS, BulbIcon } from "./bits";

type FormState = {
  title: string;
  category: string;
  description: string;
  details: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL: FormState = {
  title: "",
  category: "",
  description: "",
  details: "",
};

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = "Title is required.";
  else if (form.title.length > 300) errors.title = "Title must be 300 characters or fewer.";
  if (!form.category) errors.category = "Please select a category.";
  if (!form.description.trim()) errors.description = "Description is required.";
  else if (form.description.length > 5000)
    errors.description = "Description must be 5,000 characters or fewer.";
  if (form.details.length > 5000)
    errors.details = "Supporting details must be 5,000 characters or fewer.";
  return errors;
}

export function SubmitInnovationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (innovation: Innovation) => void;
}) {
  const { showToast } = useTrak();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setForm(INITIAL);
    setErrors({});
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  const set =
    (k: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiSend<{ innovation: Innovation }>(
        "/api/innovation-cloud",
        "POST",
        {
          title: form.title.trim(),
          category: form.category,
          description: form.description.trim(),
          details: form.details.trim(),
        },
      );
      showToast(
        "Innovation submitted!",
        "The Head will review your idea soon.",
      );
      onCreated(data.innovation);
      reset();
      onClose();
    } catch (err) {
      showToast(
        "Submission failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = (hasErr: boolean) =>
    `w-full rounded-[12px] border-[1.5px] ${
      hasErr ? "border-critical" : "border-border"
    } bg-surface-muted px-3.5 py-3 text-[14px] text-foreground placeholder:text-foreground-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`;

  return (
    <ModalBackdrop
      open={open}
      onClose={handleClose}
      labelledBy="submit-innovation-title"
      bottomSheetOnMobile
    >
      <ModalPanel wide bottomSheetOnMobile className="sm:w-[900px] sm:max-w-[95vw]">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-aztec-3 to-aztec text-white">
            <BulbIcon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="submit-innovation-title"
              className="font-display text-[20px] font-bold text-foreground"
            >
              Submit an Innovation
            </h2>
            <p className="text-[12.5px] text-foreground-secondary">
              Share your idea with the Unit Head for review.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label
              htmlFor="inno-title"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground"
            >
              Title{" "}
              <span className="text-critical-semantic" aria-hidden>
                *
              </span>
            </label>
            <input
              id="inno-title"
              type="text"
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. Weekly member feedback sessions"
              maxLength={300}
              className={inputCls(!!errors.title)}
            />
            {errors.title && (
              <p className="mt-1 text-[11.5px] text-critical-semantic">
                {errors.title}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="inno-category"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground"
            >
              Category{" "}
              <span className="text-critical-semantic" aria-hidden>
                *
              </span>
            </label>
            <select
              id="inno-category"
              value={form.category}
              onChange={set("category")}
              className={inputCls(!!errors.category)}
            >
              <option value="">Select a category...</option>
              {INNOVATION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {INNOVATION_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-[11.5px] text-critical-semantic">
                {errors.category}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="inno-desc"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground"
            >
              Description{" "}
              <span className="text-critical-semantic" aria-hidden>
                *
              </span>
            </label>
            <textarea
              id="inno-desc"
              value={form.description}
              onChange={set("description")}
              rows={4}
              placeholder="Describe your innovation idea clearly and concisely..."
              className={`${inputCls(!!errors.description)} resize-y`}
            />
            {errors.description && (
              <p className="mt-1 text-[11.5px] text-critical-semantic">
                {errors.description}
              </p>
            )}
          </div>

          {/* Supporting Details */}
          <div>
            <label
              htmlFor="inno-details"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground"
            >
              Supporting Details{" "}
              <span className="text-[11px] font-normal text-foreground-faint">
                (optional)
              </span>
            </label>
            <textarea
              id="inno-details"
              value={form.details}
              onChange={set("details")}
              rows={3}
              placeholder="Additional context, evidence, or steps to implement..."
              className={`${inputCls(!!errors.details)} resize-y`}
            />
            {errors.details && (
              <p className="mt-1 text-[11.5px] text-critical-semantic">
                {errors.details}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-[11px] border border-border bg-surface-muted px-[26px] py-3.5 text-[13.5px] font-bold text-foreground-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-[11px] bg-primary px-[26px] py-3.5 text-[13.5px] font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Innovation"}
            </button>
          </div>
        </form>
      </ModalPanel>
    </ModalBackdrop>
  );
}
