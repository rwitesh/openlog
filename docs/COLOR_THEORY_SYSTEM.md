# OpenLog Color Theory & Design System Specification

> **Architectural Audit & Design Direction**  
> *Author:* Cognitive Product Research & Systems Design  
> *Target:* Visual Identity, Perception Psychology, and `src/theme/tokens.ts`

---

## 1. The Executive Audit: Diagnosing the "Charcoal Black" Trap

### The Current State
In the current implementation (`src/theme/tokens.ts`):
* **Default Accent (`#6B665C` / `#CDC8BE`):** Labeled *"Systematic graphite ink"*. It is an achromatic, desaturated gray.
* **Default Dark Canvas (`#121215` / `#191A1E` / `#23242A`):** A cold, bluish-charcoal stack.
* **Default Marker (`#F2F2F5` / `#181614`):** When the accent is "default", the timeline rail dots and markers fall back to harsh white/black monochrome.

### Why This Feels Sterile
1. **Sensory Deprivation (The Spreadsheet Effect):**
   When an onboarding user enters an app that is 98% charcoal and neutral gray, the brain registers it as an *administrative or task tool* (like terminal logs, Xcode, or Jira), not an intimate, warm sanctuary for personal life reflection.
2. **The Disconnected Accent Problem:**
   The codebase provides 24 individual accent choices (`terracotta`, `amber`, `sage`, `denim`, etc.), but **an accent color alone cannot rescue a cold canvas**. Placing a terracotta dot onto a cold, steel-gray `#121215` background feels like an isolated splash of paint on concrete rather than a coherent room.
3. **The "Muddy" Default Light Theme:**
   In light mode, `#FAF8F5` paired with `#F2EFE9` and `#7C5828` can look dusty or yellowed rather than crisp, luminous, or intentionally tactile.

---

## 2. Color Psychology & Neuroscience of Reflection

### A. Circadian Biology & Emotional Temperature
Autobiographical writing happens disproportionately in two mental states:
1. **Morning Orientation (06:00 – 09:30):** High cognitive freshness, planning, sensory awakening. Demands **clear, breathable, luminous surfaces** with high legibility.
2. **Evening Decompression (20:30 – 23:30):** Parasympathetic transition, vulnerability, memory consolidation. Cold, blue-tinted dark grays (`#121215`) subtly signal alertness/work. **Warm-tinted darks (Espresso, Nocturne, Deep Cocoa)** lower heart rate, reduce screen glare, and create an atmosphere of cozy psychological safety.

### B. The Von Restorff (Isolation) Effect
When every element on screen is monochrome gray:
* Timestamps, dates, location tags, and text blur together into an undifferentiated wall of glyphs.
* By introducing **purposeful chromatic micro-anchors** (e.g. an amber location pill, an emerald photo tag, an indigo voice waveform), the visual cortex instantly parses the timeline structure in $<100\text{ms}$ without conscious effort.

### C. Dignity of the Everyday
As observed in our onboarding audit: *even small notes should feel elevated*. A muted gray badge feels disposable; a subtle, warm chromatic tint gives every captured thought visual dignity.

---

## 3. The 3-Tier Color System

To replace the sterile charcoal default without compromising simplicity, OpenLog should organize color across three distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 1: Canvas Atmospheres (Base Temperature & Depth)      │
│  • Nocturne (Warm Dark)  • Midnight (Cosmic)  • Washi/Pure  │
├─────────────────────────────────────────────────────────────┤
│  Tier 2: Signature & Accent Spectrum                        │
│  • OpenLog Cobalt (Iconic Default)  • Terracotta  • Sage... │
├─────────────────────────────────────────────────────────────┤
│  Tier 3: Semantic Micro-Tints (Functional Chromatics)       │
│  • Location (Sky/Amber)  • Audio (Marker)  • Media (Emerald)│
└─────────────────────────────────────────────────────────────┘
```

---

### Tier 1: Canvas Atmospheres (Base Themes)

Instead of a single flat gray for dark and a single dusty cream for light, we define **4 cohesive atmospheres**:

#### Atmosphere 1: "Nocturne" (Warm Dark — The Evening Sanctuary)
* *Psychology:* Fireside journal, dark espresso, aged mahogany. Zero blue glare.
* *Background:* `#141312` (Deep rich warm black)
* *Surface:* `#1C1A18` (Warm cocoa slate)
* *SurfaceMuted:* `#262320` (Subtle coffee stone)
* *Separator:* `#2F2C27`
* *Text Primary:* `#F4F0EB` (Soft linen white)
* *Text Secondary:* `#A8A196` (Warm driftwood)
* *Text Tertiary:* `#706B62`

#### Atmosphere 2: "Midnight Slate" (Cool Dark — Deep Cosmic Focus)
* *Psychology:* Deep night sky, obsidian, quiet modern architecture.
* *Background:* `#0B0E14` (Deep twilight obsidian)
* *Surface:* `#121620` (Subtle navy-tinted charcoal)
* *SurfaceMuted:* `#1B2130` (Iced slate)
* *Separator:* `#242C3E`
* *Text Primary:* `#F1F5F9` (Crisp arctic white)
* *Text Secondary:* `#94A3B8` (Cool silver)
* *Text Tertiary:* `#64748B`

#### Atmosphere 3: "Washi" (Warm Light — Japanese Book Paper)
* *Psychology:* Premium notebook, morning sunlit desk, linen stationery.
* *Background:* `#FAF7F2` (Warm milk paper)
* *Surface:* `#FFFFFF` (Pure page)
* *SurfaceMuted:* `#F2ECE1` (Soft oatmeal)
* *Separator:* `#E5DDD0`
* *Text Primary:* `#1C1917` (Sumi ink black)
* *Text Secondary:* `#6B6357` (Raw umber)
* *Text Tertiary:* `#9C9284`

#### Atmosphere 4: "Pure Clean" (Minimalist Light)
* *Psychology:* Swiss typography, modern architectural gallery.
* *Background:* `#FFFFFF`
* *Surface:* `#F8FAFC`
* *SurfaceMuted:* `#F1F5F9`
* *Separator:* `#E2E8F0`
* *Text Primary:* `#0F172A`
* *Text Secondary:* `#475569`
* *Text Tertiary:* `#94A3B8`

---

### Tier 2: The Signature & Accent Spectrum

#### 1. Replace the "Graphite Ink" Default Accent
* **Current Default:** `#6B665C` (uninviting dirty gray).
* **Proposed Signature Accent: "OpenLog Cobalt"**
  * Light Mode: `#2D5BE3` (Rich, confident ultramarine)
  * Dark Mode: `#4D7DF9` (Luminous electric cobalt)
  * *Why:* Cobalt is universally trusted, serene, modern, and provides an immediate burst of life upon first launch without feeling aggressive.

#### 2. Harmonized Accent Pairs (Curated Contrast & Luminance)

| ID | Name | Light Color | Dark Color | Emotion / Character |
|---|---|---|---|---|
| `cobalt` | **Cobalt (Default)** | `#2D5BE3` | `#4D7DF9` | Iconic, confident, clear |
| `terracotta` | **Terracotta** | `#B84E34` | `#E8785E` | Grounded, artistic, warm |
| `amber` | **Amber Honey** | `#B87514` | `#F5A738` | Radiant, nostalgic, optimistic |
| `sage` | **Botanical Sage** | `#3D734E` | `#6EB582` | Restorative, calm, natural |
| `rose` | **Dusty Rose** | `#A83B5E` | `#E86E95` | Intimate, tender, poetic |
| `violet` | **Deep Violet** | `#6035B5` | `#A377FA` | Contemplative, nocturnal |
| `teal` | **Pacific Teal** | `#147D75` | `#45C2B8` | Clear-headed, balanced |
| `slate` | **Graphite Slate** | `#525866` | `#A0A6B5` | Pure architectural neutrality |

---

### Tier 3: Semantic Micro-Tints (Micro-Moments)

Instead of using raw gray borders and backgrounds for media and tags, use **15% Alpha Translucency**:

* **Location Chips:**  
  `accentColor + "18"` fill, `accentColor` icon/text $\rightarrow$ *Crisp sense of place.*
* **Voice Memos & Audio:**  
  `markerColor + "16"` fill, solid circle button with `markerColor` $\rightarrow$ *Tactile sound wave.*
* **Photo Attachments:**  
  `#10B98118` (Emerald tint) with `#10B981` text $\rightarrow$ *Fresh visual memory.*
* **Dates & Timeline Rail:**  
  Anchor markers illuminated by the active theme's accent, keeping the timeline thread vibrant and intuitive.

---

## 4. Implementation Roadmap (Phased & Non-Breaking)

### Phase 1: Elevate Default Theme Tokens (`tokens.ts`)
1. **Signature Accent:** Update the default accent in `ACCENT_OPTIONS[0]` from dead graphite (`#6B665C`) to **OpenLog Cobalt** (`#2D5BE3` / `#4D7DF9`).
2. **Warm Dark Baseline:** Shift `DEFAULT_DARK_THEME` from cold `#121215` to warm **Nocturne** (`#141312` / `#1C1A18`), instantly making night-time journaling warmer.
3. **Warm Paper Baseline:** Shift `DEFAULT_LIGHT_THEME` from dull gray cream to **Washi Linen** (`#FAF7F2` / `#F2ECE1`).

### Phase 2: Atmosphere Selector in Settings
1. Add an `atmosphere` setting in `preferences.ts` (`nocturne` | `midnight` | `washi` | `clean`).
2. Allow users to freely combine their base Atmosphere with any of the 8 curated Accents.

### Phase 3: Seamless Backward Compatibility
* Existing user SQLite records store `accent_choice = "default"`. By updating the definition of `"default"` in `tokens.ts`, existing users immediately receive the polished, high-craft palette without database migrations.

---

## 5. Verification Checklist

- [ ] All text/surface pairs meet **WCAG AAA** (7:1 for body) or **AA** (4.5:1 for captions).
- [ ] No cold, stark monochromatic gray voids on first open.
- [ ] Safe Area, `ThemedBackground`, and `WelcomeShowcase` reflect the enhanced palette seamlessly.
- [ ] Passes `npm run typecheck` and Biome format with 0 errors.
