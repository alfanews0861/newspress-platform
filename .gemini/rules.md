# NewsPress Engineering & Production Rules

## Rule 0A: Pan-India Universal Platform - Strictly English UI/UX (ZERO Telugu in UI/UX)
- **Universal Pan-India Audience**: NewsPress is a nationwide platform built for publishers, editors, reporters, and media houses across all of India, NOT just for Telugu or any single regional demographic.
- **Strictly English for all UI/UX**: Every button, label, navigation item, modal dialog, table header, form placeholder, alert message, toast notification, status badge, card, and dashboard widget MUST be written strictly in clear, professional English.
- **ABSOLUTE BAN ON TELUGU IN UI/UX**: Telugu text must NEVER appear anywhere in the UI or UX components. Do not hardcode Telugu titles, Telugu button labels, Telugu default values, Telugu status strings, Telugu error messages, or Telugu UI mockups.
- **Content vs Interface Separation**: Regional language support (Telugu, Hindi, Tamil, Kannada, Marathi, Bengali, etc.) is strictly confined to user-created publishing data (e.g. article content written by the publisher). The application interface, chrome, tools, settings, and workflows must remain 100% English at all times.
- **No Regional Assumptions**: Never assume the user or their readers are solely from Andhra Pradesh or Telangana. Use neutral, pan-Indian names, places, and currency/date formats.

## Rule 0B: Invisible AI & Editorial Branding Directive (ZERO Mention of "AI", "AI-Generated", "Auto-Generated")
- **Professional Newsroom Presentation**: The platform must present itself as an authentic professional journalism, editorial newsroom, and television broadcast suite. It must NEVER look or sound like an "AI-generated" tool, "AI wrapper", or automated bot.
- **ZERO Mention of AI in UI/UX**: Under NO circumstances should terms such as "AI", "AI Generated", "Auto Generated", "Generative AI", "Gemini", "Machine Generated", "Synthetic AI", or "AI Anchor" appear in user-facing labels, buttons, cards, tooltips, plans, marketing pages, headers, modals, badges, or disclaimers.
- **Approved Professional Publishing Vocabulary**:
  - Instead of "AI Generated" / "Auto-Generated" -> use "Editorial Desk", "Curated", "Broadcast Ready", "Studio Mastered", "Smart Draft", "Verified", or simply describe the outcome (e.g. "Footage Cover", "Story Draft", "Executive Summary").
  - Instead of "AI Video" / "AI Anchor" -> use "Digital Broadcast Studio", "Television News Studio", "Anchor Desk", "Newsreel Studio".
  - Instead of "AI Headline Lab" -> use "Headline Desk", "Copy Fitting Lab", "Editorial Lab".
  - Instead of "AI Operations" / "AI Credits" -> use "Editorial Operations", "Publishing Operations", "Platform Operations".
  - Never display disclaimers or tags saying "AI-Generated Summary", "Powered by Gemini AI", or "AI Auto-Draft".

## Rule 1: Zero Quality Compromise & Modern Technology
- **Utmost Quality Standard**: Every feature, media pipeline, synthesis engine, and UI screen must use the maximum available quality and the latest technology. Never settle for low-grade, obsolete, or sluggish fallbacks.
- **Prime-Time Television Broadcast Audio**:
  - Voice-overs must sound energetic, authoritative, crisp, and broadcast-ready (like national television anchors on TV9, BBC, CNN, Aaj Tak).
  - Never use slow, monotone, or crying robotic voices.
  - Apply broadcast audio engineering: fast pacing (1.12x - 1.15x tempo), bass warmth (120Hz EQ), presence boost (3200Hz EQ), and dynamic compressor leveling.
  - Video ambient audio ducking must be dynamic: duck ambient footage while anchor is speaking (0.12), restore immediately to 100% full volume when anchor finishes.

## Rule 2: Precision UI & Thoughtful UX
- **Alignment & Typography**: Every layout, card, button, and badge must be neatly aligned with proper padding, whitespace-nowrap where needed, and clear visual hierarchy.
- **Post-Publish Focus**: When a broadcast is published, do not clutter the screen with previous inputs or forms. Highlight the live video showcase, watch link, and embed player cleanly, with a "+ Broadcast Another Story" reset action.
- **Autonomous & Permanent**: Authentication and operations must run 24/7 without requiring reporters or users to reconnect every hour.

## Rule 3: Egress & Cloud Quota Protection (Anti-Loop Circuit Breaker)
- **Zero Runaway Loops**: Never allow automated or background retry loops to repeatedly transfer large media assets between Storage, Cloud Run, and Client.
- **Circuit Breaker**: Enforce a strict ceiling of max 3 rendering/upload attempts within 60 seconds per asset; abort immediately if threshold is exceeded.
- **Deduplication Caching**: Cache uploaded cloud storage URLs for active files so retries do not re-upload the same footage file and incur duplicate network egress.
- **Auto-Purge Temporary Storage**: Temporary raw footage objects in Cloud Storage (`news_footage/`) must be immediately deleted upon download and processing by Cloud Run to eliminate storage bloat and lingering egress targets.
- **Strict Domain & Size Verification**: Only allow downloads from trusted project Storage buckets, with a hard 120MB ceiling and timeout aborts.
