# Engineering Principles & Guidelines

Guidelines for AI agents and engineers working on this codebase.

---

## 1. Cohesion & Colocation Over Fragmentation

- **Code that changes together lives together.** A feature’s type, default values, and schema serialization belong in one cohesive file, not scattered across multiple directories.
- **Avoid Micro-File Sprawl.** Prefer a clean, readable 100–300 line file over 8 disjointed 20-line files.
- **Eliminate Pass-Through Indirection.** Do not create intermediate wrappers, redundant barrels, or adapter files that only re-export or forward props without adding business logic.
- **The Two-File Rule.** Adding, modifying, or removing a setting/feature should touch at most 2 files (the domain definition and the screen UI).

---

## 2. Component Design & Screen Colocation

- **No Single-Use Double Wrapping.** Do not create a separate component file solely to wrap it in a 10-line screen file. Colocate single-use screen UI directly in the screen.
- **Extract for Genuine Reuse Only.** Extract UI into shared components only when reused across 2 or more distinct surfaces.
- **Composition Over Prop Drilling.** Compose screens using clean, reusable layouts and primitives rather than deeply nested wrapper layers.

---

## 3. Contracts, Types & Data Flow

- **Single Source of Truth.** Define types, schema keys, and defaults together.
- **Object Contracts Over Positional Parameter Chains.** Pass cohesive typed objects (e.g., `preferences`) to resolvers and pure functions instead of chaining positional arguments that break signatures on every change.
- **Strict Type Safety.** All changes must pass `npm run typecheck` (`tsc --noEmit`) with 0 errors. Never use `any` when explicit union or generic types can represent state safely.

---

## 4. Code Cleanliness & Commenting Standards

- **Self-Explanatory Code.** Code should read clearly on its own through precise naming and straightforward data flow.
- **No Decorative Comment Banners.** Never write section divider comments (e.g., `/* ----- */`, `// =====`).
- **No Redundant or Verbose Comments.** Do not restate what the code clearly does. Use concise `//` or `/* */` only when explaining non-obvious domain logic, invariants, or intentional design constraints.
