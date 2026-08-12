# Web-Based Mini Mugshot Capture System
## Moises Padilla Municipal Police Station (MPS)

---

## Executive Summary

The **Web-Based Mini Mugshot Capture System** is a lightweight, browser-native solution designed specifically for the Moises Padilla Municipal Police Station (MPMPS) to streamline detainee photography, documentation, and record-keeping. Built entirely on open web standards, the system eliminates the dependency on dedicated desktop applications and specialized hardware by leveraging the built-in webcam capabilities of modern workstations.

The system enforces **chain-of-custody and accountability** through mandatory Duty Officer authentication before any capture session begins. It guides the operator through a structured **4-angle photography workflow** (Front Half-Body, Left Side Half-Body, Right Side Half-Body, and Front Full-Body), automatically applying **digital slate overlays** containing station identification, detainee details, date, and officer credentials directly onto each photograph.

Output is delivered in **three formats** to maximize operational flexibility:
1. **MS Word (.docx)** — Editable, printable booking sheets with structured 2×2 photo grids and signature lines.
2. **JPEG Soft Copies** — Individually cropped 2×2 inch images stored in browser localStorage for quick retrieval.
3. **A4 Print-Ready Layout** — Native browser printing via CSS `@media print` for immediate hard-copy generation.

The system is designed for **offline or local-area-network deployment**, requiring no external server, database, or ongoing subscription.

---

## System Architecture

### 1. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Presentation | HTML5, CSS3 (ES6+) | UI, responsive layout, print stylesheets |
| Media Capture | HTML5 MediaStream API | Webcam access, live preview, frame capture |
| Graphics Engine | HTML5 Canvas API | Image rendering, 2×2 inch auto-cropping, digital slate overlay |
| Local Persistence | Web Storage API (localStorage) | Session state, detainee records, captured photos (Base64) |
| Document Export | html-docx-js (CDN) | MS Word .docx Blob generation |
| Print Engine | Browser-native CSS `@media print` | A4-formatted instant printing |

### 2. Logical Architecture

```
┌─────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                 │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │   Login  │→│  Registration│→│   Capture     │ │
│  │  Screen  │  │    Screen    │  │    Wizard     │ │
│  └──────────┘  └──────────────┘  └───────┬───────┘ │
│                                           │        │
│  ┌──────────────┐  ┌──────────────┐       │        │
│  │   Review &   │←│  MS Word     │←───────┘        │
│  │   Export     │  │  Export      │                 │
│  └──────────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────┘
           │              │              │
           ▼              ▼              ▼
   ┌──────────────┐ ┌──────────┐ ┌──────────────┐
   │ MediaStream  │ │  Canvas  │ │  localStorage │
   │   API        │ │   API    │ │   (Blobs)     │
   └──────────────┘ └──────────┘ └──────────────┘
           │              │              │
           └──────────────┴──────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  html-docx-js   │
                 │  (.docx Blob)   │
                 └─────────────────┘
```

### 3. Data Model

**Officer (Duty Officer)**
- `officerName` — Full name
- `rank` — PNP Rank
- `badgeId` — Badge/PNP ID

**Detainee**
- `fullName` — Detainee full name
- `offense` — Violation/Offense committed
- `dateOfArrest` — Date of arrest
- `bookingId` — Auto-generated unique reference

**Capture Session**
- `officer` — Reference to Duty Officer
- `detainee` — Reference to Detainee
- `photos` — Array of 4 Base64 JPEGs (Front, Left, Right, Full-Body)
- `timestamp` — Session creation date/time
- `status` — `draft` | `completed`

---

## MS Word Export Workflow

### Overview
The system generates a fully structured MS Word document client-side using `html-docx-js`. No server-side processing is required.

### Step-by-Step Process

1. **HTML Template Construction**
   - A hidden DOM template is populated with detainee metadata, officer credentials, and the four captured mugshots.
   - The template mimics professional police booking sheet layouts with tables, borders, and signature blocks.

2. **Image Embedding**
   - Each captured 2×2 inch JPEG (Base64) is embedded directly into the HTML using `<img src="data:image/jpeg;base64,...">`.
   - Images are sized to exactly **2×2 inches** (≈ 192×192 px at 96 DPI screen resolution) to ensure consistent print output.

3. **Digital Slate Preservation**
   - Because the slate is baked into the image pixels via Canvas, the Word document displays the photographs exactly as they appear on screen—station name, detainee details, and officer credentials already rendered.

4. **Blob Generation**
   - `htmlDocx.asBlob(htmlString)` converts the populated HTML into a Microsoft Word-compatible `.docx` Blob.
   - The Blob is offered to the user via `URL.createObjectURL()` for download.

5. **Fallback / Print Path**
   - If `html-docx-js` fails to load, the system falls back to a dedicated print stylesheet (`@media print`) that formats the booking sheet for direct A4 printing.

### MS Word Document Schema

| Element | Content | Notes |
|---------|---------|-------|
| Header | Republic of the Philippines / MPMPS Letterhead | Centered, bold |
| Title | **MUGSHOT RECORD** | Large, uppercase, underlined |
| Table 1 | Booking Details | Booking ID, Date, Detainee Name, Offense, Arrest Date |
| Table 2 | Officer on Duty | Name, Rank, Badge ID |
| Photo Grid | 2×2 layout | Front Half-Body, Left Side, Right Side, Front Full-Body |
| Slate Info | Text block | Reiterates slate data below photos |
| Footer | Signature Lines | "Detainee Signature", "Investigating Officer", "Station Commander" |

---

## Screen-by-Screen User Workflow

### Screen 1: Duty Officer Login / Register
**Purpose:** Establish accountability and non-repudiation.

**Fields:**
- Full Name (text input)
- Rank (dropdown: Patrolman/Patrolwoman, Police Corporal, Police Sergeant, Police Lieutenant, etc.)
- Badge / PNP ID (text input, alphanumeric validation)

**Actions:**
- **Login** — Validates against stored officer profiles in `localStorage`.
- **Register** — Saves new officer profile to `localStorage` for future sessions.

**Validation:**
- All fields required.
- Badge ID must be unique.
- On success, system transitions to Registration Screen.

---

### Screen 2: Detainee Registration
**Purpose:** Capture case metadata before photography begins.

**Fields:**
- Detainee Full Name (text input)
- Offense / Violation (text input or dropdown)
- Date of Arrest (date input, default today)

**Actions:**
- **Start Capture Session** — Validates inputs, initializes webcam stream, transitions to Camera Screen.

**UI Behavior:**
- Webcam preview is **locked** until detainee details are submitted. This enforces proper documentation before media capture.

---

### Screen 3: Guided 4-Angle Web Photography
**Purpose:** Capture standardized mugshots with real-time guidance.

**Layout:**
- Large live webcam preview (center)
- Capture controls (bottom)
- Progress indicator (e.g., "2 of 4 angles captured")
- Angle guide overlay (text + icon for current pose)

**Capture Sequence:**
1. **Front View (Half-Body)**
2. **Left Side View (Half-Body)**
3. **Right Side View (Half-Body)**
4. **Front View (Full-Body)**

**Per-Capture Flow:**
1. Operator positions subject per on-screen guide.
2. Operator clicks **Capture** (or presses Spacebar).
3. Canvas draws current video frame.
4. System applies **automatic 2×2 inch crop** centered on the frame.
5. System bakes **digital slate** into lower third.
6. Image is stored in session memory.
7. Preview updates with captured thumbnail; operator may **Retake** or proceed.

**Auto-Crop Logic:**
- Canvas extracts a centered 600×600 px region (2×2 inches at 300 DPI equivalent).
- For Full-Body, the crop region shifts to a wider vertical span to include the torso and legs while maintaining 1:1 aspect ratio.

**Digital Slate Rendering:**
- Lower third of the canvas (≈ bottom 30%) is filled with a semi-transparent dark overlay.
- Station name ("**MOISES PADILLA MPS**") is rendered in bold white text.
- Beneath it: Detainee Name, Offense, Date of Arrest, and Officer Name/Rank.
- A timestamp and unique booking reference are appended.

---

### Screen 4: Review & Export
**Purpose:** Final review and multi-format output generation.

**Layout:**
- 2×2 grid of captured photos (with labels).
- Detainee summary card.
- Export action buttons.

**Actions:**
- **Export to MS Word (.docx)** — Generates and downloads editable booking sheet.
- **Download Soft Copies (JPEG)** — Triggers individual downloads or bulk ZIP (future enhancement; currently individual save + localStorage backup).
- **Print A4 Booking Sheet** — Opens browser print dialog with dedicated stylesheet.
- **New Session** — Clears data and returns to Login.

---

## Hardware & Browser Requirements

### Minimum Hardware
| Component | Specification |
|-----------|--------------|
| CPU | Intel Core i3 / AMD Ryzen 3 or equivalent |
| RAM | 4 GB minimum |
| Webcam | 720p (1280×720) minimum; 1080p recommended |
| Display | 1366×768 minimum resolution |
| Storage | 500 MB free space for localStorage quota |

### Browser Requirements
| Browser | Supported Version | Notes |
|---------|------------------|-------|
| Google Chrome | 90+ | Recommended; best MediaStream + Canvas performance |
| Microsoft Edge | 90+ | Fully supported; ideal for Windows workstations |
| Mozilla Firefox | 88+ | Supported; minor CSS print variations possible |
| Safari | 14+ | Supported; requires HTTPS for webcam on non-localhost |

### Network Requirements
- **Offline-capable:** After initial page load, no internet connection is required.
- **HTTPS mandatory for webcam** on production domains. `localhost` is exempt.

### Browser Permissions
- **Camera/Microphone** — User must grant permission on first load.
- **Downloads** — Browser must allow file downloads from the origin.
- **localStorage** — Must not be disabled in browser settings.

---

## Sample MS Word Layout Design

### Visual Representation

```
┌─────────────────────────────────────────────────────────────┐
│              REPUBLIC OF THE PHILIPPINES                     │
│         MOISES PADILLA MUNICIPAL POLICE STATION             │
│                    MPMPS HEADER BLOCK                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        MUGSHOT RECORD                       │
│                                                             │
├──────────────────────┬──────────────────────────────────────┤
│ BOOKING DETAILS      │ OFFICER ON DUTY                     │
│ Booking ID: [____]   │ Name:    [_______________]          │
│ Date:      [____]    │ Rank:    [_______________]          │
│ Name:      [____]    │ Badge:   [_______________]          │
│ Offense:   [____]    │                                     │
│ Arrest:    [____]    │                                     │
├──────────────────────┴──────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │  FRONT VIEW │  │ LEFT  SIDE  │  │ RIGHT SIDE  │       │
│   │ (Half-Body) │  │ (Half-Body) │  │ (Half-Body) │       │
│   │  2" × 2"    │  │  2" × 2"    │  │  2" × 2"    │       │
│   │             │  │             │  │             │       │
│   └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                             │
│   ┌─────────────────────────────────────────────┐         │
│   │              FRONT FULL-BODY                 │         │
│   │                   2" × 2"                   │         │
│   │                                              │         │
│   └─────────────────────────────────────────────┘         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ SLATE DATA                                                 │
│ Station: MOISES PADILLA MPS                                │
│ Detainee: [NAME] | Offense: [OFFENSE]                      │
│ Date: [DATE] | Officer: [NAME / RANK / BADGE]              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   _________________________        _________________________ │
│   Detainee Signature        Date   Investigating Officer    │
│                                                             │
│   _________________________        _________________________ │
│   Station Commander          Date                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Considerations
- **2×2 inch photo enforcement:** All images are rendered at fixed physical dimensions in the Word document to comply with standard mugshot sizing.
- **Editable fields:** The MS Word output preserves all text fields as editable, allowing supervisors to annotate or correct entries post-capture.
- **Print optimization:** Margins and page breaks are configured for A4 (210×297 mm) with safe print zones.
- **Digital slate redundancy:** Slate text appears both baked into the photo and as a typed block below, ensuring OCR and human readability.

---

## Appendix: Technical Notes

### Digital Slate Specification
- **Canvas Size:** 600×600 px (2×2 inches at 300 DPI)
- **Slate Area:** Lower 30% of canvas
- **Background:** `rgba(0, 30, 80, 0.75)` — Dark navy semi-transparent
- **Text Color:** `#FFFFFF`
- **Font:** `Arial`, `sans-serif`
- **Station Name:** 18 px, bold, centered
- **Details:** 12 px, regular, left-aligned beneath station name

### localStorage Schema Keys
| Key | Value Type | Description |
|-----|-----------|-------------|
| `mpmps_officers` | JSON Array | Registered duty officers |
| `mpmps_current_officer` | JSON Object | Active session officer |
| `mpmps_session` | JSON Object | Current capture session data |
| `mpmps_history` | JSON Array | Completed sessions (detainee + photos) |

### Security & Privacy Considerations
- All data is stored **locally** on the workstation; no data is transmitted externally.
- Photos are stored as Base64 in `localStorage` (subject to ~5–10 MB quota). For high-volume stations, future enhancement should migrate to IndexedDB.
- Duty Officer authentication is enforced but uses plain localStorage (not secure against local tampering). This is acceptable for a **single-workstation, physically secured** police station environment.

---

*Document prepared for the Moises Padilla Municipal Police Station — MPMPS MugshotCam System Proposal*
