"use client";

import { useEffect, useRef, useState } from "react";

const MODES = [
  { id: "view", label: "View only", hint: "Opens in the site's viewer. No download button." },
  { id: "download", label: "Download only", hint: "A download button, no viewer." },
  { id: "both", label: "View & download", hint: "Both buttons." },
];
const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.id, m.label]));
const MAX_MB = 100;
const EMPTY = { title: "", description: "", mode: "both", published: true, source: "upload", url: "" };

function fmtSize(bytes) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function api(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/** PUT the file to the signed R2 URL, reporting progress (fetch cannot). */
function putFile(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status}).`));
    // A blocked request gives no status: almost always the bucket's CORS rule
    // not listing the address the admin page is open on.
    xhr.onerror = () =>
      reject(
        new Error(
          `Upload was blocked by the storage bucket. This page is open on ${window.location.origin}, ` +
            `which the bucket may not allow — open the admin on the live domain, or add this address ` +
            `with: R2_CORS_ORIGINS=${window.location.origin} npm run r2:cors`
        )
      );
    xhr.send(file);
  });
}

export default function PdfsTab() {
  const [pdfs, setPdfs] = useState(null);
  const [uploads, setUploads] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null = closed, "new", or a pdf id
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const fileRef = useRef(null);

  const load = () =>
    api("/api/admin/pdfs")
      .then((d) => {
        setPdfs(d.pdfs);
        setUploads(d.uploads);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing("new");
    setForm({ ...EMPTY, source: uploads ? "upload" : "link" });
    setFile(null);
    setFormError(null);
  };
  const openEdit = (p) => {
    setEditing(p.id);
    setForm({
      title: p.title,
      description: p.description || "",
      mode: p.mode,
      published: p.published,
      source: p.file_url ? "link" : "upload",
      url: p.file_url || "",
    });
    setFile(null);
    setFormError(null);
  };
  const close = () => {
    setEditing(null);
    setFile(null);
    setProgress(null);
  };

  const pickFile = (f) => {
    setFormError(null);
    if (!f) return setFile(null);
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) {
      setFormError("Choose a PDF file.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFormError(`That file is ${fmtSize(f.size)}; the limit is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    if (!form.title.trim()) set("title", f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim());
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError(null);
    const isNew = editing === "new";
    const current = isNew ? null : pdfs.find((p) => p.id === editing);
    const body = {
      title: form.title,
      description: form.description,
      mode: form.mode,
      published: form.published,
    };

    setSaving(true);
    try {
      if (form.source === "upload") {
        if (file) {
          const { key, uploadUrl } = await api("/api/admin/pdfs/upload-url", {
            method: "POST",
            body: { fileName: file.name, size: file.size, contentType: "application/pdf" },
          });
          setProgress(0);
          await putFile(uploadUrl, file, setProgress);
          Object.assign(body, { file_key: key, file_name: file.name, file_size: file.size });
        } else if (isNew || !current?.file_key) {
          throw new Error("Choose a PDF to upload.");
        }
      } else {
        if (!form.url.trim()) throw new Error("Paste a link to the PDF.");
        if (isNew || form.url.trim() !== current?.file_url) body.file_url = form.url.trim();
      }

      if (isNew) await api("/api/admin/pdfs", { method: "POST", body });
      else await api(`/api/admin/pdfs/${editing}`, { method: "PATCH", body });
      close();
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  const togglePublished = async (p) => {
    try {
      await api(`/api/admin/pdfs/${p.id}`, { method: "PATCH", body: { published: !p.published } });
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const remove = async (p) => {
    if (!confirm(`Delete “${p.title}”? ${p.file_key ? "The uploaded file is deleted too." : ""}`)) return;
    try {
      await api(`/api/admin/pdfs/${p.id}`, { method: "DELETE" });
      if (editing === p.id) close();
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const move = async (index, delta) => {
    const next = [...pdfs];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setPdfs(next);
    try {
      await api("/api/admin/pdfs", { method: "PUT", body: { order: next.map((p) => p.id) } });
    } catch (e) {
      alert(e.message);
      load();
    }
  };

  if (error) return <div className="loading">{error}</div>;
  if (!pdfs) return <div className="loading">Loading…</div>;

  const current = editing && editing !== "new" ? pdfs.find((p) => p.id === editing) : null;

  return (
    <div>
      {editing ? (
        <form className="pdf-admin-form" onSubmit={save}>
          <b>{editing === "new" ? "Add a PDF" : "Edit PDF"}</b>

          <div>
            <label className="field-label" htmlFor="pdf-title">Heading</label>
            <input
              id="pdf-title"
              className="text-input"
              value={form.title}
              maxLength={200}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. UP TGT-PGT GS Syllabus"
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="pdf-desc">Description</label>
            <textarea
              id="pdf-desc"
              className="text-input"
              value={form.description}
              maxLength={1000}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional — a line or two on what is inside."
            />
          </div>

          <div>
            <span className="field-label">File</span>
            <div className="pdf-admin-row" style={{ marginBottom: 10 }}>
              <div className="seg" role="radiogroup" aria-label="File source">
                <button
                  type="button"
                  className={form.source === "upload" ? "active" : ""}
                  aria-pressed={form.source === "upload"}
                  disabled={!uploads}
                  onClick={() => set("source", "upload")}
                >
                  Upload PDF
                </button>
                <button
                  type="button"
                  className={form.source === "link" ? "active" : ""}
                  aria-pressed={form.source === "link"}
                  onClick={() => set("source", "link")}
                >
                  Paste link
                </button>
              </div>
            </div>
            {!uploads && (
              <p className="pdf-admin-notice">
                Uploading is off: this server has no R2 storage keys. Add <code>R2_ACCOUNT_ID</code>,{" "}
                <code>R2_ACCESS_KEY_ID</code>, <code>R2_SECRET_ACCESS_KEY</code> and <code>R2_BUCKET</code> to the
                hosting environment (Vercel → Settings → Environment Variables) and redeploy. Until then, paste a
                link to the PDF instead.
              </p>
            )}

            {form.source === "upload" ? (
              <div className="pdf-admin-row">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
                <span className="muted-sm">
                  {file
                    ? `${file.name} · ${fmtSize(file.size)}`
                    : current?.file_key
                      ? `Current: ${current.file_name} · ${fmtSize(current.file_size)} — choose a file only to replace it`
                      : `Up to ${MAX_MB} MB`}
                </span>
              </div>
            ) : (
              <input
                className="text-input"
                type="url"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://…/file.pdf"
              />
            )}
            {progress != null && (
              <div className="pdf-progress" style={{ marginTop: 10 }} aria-label="Upload progress">
                <span style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
          </div>

          <div>
            <span className="field-label">Visitors can</span>
            <div className="radio-group radio-grid">
              {MODES.map((m) => (
                <label className="radio-card" key={m.id} title={m.hint}>
                  <input
                    type="radio"
                    name="pdf-mode"
                    value={m.id}
                    checked={form.mode === m.id}
                    onChange={() => set("mode", m.id)}
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
            <p className="muted-sm" style={{ margin: "6px 0 0" }}>
              {MODES.find((m) => m.id === form.mode)?.hint}{" "}
              {form.mode === "view" && "This hides download controls; it can't stop someone determined from saving the file."}
            </p>
          </div>

          <label className="pdf-admin-row" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
            <span>Show on the home page</span>
          </label>

          {formError && <p className="form-error">{formError}</p>}

          <div className="pdf-admin-row">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? (progress != null ? `Uploading ${Math.round(progress * 100)}%…` : "Saving…") : "Save"}
            </button>
            <button className="btn ghost" type="button" onClick={close} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <button className="btn" type="button" onClick={openNew}>
            + Add PDF
          </button>
        </div>
      )}

      {pdfs.length === 0 ? (
        <div className="loading">No PDFs yet. Added ones appear on the home page under “Important PDFs”.</div>
      ) : (
        <div className="pdf-admin-list">
          {pdfs.map((p, i) => (
            <div className={p.published ? "pdf-admin-item" : "pdf-admin-item hidden"} key={p.id}>
              <div className="pdf-admin-main">
                <b>{p.title}</b>
                {p.description && <div className="muted-sm" style={{ marginTop: 4, whiteSpace: "pre-line" }}>{p.description}</div>}
                <div className="muted-sm" style={{ marginTop: 6 }}>
                  {MODE_LABEL[p.mode]} · {p.published ? "On home page" : "Hidden"} ·{" "}
                  {p.file_key ? `${p.file_name} (${fmtSize(p.file_size)})` : "Outside link"}
                </div>
              </div>
              <div className="pdf-admin-actions">
                <button className="btn ghost" type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                <button className="btn ghost" type="button" disabled={i === pdfs.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                <a
                  className="btn ghost"
                  href={p.mode === "download" ? `/api/pdfs/${p.id}?download=1` : `/pdfs/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                  title={p.published ? "" : "Publish it first — hidden PDFs are not served"}
                >
                  Open
                </a>
                <button className="btn ghost" type="button" onClick={() => openEdit(p)}>Edit</button>
                <button className="btn ghost" type="button" onClick={() => togglePublished(p)}>
                  {p.published ? "Hide" : "Publish"}
                </button>
                <button className="btn ghost" type="button" onClick={() => remove(p)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
