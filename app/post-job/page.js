"use client";

import { useState } from "react";
import Link from "next/link";

export default function PostJobPage() {
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    category: "",
    type: "FULL_TIME",
    salary: "",
    deadline: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    "Government", "Education", "Health", "Finance",
    "IT", "Engineering", "NGO", "General",
  ];

  const jobTypes = [
    { value: "FULL_TIME", label: "Full Time" },
    { value: "PART_TIME", label: "Part Time" },
    { value: "CONTRACT", label: "Contract" },
    { value: "INTERNSHIP", label: "Internship" },
    { value: "FREELANCE", label: "Freelance" },
  ];

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title || !form.company || !form.location || !form.category || !form.description) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
      setForm({
        title: "", company: "", location: "", category: "",
        type: "FULL_TIME", salary: "", deadline: "", description: "",
      });
    } catch (err) {
      setError("Failed to submit. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .dr { font-family: 'Poppins', sans-serif; background: #F7F8FA; min-height: 100vh; color: #1B2A3F; }

        .nav { background: #1B2A3F; height: 64px; padding: 0 3rem; display: flex; align-items: center; justify-content: space-between; }
        .nav-logo { font-family: 'Montserrat', sans-serif; font-size: 1.4rem; font-weight: 700; color: #00C9A7; letter-spacing: 0.1em; text-decoration: none; }
        .nav-logo span { display: block; font-size: 0.55rem; font-weight: 400; color: rgba(255,255,255,0.35); letter-spacing: 0.3em; text-transform: uppercase; margin-top: 1px; }
        .nav-link { font-size: 0.8rem; color: rgba(255,255,255,0.6); text-decoration: none; transition: color 0.15s; }
        .nav-link:hover { color: #fff; }

        .header { background: #1B2A3F; padding: 2.5rem 3rem 2rem; }
        .header-inner { max-width: 720px; margin: 0 auto; }
        .header-eyebrow { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: #00C9A7; margin-bottom: 0.6rem; }
        .header-title { font-family: 'Montserrat', sans-serif; font-size: 1.8rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }

        .body { max-width: 720px; margin: 0 auto; padding: 2.5rem 3rem 5rem; }

        .form-card { background: #fff; border: 1.5px solid #E8ECF0; border-radius: 8px; padding: 2.5rem; }

        .form-section { margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #F0F3F7; }
        .form-section:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
        .form-section-title { font-family: 'Montserrat', sans-serif; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #8B95A1; margin-bottom: 1.25rem; }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        .form-grid-full { grid-column: 1 / -1; }

        .field { display: flex; flex-direction: column; gap: 0.4rem; }
        .field label { font-size: 0.75rem; font-weight: 600; color: #3D4B5C; letter-spacing: 0.03em; }
        .field label span { color: #DC2626; margin-left: 2px; }
        .field input, .field select, .field textarea {
          font-family: 'Poppins', sans-serif;
          font-size: 0.85rem;
          color: #1B2A3F;
          background: #F7F8FA;
          border: 1.5px solid #E8ECF0;
          border-radius: 5px;
          padding: 0.7rem 0.9rem;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
          width: 100%;
        }
        .field input:focus, .field select:focus, .field textarea:focus {
          border-color: #00C9A7;
          background: #fff;
        }
        .field input::placeholder, .field textarea::placeholder { color: #A0ACBB; }
        .field textarea { resize: vertical; min-height: 160px; line-height: 1.7; }
        .field-hint { font-size: 0.7rem; color: #A0ACBB; margin-top: 0.1rem; }

        .error-box { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 5px; padding: 0.85rem 1rem; font-size: 0.82rem; color: #DC2626; margin-bottom: 1.5rem; }

        .success-card { background: #fff; border: 1.5px solid #E8ECF0; border-radius: 8px; padding: 3.5rem 2.5rem; text-align: center; }
        .success-icon { width: 52px; height: 52px; background: #E8FAF6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; font-size: 1.4rem; }
        .success-title { font-family: 'Montserrat', sans-serif; font-size: 1.2rem; font-weight: 700; color: #1B2A3F; margin-bottom: 0.5rem; }
        .success-text { font-size: 0.85rem; color: #6B7685; line-height: 1.6; margin-bottom: 1.75rem; }
        .success-btns { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

        .btn-primary { font-family: 'Poppins', sans-serif; font-size: 0.82rem; font-weight: 600; background: #00C9A7; color: #1B2A3F; padding: 0.75rem 1.75rem; border-radius: 4px; text-decoration: none; letter-spacing: 0.03em; transition: opacity 0.2s; display: inline-block; border: none; cursor: pointer; width: 100%; margin-top: 0.5rem; }
        .btn-primary:hover { opacity: 0.88; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { font-family: 'Poppins', sans-serif; font-size: 0.82rem; font-weight: 500; background: transparent; color: #6B7685; padding: 0.75rem 1.75rem; border-radius: 4px; text-decoration: none; letter-spacing: 0.03em; transition: all 0.2s; display: inline-block; border: 1.5px solid #E8ECF0; }
        .btn-secondary:hover { border-color: #1B2A3F; color: #1B2A3F; }

        .notice { background: #F0FDF9; border: 1px solid #C8EDE7; border-radius: 6px; padding: 1rem 1.25rem; margin-bottom: 2rem; }
        .notice p { font-size: 0.78rem; color: #0A8C74; line-height: 1.6; }
        .notice strong { font-weight: 600; }

        .footer { background: #1B2A3F; border-top: 1px solid rgba(255,255,255,0.06); padding: 2rem 3rem; margin-top: 2rem; }
        .footer-inner { max-width: 860px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .footer-logo { font-family: 'Montserrat', sans-serif; font-size: 1rem; font-weight: 700; color: #00C9A7; letter-spacing: 0.12em; }
        .footer-sub { font-size: 0.6rem; color: rgba(255,255,255,0.25); letter-spacing: 0.25em; text-transform: uppercase; margin-top: 0.2rem; }
        .footer-copy { font-size: 0.72rem; color: rgba(255,255,255,0.25); }

        @media (max-width: 640px) {
          .nav { padding: 0 1.25rem; }
          .header { padding: 2rem 1.25rem 1.75rem; }
          .body { padding: 1.5rem 1.25rem 4rem; }
          .form-card { padding: 1.5rem; }
          .form-grid { grid-template-columns: 1fr; }
          .footer { padding: 2rem 1.25rem; }
          .footer-inner { flex-direction: column; gap: 1rem; text-align: center; }
        }
      `}</style>

      <div className="dr">
        <nav className="nav">
          <Link href="/" className="nav-logo">
            DARAJA
            <span>Kazi Na Fursa Tanzania</span>
          </Link>
          <Link href="/jobs" className="nav-link">Browse Jobs</Link>
        </nav>

        <div className="header">
          <div className="header-inner">
            <div className="header-eyebrow">Employers</div>
            <div className="header-title">Post a Job</div>
          </div>
        </div>

        <div className="body">
          {success ? (
            <div className="success-card">
              <div className="success-icon">✓</div>
              <div className="success-title">Job Submitted for Review</div>
              <p className="success-text">
                Thank you. Your listing will be checked before it appears on
                Daraja. This helps protect job seekers from misleading posts.
              </p>
              <div className="success-btns">
                <Link href="/jobs" className="btn-secondary">View All Jobs</Link>
                <button
                  className="btn-primary"
                  style={{ width: "auto" }}
                  onClick={() => setSuccess(false)}
                >
                  Post Another Job
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="notice">
                <p>
                  <strong>Free to submit during beta.</strong> All listings are reviewed
                  before going live.
                </p>
              </div>

              <div className="form-card">
                {error && <div className="error-box">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="form-section">
                    <div className="form-section-title">Job Information</div>
                    <div className="form-grid">
                      <div className="field form-grid-full">
                        <label>Job Title <span>*</span></label>
                        <input
                          type="text"
                          name="title"
                          value={form.title}
                          onChange={handleChange}
                          placeholder="e.g. Senior Accountant"
                        />
                      </div>
                      <div className="field">
                        <label>Category <span>*</span></label>
                        <select name="category" value={form.category} onChange={handleChange}>
                          <option value="">Select category</option>
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Job Type <span>*</span></label>
                        <select name="type" value={form.type} onChange={handleChange}>
                          {jobTypes.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Salary / Compensation</label>
                        <input
                          type="text"
                          name="salary"
                          value={form.salary}
                          onChange={handleChange}
                          placeholder="e.g. TZS 800,000 – 1,200,000"
                        />
                        <span className="field-hint">Optional — leave blank if not disclosed</span>
                      </div>
                      <div className="field">
                        <label>Application Deadline</label>
                        <input
                          type="date"
                          name="deadline"
                          value={form.deadline}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-title">Company Information</div>
                    <div className="form-grid">
                      <div className="field">
                        <label>Company Name <span>*</span></label>
                        <input
                          type="text"
                          name="company"
                          value={form.company}
                          onChange={handleChange}
                          placeholder="e.g. Vodacom Tanzania"
                        />
                      </div>
                      <div className="field">
                        <label>Location <span>*</span></label>
                        <input
                          type="text"
                          name="location"
                          value={form.location}
                          onChange={handleChange}
                          placeholder="e.g. Dar es Salaam"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-title">Job Description</div>
                    <div className="field">
                      <label>Description <span>*</span></label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Describe the role, responsibilities, requirements and how to apply..."
                      />
                      <span className="field-hint">Be specific — good descriptions attract better candidates</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Submitting..." : "Post Job →"}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        <footer className="footer">
          <div className="footer-inner">
            <div>
              <div className="footer-logo">DARAJA</div>
              <div className="footer-sub">Kazi Na Fursa Tanzania</div>
            </div>
            <div className="footer-copy">{new Date().getFullYear()} Daraja. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  );
}
