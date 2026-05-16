# Cover Letter: Editable + PDF Download

**Date:** 2026-05-16

## Problem

The generated cover letter on `/analyze` is read-only and can only be copied as plain text. Users need to refine the output after generation and export a properly formatted PDF ready to attach to applications.

## Design

### 1. Editable textarea

In `app/analyze/page.tsx`, remove the `readOnly` attribute from the cover letter `<textarea>` and add an `onChange` handler that updates the existing `coverLetter` state. This is a one-line change — the state is already mutable, only the input was locked.

### 2. PDF download

**Libraries:** Install `jspdf` and `html2canvas` as client-side dependencies. No server route needed.

**Mechanism:**
- A hidden off-screen `<div ref={printRef}>` is always rendered when `coverLetter` is non-empty, styled as:
  - `font-family: 'Calibri Body', Calibri, sans-serif`
  - `font-size: 12px`
  - `line-height: 1.5`
  - `padding: 72px` (standard 1-inch document margins)
  - `width: 794px` (A4 at 96dpi)
  - `white-space: pre-wrap` to preserve line breaks
  - `position: absolute; left: -9999px` to keep it off-screen

- On "Download PDF" click:
  1. `html2canvas(printRef.current, { scale: 2 })` — renders at 2× for sharp output, uses the browser's actual Calibri font
  2. `new jsPDF('p', 'mm', 'a4')` — A4 portrait
  3. Add the canvas image to fill the page
  4. `pdf.save(...)` — filename is `Cover Letter(${title}).pdf` when title is known, or `Cover Letter.pdf` when not

**Button:** "Download PDF" button sits next to the existing "Copy" button in the cover letter section header. Both are visible only when `coverLetter` is non-empty.

**Filename examples:**
- `Cover Letter(Software Engineer L5).pdf`
- `Cover Letter(Backend Engineer).pdf`
- `Cover Letter.pdf` — fallback when title not extracted

## Files to Modify

- `app/analyze/page.tsx` — remove `readOnly`, add `onChange`, add `printRef` div, add Download button, add `handleDownloadPdf` function
- `package.json` — add `jspdf` and `html2canvas`

## Out of Scope

- PDF generation from the dashboard/job detail view (only from the Analyze page)
- Custom margins or page header/footer
- Multi-page handling (cover letters fit on one page)
