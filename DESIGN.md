---
version: "alpha"
name: "Grunge Rock dos Anos 90"
description: "90s grunge rock landing page. Ideal for landing pages, saas. AI-ready template."
colors:
  primary: "#4F46E5"
  secondary: "#0EA5E9"
  tertiary: "#10B981"
  neutral: "#F4F4F5"
  surface: "#FFFFFF"
  accent: "#F59E0B"
typography:
  h1:
    fontFamily: Courier New
    fontSize: 2.5rem
    fontWeight: 700
  body-md:
    fontFamily: Courier New
    fontSize: 1rem
    fontWeight: 400
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    padding: 12px
---

## Overview

90s grunge rock landing page. Ideal for landing pages, saas. AI-ready template. Before grunge had a name, it had a look — photocopied flyers stapled to telephone poles outside Seattle venues, hand-scrawled setlists, album art that looked like it survived a basement flood. Nirvana's Nevermind was polished on purpose (the irony wasn't lost on anyone), but Pearl Jam's Vs. and its stark livestock photography, Alice in Chains' tripod artwork, Mudhoney's xeroxed chaos — that was the real visual DNA. It wasn't designed. It was assembled.

Then David Carson blew typography apart. Ray Gun magazine (1992–2000) treated readability as optional. He set entire interviews in Zapf Dingbats. Columns bled off pages. Photos were scratched, layered, degraded. Carson wasn't illustrating grunge — he was proving that destruction was a valid compositional tool. The establishment hated it. Kids pinned those pages to their walls.

Distressed textures, torn paper edges, misregistered ink — these weren't aesthetic choices born from software filters. They came from actual physical processes: bad photocopiers, wheat-paste residue, rained-on gig posters. The roughness was evidence of lived experience. Anti-design became the only honest design for a generation that rejected the slick corporate visual language of the 80s.

- Density: 5/10 — Balanced
- Variance: 8/10 — Expressive
- Motion: 4/10 — Subtle

- **Style:** Raw, Gritty, Anti-Design
- **Keywords:** grunge, 90s rock, raw, gritty, anti-design, distressed, xerox, zine, chaotic, authentic
- **Era:** Early 1990s Alternative Scene
- **Light/Dark:** ✓ Full / ✗ No

## Colors

- **Indigo** (#4F46E5) — Primary actions, brand color, active/selected states
- **Sky Blue** (#0EA5E9) — Secondary actions, links, informational states
- **Emerald** (#10B981) — Success states, submitted/completed forms
- **Cloud White** (#F4F4F5) — Light surface, page background
- **Pure White** (#FFFFFF) — Card / surface background
- **Amber** (#F59E0B) — Warning states, attention indicators
- **Slate Grey** (#64748B) — Secondary text, borders, muted elements
- **Rose Red** (#E11D48) — Error states, destructive actions

## Typography

- **Display / Hero:** Courier New — Weight 700, tight tracking, used for headline impact
- **Body:** Courier New — Weight 400, 16px/1.6 line-height, max 72ch per line
- **UI Labels / Captions:** Courier New — 0.875rem, weight 500, slight letter-spacing
- **Monospace:** Courier New — Used for code, metadata, and technical values

Scale:
- Hero: clamp(2.5rem, 5vw, 4rem)
- H1: 2.25rem
- H2: 1.5rem
- Body: 1rem / 1.6
- Small: 0.875rem


## Layout

- **Grid:** CSS Grid primary. Max-width containment: 1280px centered with 1.5rem side padding.
- **Spacing rhythm:** Balanced. Base unit: 0.5rem (8px).
- **Section vertical gaps:** clamp(4rem, 8vw, 8rem).
- **Hero layout:** Asymmetric composition.
- **Feature sections:** Asymmetric grid with varied card sizes. No 3-equal-columns.
- **Mobile collapse:** All multi-column layouts collapse below 768px. No horizontal overflow.
- **z-index contract:** base (0) / sticky-nav (100) / overlay (200) / modal (300) / toast (500).


## Elevation & Depth

Distressed textures, torn paper, xerox copy artifacts, chaotic typography, handwritten notes, duct tape elements, grainy photos, misaligned grids

- **Physics:** Ease-out curves, 200-300ms duration. Smooth and predictable.
- **Entry animations:** Fade + translate-Y (16px → 0) over 420ms ease-out. Staggered cascades for lists: 80ms between items.
- **Hover states:** Subtle color shift + shadow adjustment over 200ms.
- **Page transitions:** Fade only (200ms).
- **Performance:** Only transform and opacity animated. No layout-triggering properties.


## Shapes

Base corner radius: 8px. See rounded tokens in front matter for the full scale.


## Components

- **Primary Button:** Subtly rounded (0.5rem) shape. Accent color fill. Hover: 8% darken + subtle lift shadow. Active: -1px translate tactile press. Font weight 600. No outer glows.
- **Secondary / Ghost Button:** Outline variant. 1.5px border in muted color. Text in primary color. Hover: subtle background fill.
- **Cards:** Subtly rounded (0.5rem) corners. Surface background. Subtle shadow (0 2px 12px rgba(0,0,0,0.06)). 1px border stroke.
- **Inputs:** Label above input. 1px border stroke. Focus ring: 2px accent color offset 2px. Error text below in semantic red. No floating labels.
- **Navigation:** Primary surface background. Active item: accent color indicator. Font weight 500 when active.
- **Skeletons:** Shimmer animation matching component dimensions. No circular spinners.
- **Empty States:** Icon-based composition with descriptive text and action button.


## Do's and Don'ts

- No emojis in UI — use icon system only (Lucide, Heroicons)
- No pure black (#000000) — use off-black or charcoal variants
- No oversaturated accent colors (saturation cap: 80%)
- No 3-column equal-width feature layouts — use zig-zag or asymmetric grid
- No `h-screen` — use `min-h-[100dvh]`
- No AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen"
- No broken external image links — use picsum.photos or inline SVG
- No generic lorem ipsum in demos

- Do Distressed textures
- Do Xerox copy effects
- Do Chaotic typography
- Do Torn paper edges
- Do Duct tape elements
- Do Zine-style layout


## Use Case

Landing pages, SaaS

<!-- Source: https://designmd.app/library/grunge-rock-dos-anos-90 · designmd.app -->