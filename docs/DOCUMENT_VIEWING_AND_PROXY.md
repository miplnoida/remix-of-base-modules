# Document Viewing & Proxy Architecture

## Last Modified: 2026-02-24

## Overview
Documents stored in external Supabase storage are accessed through the `document-proxy` edge function, which securely fetches files and streams them to the client with correct MIME types and headers.

## Components
- **Edge Function**: `supabase/functions/document-proxy/index.ts`
- **Frontend**: `src/components/online-applications/ApplicationDocumentsTab.tsx`
- **Frontend (Registration)**: `src/pages/ip-registration/tabs/DocumentVerificationTab.tsx`

## MIME Type Detection
The edge function infers MIME types from file extensions when the storage SDK or fetch response returns a generic `application/octet-stream`. Supported types include:
- PDF: `application/pdf`
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
- Word: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Excel, PowerPoint, text, CSV, audio, video, zip

## View vs Download
- **View (action: 'stream')**: Returns `Content-Disposition: inline` with the correct `Content-Type`
- **Download (action: 'download')**: Returns `Content-Disposition: attachment; filename="..."` 

## Frontend Viewing Strategy
- **PDF**: Fetched as blob via proxy → `URL.createObjectURL(blob)` → new tab opened with `window.open('', '_blank')` → PDF embedded via `<embed>` tag written into the tab's document. This "download to temp memory then render" approach avoids browser restrictions on direct blob URL navigation.
- **Images**: Same blob-to-temp-memory approach → rendered via `<img>` tag in the new tab's document.
- **Word docs & other unsupported types**: Show a preview dialog with "Preview not available" message and "Download Instead" button
- Data URLs are NOT used (size limits cause blank tabs for large files)
- Direct `window.open(blobUrl)` is NOT used as primary method (browsers may block or fail to render blob URLs opened directly)

## File Categories
- `pdf`: `.pdf` files
- `image`: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`
- `word`: `.doc`, `.docx`
- `other`: all remaining types

## Security
- All document access requires valid JWT authentication
- URLs are validated against an allowlist of origins
- Signed URLs are NOT stored permanently; files are fetched via SDK with service-level access
- Blob URLs are revoked after 60 seconds to prevent leakage

## Dependencies
- `EXTERNAL_SUPABASE_ANON_KEY` secret for SDK-based downloads from external storage
