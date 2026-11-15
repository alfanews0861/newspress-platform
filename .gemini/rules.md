# NewsPress Engineering & Production Rules

## Rule 1: Zero Quality Compromise & Modern Technology
- **Utmost Quality Standard**: Every feature, media pipeline, AI synthesis, and UI screen must use the maximum available quality and the latest technology. Never settle for low-grade, obsolete, or sluggish fallbacks.
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
