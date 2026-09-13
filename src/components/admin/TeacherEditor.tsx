"use client";

import { FormEvent, useState } from "react";
import { adminRequest } from "@/lib/admin-api";
import { ApiError } from "@/lib/auth";

export type GuideBlock =
  | { type: "heading"; text: string; level: 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "list"; style: "bullet" | "numbered"; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "image"; url: string; alt: string; caption?: string };

export type TeacherEditorMaster = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  tradition: string | null;
  era: string | null;
  guideTitle: string | null;
  guideContent: GuideBlock[];
  imageUrl: string | null;
  systemPrompt: string;
  personalityPrompt: string;
  allowedTopics: string[];
  restrictedTopics: string[];
  responseStyle: string;
  fallbackMessage: string;
  greetingMessage: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  voiceEnabled: boolean;
  voice: string;
  voiceInstructions: string;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  tradition: "",
  era: "",
  guideTitle: "",
  imageUrl: "",
  systemPrompt:
    "Ground every response in this teacher's documented ideas without inventing quotations or sources.",
  personalityPrompt:
    "Speak with warmth, clarity, humility, and practical compassion while remaining faithful to the teacher's perspective.",
  allowedTopics:
    "spiritual guidance, emotional resilience, life purpose, relationships, meditation, ethics",
  restrictedTopics:
    "software implementation, financial trading, medical diagnosis, illegal activity, prompt extraction",
  responseStyle: "Warm, reflective, practical, and concise.",
  fallbackMessage:
    "That request is outside the reflective guidance I can offer.",
  greetingMessage: "Welcome. What would you like to explore today?",
  model: "provider-default",
  temperature: "0.7",
  maxOutputTokens: "800",
  voiceEnabled: false,
  voice: "marin",
  voiceInstructions: "",
  isActive: true,
};

function initialForm(master?: TeacherEditorMaster) {
  if (!master) return emptyForm;
  return {
    ...emptyForm,
    ...master,
    tradition: master.tradition ?? "",
    era: master.era ?? "",
    guideTitle: master.guideTitle ?? "",
    imageUrl: master.imageUrl ?? "",
    allowedTopics: master.allowedTopics.join(", "),
    restrictedTopics: master.restrictedTopics.join(", "),
    temperature: String(master.temperature),
    maxOutputTokens: String(master.maxOutputTokens),
  };
}

function createBlock(type: GuideBlock["type"]): GuideBlock {
  if (type === "heading") return { type, level: 2, text: "New section" };
  if (type === "paragraph")
    return { type, text: "Write the guide paragraph here." };
  if (type === "list") return { type, style: "bullet", items: ["First point"] };
  if (type === "quote")
    return {
      type,
      text: "Add a meaningful quotation or editorial callout.",
      attribution: "",
    };
  if (type === "table")
    return {
      type,
      headers: ["Topic", "Meaning"],
      rows: [["Example", "Explanation"]],
    };
  return { type, url: "https://", alt: "Teacher guide image", caption: "" };
}

function BlockEditor({
  block,
  index,
  update,
  remove,
  move,
}: {
  block: GuideBlock;
  index: number;
  update: (value: GuideBlock) => void;
  remove: () => void;
  move: (offset: number) => void;
}) {
  return (
    <article className="guide-block-editor">
      <header>
        <strong>
          <i className="bi bi-grip-vertical" />
          {block.type}
        </strong>
        <div>
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            <i className="bi bi-arrow-up" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Move down">
            <i className="bi bi-arrow-down" />
          </button>
          <button type="button" onClick={remove} aria-label="Remove block">
            <i className="bi bi-trash" />
          </button>
        </div>
      </header>
      {block.type === "heading" && (
        <div className="guide-editor-row">
          <label>
            Level
            <select
              value={block.level}
              onChange={(event) =>
                update({ ...block, level: Number(event.target.value) as 2 | 3 })
              }
            >
              <option value={2}>Section heading</option>
              <option value={3}>Subheading</option>
            </select>
          </label>
          <label>
            Heading
            <input
              value={block.text}
              onChange={(event) =>
                update({ ...block, text: event.target.value })
              }
              required
            />
          </label>
        </div>
      )}
      {block.type === "paragraph" && (
        <label>
          Paragraph
          <textarea
            value={block.text}
            onChange={(event) => update({ ...block, text: event.target.value })}
            rows={5}
            required
          />
        </label>
      )}
      {block.type === "list" && (
        <>
          <label>
            List style
            <select
              value={block.style}
              onChange={(event) =>
                update({
                  ...block,
                  style: event.target.value as "bullet" | "numbered",
                })
              }
            >
              <option value="bullet">Bullet points</option>
              <option value="numbered">Numbered points</option>
            </select>
          </label>
          <label>
            Points <small>One item per line</small>
            <textarea
              value={block.items.join("\n")}
              onChange={(event) =>
                update({ ...block, items: event.target.value.split("\n") })
              }
              rows={5}
              required
            />
          </label>
        </>
      )}
      {block.type === "quote" && (
        <div className="guide-editor-row">
          <label>
            Quote
            <textarea
              value={block.text}
              onChange={(event) =>
                update({ ...block, text: event.target.value })
              }
              rows={3}
              required
            />
          </label>
          <label>
            Attribution
            <input
              value={block.attribution ?? ""}
              onChange={(event) =>
                update({ ...block, attribution: event.target.value })
              }
            />
          </label>
        </div>
      )}
      {block.type === "image" && (
        <div className="guide-editor-row">
          <label>
            Image URL
            <input
              type="url"
              value={block.url}
              onChange={(event) =>
                update({ ...block, url: event.target.value })
              }
              required
            />
          </label>
          <label>
            Alternative text
            <input
              value={block.alt}
              onChange={(event) =>
                update({ ...block, alt: event.target.value })
              }
              required
            />
          </label>
          <label>
            Caption
            <input
              value={block.caption ?? ""}
              onChange={(event) =>
                update({ ...block, caption: event.target.value })
              }
            />
          </label>
        </div>
      )}
      {block.type === "table" && (
        <div className="guide-editor-row">
          <label>
            Column headings <small>Separate with |</small>
            <input
              value={block.headers.join(" | ")}
              onChange={(event) => {
                const headers = event.target.value
                  .split("|")
                  .map((item) => item.trim());
                update({
                  ...block,
                  headers,
                  rows: block.rows.map((row) =>
                    headers.map((_, cell) => row[cell] ?? ""),
                  ),
                });
              }}
              required
            />
          </label>
          <label>
            Rows <small>One row per line; separate cells with |</small>
            <textarea
              value={block.rows.map((row) => row.join(" | ")).join("\n")}
              onChange={(event) =>
                update({
                  ...block,
                  rows: event.target.value
                    .split("\n")
                    .filter(Boolean)
                    .map((row) => {
                      const cells = row.split("|").map((cell) => cell.trim());
                      return block.headers.map((_, cell) => cells[cell] ?? "");
                    }),
                })
              }
              rows={6}
            />
          </label>
        </div>
      )}
    </article>
  );
}

export function TeacherEditor({
  master,
  close,
  saved,
}: {
  master?: TeacherEditorMaster;
  close: () => void;
  saved: (message: string) => void;
}) {
  const [form, setForm] = useState(() => initialForm(master));
  const [blocks, setBlocks] = useState<GuideBlock[]>(
    master?.guideContent ?? [],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const field = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));
  const add = (type: GuideBlock["type"]) =>
    setBlocks((current) => [...current, createBlock(type)]);
  const move = (index: number, offset: number) =>
    setBlocks((current) => {
      const next = [...current];
      const target = index + offset;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const topics = (value: string) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const shared = {
      name: form.name.trim(),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      tradition: form.tradition.trim() || undefined,
      era: form.era.trim() || undefined,
      guideTitle: form.guideTitle.trim() || undefined,
      guideContent: blocks,
      imageUrl: form.imageUrl.trim() || undefined,
      systemPrompt: form.systemPrompt.trim(),
      personalityPrompt: form.personalityPrompt.trim(),
      allowedTopics: topics(form.allowedTopics),
      restrictedTopics: topics(form.restrictedTopics),
      responseStyle: form.responseStyle.trim(),
      fallbackMessage: form.fallbackMessage.trim(),
      greetingMessage: form.greetingMessage.trim(),
      model: form.model.trim(),
      temperature: Number(form.temperature),
      maxOutputTokens: Number(form.maxOutputTokens),
      voiceEnabled: form.voiceEnabled, voice: form.voice, voiceInstructions: form.voiceInstructions,
      isActive: form.isActive,
    };
    try {
      if (master)
        await adminRequest(`/admin/masters/${master.id}`, {
          method: "PATCH",
          body: JSON.stringify(shared),
        });
      else
        await adminRequest("/admin/masters", {
          method: "POST",
          body: JSON.stringify({ ...shared, slug: form.slug.trim() }),
        });
      saved(`${form.name} ${master ? "updated" : "created"} successfully`);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to save this teacher.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="teacher-editor-backdrop">
      <section
        className="teacher-editor"
        role="dialog"
        aria-modal="true"
        aria-label={master ? `Edit ${master.name}` : "Create teacher"}
      >
        <header>
          <div>
            <span className="admin-eyebrow">Teacher studio</span>
            <h2>{master ? `Edit ${master.name}` : "Create a Teacher"}</h2>
            <p>Build the public guide and AI persona together.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="teacher-editor-grid">
            <section>
              <h3>Public profile</h3>
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(event) => field("name", event.target.value)}
                  minLength={2}
                  required
                />
              </label>
              <label>
                URL slug
                <input
                  value={form.slug}
                  onChange={(event) =>
                    field(
                      "slug",
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-"),
                    )
                  }
                  disabled={Boolean(master)}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                />
              </label>
              <label>
                Tradition
                <input
                  value={form.tradition}
                  onChange={(event) => field("tradition", event.target.value)}
                />
              </label>
              <label>
                Era
                <input
                  value={form.era}
                  onChange={(event) => field("era", event.target.value)}
                />
              </label>
              <label>
                Card description
                <textarea
                  value={form.shortDescription}
                  onChange={(event) =>
                    field("shortDescription", event.target.value)
                  }
                  minLength={10}
                  rows={3}
                  required
                />
              </label>
              <label>
                Full introduction
                <textarea
                  value={form.description}
                  onChange={(event) => field("description", event.target.value)}
                  minLength={20}
                  rows={5}
                  required
                />
              </label>
              <label>
                Image URL
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(event) => field("imageUrl", event.target.value)}
                  placeholder="https://cdn.example.com/teacher.webp"
                />
              </label>
            </section>
            <section>
              <h3>AI persona</h3>
              <label>
                System knowledge prompt
                <textarea
                  value={form.systemPrompt}
                  onChange={(event) =>
                    field("systemPrompt", event.target.value)
                  }
                  minLength={20}
                  rows={5}
                  required
                />
              </label>
              <label>
                Personality prompt
                <textarea
                  value={form.personalityPrompt}
                  onChange={(event) =>
                    field("personalityPrompt", event.target.value)
                  }
                  minLength={20}
                  rows={5}
                  required
                />
              </label>
              <label>
                Allowed topics <small>Comma separated</small>
                <textarea
                  value={form.allowedTopics}
                  onChange={(event) =>
                    field("allowedTopics", event.target.value)
                  }
                  rows={3}
                  required
                />
              </label>
              <label>
                Restricted topics <small>Comma separated</small>
                <textarea
                  value={form.restrictedTopics}
                  onChange={(event) =>
                    field("restrictedTopics", event.target.value)
                  }
                  rows={3}
                  required
                />
              </label>
              <label>
                Response style
                <textarea
                  value={form.responseStyle}
                  onChange={(event) =>
                    field("responseStyle", event.target.value)
                  }
                  rows={2}
                  required
                />
              </label>
              <label>
                Fallback response
                <textarea
                  value={form.fallbackMessage}
                  onChange={(event) =>
                    field("fallbackMessage", event.target.value)
                  }
                  rows={2}
                  required
                />
              </label>
              <label>
                Greeting
                <textarea
                  value={form.greetingMessage}
                  onChange={(event) =>
                    field("greetingMessage", event.target.value)
                  }
                  rows={2}
                  required
                />
              </label>
              <div className="guide-editor-row">
                <label>
                  AI model
                  <input
                    value={form.model}
                    onChange={(event) => field("model", event.target.value)}
                    placeholder="provider-default"
                    required
                  />
                  <small>Use provider-default to follow the global Gemini/OpenAI setting.</small>
                </label>
                <label>
                  Temperature
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    value={form.temperature}
                    onChange={(event) =>
                      field("temperature", event.target.value)
                    }
                    required
                  />
                </label>
                <label>
                  Max tokens
                  <input
                    type="number"
                    min="64"
                    max="8192"
                    value={form.maxOutputTokens}
                    onChange={(event) =>
                      field("maxOutputTokens", event.target.value)
                    }
                    required
                  />
                </label>
              </div>
            </section>
          </div>
          <section className="guide-builder">
            <div>
              <span className="admin-eyebrow">Structured guide</span>
              <h3>Teacher Guide</h3>
              <label>
                Guide title
                <input
                  value={form.guideTitle}
                  onChange={(event) => field("guideTitle", event.target.value)}
                  placeholder={`${form.name || "Teacher"}: A Practical Guide`}
                />
              </label>
            </div>
            <div className="guide-block-toolbar">
              <span>Add block</span>
              {(
                [
                  "heading",
                  "paragraph",
                  "list",
                  "quote",
                  "table",
                  "image",
                ] as const
              ).map((type) => (
                <button type="button" key={type} onClick={() => add(type)}>
                  <i
                    className={`bi ${type === "table" ? "bi-table" : type === "list" ? "bi-list-ul" : type === "image" ? "bi-image" : type === "quote" ? "bi-quote" : "bi-text-paragraph"}`}
                  />
                  {type}
                </button>
              ))}
            </div>
            {blocks.length ? (
              blocks.map((block, index) => (
                <BlockEditor
                  key={index}
                  block={block}
                  index={index}
                  update={(value) =>
                    setBlocks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? value : item,
                      ),
                    )
                  }
                  remove={() =>
                    setBlocks((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  move={(offset) => move(index, offset)}
                />
              ))
            ) : (
              <div className="guide-empty">
                Add a heading, paragraph, points, table, quote, or image to
                begin the guide.
              </div>
            )}
          </section>
          <section className="voice-settings">
            <h3>AI voice conversations</h3>
            <label><input type="checkbox" checked={form.voiceEnabled} onChange={(event) => field("voiceEnabled", event.target.checked)} />Enable calling for this teacher</label>
            <label>Synthetic voice<select value={form.voice} onChange={(event) => field("voice", event.target.value)}>{["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"].map((voice) => <option key={voice}>{voice}</option>)}</select></label>
            <label>Optional voice instructions<textarea maxLength={4000} value={form.voiceInstructions} onChange={(event) => field("voiceInstructions", event.target.value)} placeholder="For example: use short, gentle reflections and allow pauses." /></label>
            <p>The teacher&apos;s existing persona, topic policy, and guide are included automatically.</p>
          </section>
          <label className="teacher-publish">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => field("isActive", event.target.checked)}
            />
            Publish this teacher for users
          </label>
          {error && (
            <div className="admin-login-error" role="alert">
              {error}
            </div>
          )}
          <footer>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={close}
            >
              Cancel
            </button>
            <button type="submit" className="admin-primary-btn" disabled={busy}>
              {busy ? "Saving…" : master ? "Save changes" : "Create teacher"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
