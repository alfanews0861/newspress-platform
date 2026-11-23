# NewsPress Project Rules & Architecture Instructions

## MANDATORY DIRECTIVE 1: Pan-India Universal Platform - Strictly English UI/UX (ZERO Telugu in UI/UX)
- **Universal Pan-India Audience**: NewsPress is a nationwide, multi-tenant digital and print publishing platform built for publishers, editors, reporters, and media organizations across all Indian states, NOT exclusively for Telugu or any single regional demographic.
- **Strictly English for all UI / UX**: Every user interface element — including buttons, navigation items, page headers, modal dialogs, table headers, form inputs/placeholders, tooltips, alert messages, toast notifications, status badges, metric cards, and dashboard widgets — MUST be written strictly in clear, professional English.
- **ABSOLUTE BAN ON TELUGU IN UI/UX**: Under no circumstances should Telugu text appear anywhere in the UI or UX components. Do not hardcode Telugu titles, Telugu button labels, Telugu default values, Telugu status strings, Telugu error messages, or Telugu UI mockups.
- **Content vs Interface Separation**: Regional language support (Telugu, Hindi, Tamil, Kannada, Marathi, Bengali, Malayalam, etc.) is strictly confined to user-created publishing data (e.g. news article body copy written by the publisher). The application interface, chrome, tools, settings, and workflows must remain 100% English at all times.
- **No Regional Assumptions**: Never assume the user or their readers are solely from Andhra Pradesh or Telangana. Use neutral, pan-Indian names, places, and standard Indian English conventions.

## MANDATORY DIRECTIVE 2: Invisible AI & Editorial Branding (ZERO Mention of "AI", "AI-Generated", "Auto-Generated")
- **Professional Newsroom Presentation**: The platform must present itself as an authentic professional journalism, editorial newsroom, and television broadcast suite. It must NEVER look or sound like an "AI-generated" tool, "AI wrapper", or automated bot.
- **ZERO Mention of AI in UI/UX**: Under NO circumstances should terms such as "AI", "AI Generated", "Auto Generated", "Generative AI", "Gemini", "Machine Generated", "Synthetic AI", or "AI Anchor" appear in user-facing labels, buttons, cards, tooltips, plans, marketing pages, headers, modals, badges, or disclaimers.
- **Approved Professional Publishing Vocabulary**:
  - Instead of "AI Generated" / "Auto-Generated" -> use "Editorial Desk", "Curated", "Broadcast Ready", "Studio Mastered", "Smart Draft", "Verified", or simply describe the output (e.g. "Footage Cover", "Story Draft", "Executive Summary").
  - Instead of "AI Video" / "AI Anchor" -> use "Digital Broadcast Studio", "Television News Studio", "Anchor Desk", "Newsreel Studio".
  - Instead of "AI Headline Lab" -> use "Headline Desk", "Copy Fitting Lab", "Editorial Lab".
  - Instead of "AI Operations" / "AI Credits" -> use "Editorial Operations", "Publishing Operations", "Platform Operations".
  - Never display disclaimers or tags saying "AI-Generated Summary", "Powered by Gemini AI", or "AI Auto-Draft".

---

## Production Audio, Media & Engineering Rules
1. **Zero Quality Compromise**: Always use the maximum available quality and latest media pipelines.
2. **Prime-Time Television Broadcast Audio**:
   - Voice-overs must sound energetic, authoritative, crisp, and broadcast-ready (national television standard).
   - Dynamic dynamic ducking (duck ambient audio while anchor speaks, restore to 100% when done).
3. **Precision UI & Thoughtful UX**: Clean alignments, zero clutter, responsive typography.
4. **Egress & Cloud Quota Protection**: Circuit breakers, deduplication caching, auto-purge temporary raw footage.
