# Design System Strategy: The Monochromatic Workspace

## 1. Overview & Creative North Star
The **Creative North Star** for this design system is **"The Digital Curator."** 

In a world of cluttered, loud productivity tools, this system acts as a silent partner. It prioritizes the user’s cognitive load by utilizing a "High-End Editorial" approach. We move away from generic "card-and-border" layouts toward a sophisticated, layered environment. By leveraging deep charcoal foundations and intentional asymmetry, we create a tool that feels less like software and more like a focused, premium workspace. 

The experience is defined by **tonal depth** rather than structural rigidity. We use the extreme contrast between the `display-lg` typography and `surface-container` nesting to guide the eye, creating a natural flow that mimics the layout of a modern architectural magazine.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep obsidian and charcoal tones, specifically curated to reduce eye strain while maintaining a sense of prestige.

### The "No-Line" Rule
To achieve a high-end feel, **1px solid borders for sectioning are strictly prohibited.** Structural separation must be achieved through:
*   **Background Shifts:** Use `surface` (`#0e0e0e`) for the main workspace and `surface-container-low` (`#131313`) for persistent sidebars.
*   **Tonal Transitions:** Define distinct areas by nesting a `surface-container-highest` (`#252626`) element inside a lower-tier container to imply importance without a hard stroke.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper.
1.  **Base Layer:** `surface` (`#0e0e0e`) - The infinite canvas.
2.  **Middle Layer:** `surface-container` (`#191a1a`) - For secondary content groups or list backgrounds.
3.  **Top Layer:** `surface-bright` (`#2c2c2c`) - For active elements or modals.

### The "Glass & Gradient" Rule
For floating elements (like hover tooltips or command palettes), utilize **Glassmorphism**. Apply a semi-transparent `surface-container-highest` with a 20px `backdrop-blur`. This allows the "soul" of the background content to bleed through, creating an integrated, premium feel. 

For Primary CTAs, use a subtle linear gradient from `primary` (`#c6c6c7`) to `primary-dim` (`#b8b9b9`) at a 145-degree angle to provide a metallic, satin-like finish.

---

## 3. Typography
We use **Inter** as the foundational typeface. It is a clean, neutral sans-serif that, when used at extreme scales, becomes a brand asset.

*   **Display Scale:** Use `display-lg` (3.5rem) with -0.02em letter spacing for empty states or dashboard headers. This creates an authoritative, editorial presence.
*   **Hierarchy:** Pair `title-lg` (1.375rem) with `on_surface_variant` (`#acabaa`) for descriptions. The contrast between the bright title and the muted secondary text creates an immediate visual anchor.
*   **Readability:** For long-form productivity text, use `body-lg` with a line height of 1.6. This ensures the interface feels "breathable" despite the dark palette.

---

## 4. Elevation & Depth
Depth is conveyed through **Tonal Layering** and light simulation, never through heavy dropshadows.

*   **The Layering Principle:** Place a `surface-container-lowest` (`#000000`) element on a `surface-container` (`#191a1a`) base to create a "recessed" look for input fields.
*   **Ambient Shadows:** For floating menus, use a 32px blur with 6% opacity. Use the `on_surface` color as the shadow tint. This mimics natural light bouncing in a dark room.
*   **The "Ghost Border" Fallback:** In high-density views where containment is necessary, use a **Ghost Border**. This is a 1px stroke using `outline_variant` (`#484848`) at **20% opacity**. It should feel like a suggestion of a line, not a boundary.

---

## 5. Components

### Buttons
*   **Primary:** Background `primary` (`#c6c6c7`), Text `on_primary` (`#3f4041`). Use `md` (0.375rem) corner radius.
*   **Secondary:** Ghost style. Transparent background with a `Ghost Border`. Text in `primary`.
*   **States:** On hover, primary buttons should shift to `primary_fixed_dim` (`#d4d4d4`). Use a 200ms ease-in-out transition.

### Input Fields
*   **Structure:** No background border. Use `surface-container-highest` (`#252626`) as a solid background with a `sm` (0.125rem) radius.
*   **Focus:** Transition the background to `surface-bright` (`#2c2c2c`) and apply a 1px `outline` (`#767575`) border.

### Cards & Lists
*   **The Divider Forfeiture:** **Do not use horizontal lines.** Separate list items using `8` (2rem) of vertical whitespace or by alternating background tones (`surface` to `surface-container-low`). 
*   **Interactive Items:** Use `surface-container-high` (`#1f2020`) for hover states on list items, with a `DEFAULT` (0.25rem) corner radius to "lift" the item from the background.

### Custom Component: The "Context Rail"
A slim, vertical navigation strip using `surface-container-lowest` (`#000000`) that sits against the left edge. Icons use `on_surface_variant` and transition to `primary` when active, accompanied by a subtle `primary` glow (4px blur).

---

## 6. Do's and Don'ts

### Do
*   **Do** use `20` (5rem) and `24` (6rem) spacing to create asymmetrical "Editorial" layouts.
*   **Do** use `surface-tint` for subtle highlights on active icons to imply a glow.
*   **Do** prioritize `on_surface_variant` for all non-essential text to maintain the "muted" ChatGPT-inspired aesthetic.

### Don't
*   **Don't** use pure white (`#ffffff`) for text; it causes "halation" (glowing effect) on dark backgrounds. Use `on_surface` (`#e7e5e4`).
*   **Don't** use standard `lg` or `xl` shadows for cards. Stick to tonal shifts.
*   **Don't** use high-saturation colors for errors. Use the muted `error` (`#ee7d77`) to maintain the sophisticated mood.