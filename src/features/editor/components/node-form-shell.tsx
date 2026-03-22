// src/features/editor/components/node-form-shell.tsx
"use client";

/**
 * NodeFormShell
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps every node's portaled form content with the pixel-perfect middle-panel
 * chrome from the reference design:
 *
 *  ┌──────────────────────────────────────────────────────┐
 *  │  🌐  Generate Video                    [▶ Test step] │  ← NodeFormHeader
 *  ├──────────────────────────────────────────────────────┤
 *  │  Parameters   Settings   Docs ↗                      │  ← tabs (untouched)
 *  ├──────────────────────────────────────────────────────┤
 *  │  scrollable form fields area                         │  ← NodeFormBody
 *  └──────────────────────────────────────────────────────┘
 *
 * Usage inside any node component's portal:
 *
 *   portal(
 *     <NodeFormShell
 *       icon="/logos/gmail.svg"
 *       title="Gmail"
 *       isRunning={isRunning}
 *       onRun={handleRun}
 *       error={error}
 *     >
 *       <GmailFormFields … />
 *     </NodeFormShell>
 *   )
 *
 * ❌ No logic, state, or API changes — pure UI shell.
 */

import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";
import Image from "next/image";

// ─── Types ─────────────────────────────────────────────────────────────────

interface NodeFormShellProps {
  /** Path to the node's logo (e.g. "/logos/gmail.svg"). Falls back to emoji. */
  icon?: string;
  /** Emoji fallback when no icon path is provided */
  iconEmoji?: string;
  /** Node display name shown in the header (e.g. "Generate Video") */
  title: string;
  /** Whether the run action is in-flight */
  isRunning: boolean;
  /** Called when the user clicks the run / test button */
  onRun: () => void;
  /** Inline error message below the header — pass null/undefined to hide */
  error?: string | null;
  /** The form fields rendered in the scrollable body */
  children: React.ReactNode;
}

// ─── Shell ──────────────────────────────────────────────────────────────────

export const NodeFormShell = ({
  icon,
  iconEmoji,
  title,
  isRunning,
  onRun,
  error,
  children,
}: NodeFormShellProps) => {
  return (
    <div className="flex h-full flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <NodeFormHeader
        icon={icon}
        iconEmoji={iconEmoji}
        title={title}
        isRunning={isRunning}
        onRun={onRun}
      />

      {/* ── Inline error (sits between header and fields, like n8n) ─────── */}
      {error && (
        <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* ── Scrollable form body ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <NodeFormBody>{children}</NodeFormBody>
      </div>
    </div>
  );
};

// ─── Header ──────────────────────────────────────────────────────────────────

/**
 * Matches the reference header exactly:
 *   [ 🌐 Generate Video ]                 [ ▶ Test step ]
 *
 * Measurements from reference:
 *   • Total height: ~48px
 *   • Icon: 18×18 px, rounded, with subtle border
 *   • Title: 13px / font-medium / text-foreground
 *   • Run button: orange/red bg, white text, 13px, h-8, rounded-md, px-3
 *   • Padding: px-4
 */
const NodeFormHeader = ({
  icon,
  iconEmoji,
  title,
  isRunning,
  onRun,
}: Omit<NodeFormShellProps, "error" | "children">) => (
  <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
    {/* Left: icon + title */}
    <div className="flex min-w-0 items-center gap-2.5">
      <NodeIcon icon={icon} emoji={iconEmoji} />
      <span className="truncate text-[13px] font-medium text-foreground">
        {title}
      </span>
    </div>

    {/* Right: run/test button */}
    <RunButton isRunning={isRunning} onRun={onRun} />
  </div>
);

// ─── Node icon ────────────────────────────────────────────────────────────────

const NodeIcon = ({ icon, emoji }: { icon?: string; emoji?: string }) => {
  if (icon) {
    return (
      <span className="flex size-[18px] shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-border bg-secondary">
        {/* next/image — falls back gracefully if the src 404s */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={icon}
          alt=""
          width={14}
          height={14}
          className="object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </span>
    );
  }

  if (emoji) {
    return (
      <span className="flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border border-border bg-secondary text-[10px] leading-none">
        {emoji}
      </span>
    );
  }

  // Generic fallback globe-like shape
  return (
    <span className="flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border border-border bg-secondary">
      <svg
        viewBox="0 0 14 14"
        className="size-3 text-muted-foreground"
        fill="none"
      >
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M7 1.5C7 1.5 9 4 9 7s-2 5.5-2 5.5M7 1.5C7 1.5 5 4 5 7s2 5.5 2 5.5M1.5 7h11"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
};

// ─── Run / Test button ────────────────────────────────────────────────────────

/**
 * Reference button: orange-red fill (#E8541A-ish), white text,
 * small warning/lightning icon on the left, "Test step" label,
 * rounded-md, h-8, px-3, text-[12px] font-medium.
 */
const RunButton = ({
  isRunning,
  onRun,
}: {
  isRunning: boolean;
  onRun: () => void;
}) => (
  <Button
    size="sm"
    disabled={isRunning}
    onClick={onRun}
    className={[
      // Sizing & shape — match reference exactly
      "h-8 shrink-0 rounded-md px-3",
      "gap-1.5 text-[12px] font-medium",
      // Color — the reference button is a warm orange-red
      // We use inline style for the exact hue since Tailwind's palette
      // doesn't ship that exact orange. All other tokens stay as-is.
      "border-0 text-white shadow-sm",
      "hover:opacity-90 active:opacity-80",
      "disabled:cursor-not-allowed disabled:opacity-60",
    ].join(" ")}
    style={{
      background: isRunning
        ? undefined
        : "linear-gradient(135deg, #E8541A 0%, #D4430E 100%)",
    }}
  >
    {isRunning ? (
      <>
        <Loader2 className="size-3 animate-spin" />
        Running…
      </>
    ) : (
      <>
        {/* Lightning / warning icon — matches reference "Test step" button */}
        <svg
          viewBox="0 0 12 12"
          className="size-3 shrink-0"
          fill="currentColor"
        >
          <path d="M6.5 1L2 7h4l-1 4 5.5-6H6.5l1-4z" />
        </svg>
        Test step
      </>
    )}
  </Button>
);

// ─── Form body ────────────────────────────────────────────────────────────────

/**
 * Provides consistent padding and field-to-field spacing for all
 * node form fields. Children are expected to be label+input pairs
 * rendered by each node's own `*FormFields` component — this wrapper
 * only sets the outer container rhythm.
 *
 * Reference measurements:
 *   • Outer padding: px-5 pt-4 pb-6
 *   • Gap between fields: gap-y-5 (20px)
 */
export const NodeFormBody = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col gap-y-5 px-5 pb-6 pt-4">{children}</div>
);

// ─── Field-level primitives ────────────────────────────────────────────────────
//
// These are optional building blocks for node FormFields components to use
// so every field gets identical label/input/dropdown/toggle chrome.
//

/**
 * Wraps a label + its control with consistent spacing.
 *
 * <NodeFormField label="Method">
 *   <select …/>
 * </NodeFormField>
 */
export const NodeFormField = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[12px] font-medium text-foreground">{label}</label>
    {children}
  </div>
);

/**
 * Styled text / url input — matches the reference input height, border, bg.
 *
 * Reference:
 *   • Height: h-9 (36px)
 *   • Border: 1px border-border, rounded-md
 *   • Background: bg-background (slightly lighter than panel)
 *   • Text: text-[13px] text-foreground
 *   • Placeholder: text-muted-foreground
 *   • Padding: px-3
 */
export const NodeInput = (
  props: React.InputHTMLAttributes<HTMLInputElement>,
) => (
  <input
    {...props}
    className={[
      "h-9 w-full rounded-md border border-border bg-background px-3",
      "text-[13px] text-foreground placeholder:text-muted-foreground",
      "focus:outline-none focus:ring-1 focus:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
      props.className ?? "",
    ].join(" ")}
  />
);

/**
 * Styled select / dropdown — matches the reference dropdown appearance.
 *
 * Reference:
 *   • Same height/border/bg as input (h-9)
 *   • Chevron on the right via bg-image or CSS
 *   • Text-[13px]
 */
export const NodeSelect = (
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) => (
  <div className="relative w-full">
    <select
      {...props}
      className={[
        "h-9 w-full appearance-none rounded-md border border-border bg-background pl-3 pr-8",
        "text-[13px] text-foreground",
        "focus:outline-none focus:ring-1 focus:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        props.className ?? "",
      ].join(" ")}
    />
    {/* Custom chevron */}
    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
      <svg
        viewBox="0 0 10 6"
        className="size-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  </div>
);

/**
 * Styled toggle switch — matches the reference toggle (green when on).
 *
 * Reference:
 *   • Track: w-9 h-5, rounded-full
 *   • OFF: bg-muted  ON: bg-[#22c55e] (green-500)
 *   • Thumb: size-3.5, bg-white, rounded-full, with translate transition
 *   • Label sits to the right of the track
 */
export const NodeToggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-[12px] font-medium text-foreground">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
        "transition-colors duration-150 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        checked ? "bg-green-500" : "bg-muted",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none block size-3.5 rounded-full bg-white shadow-sm",
          "transition-transform duration-150 ease-in-out",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        ].join(" ")}
      />
    </button>
  </div>
);
