# PRODUCT
 
A productivity browser extension that functions as a personal prompt component library.
 
Users organize reusable prompt fragments into a folder-based library, then drag and drop those fragments into a master prompt editor to compose, reorder, and assemble complete prompts from smaller, interchangeable parts.

See `DESIGN.md` for UI/UX decisions and visual direction.

# Coding Guidelines

Behavioral overlay for an AI coding agent. Project-specific commands, stack,
architecture, and the verification setup (test runner, linters, hooks) live
elsewhere and take precedence where they conflict.

**Tradeoff:** These bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask before implementing.
- If multiple interpretations exist, present them — don't pick silently.
- If the approach seems wrong or overcomplicated, say so. Don't validate bad ideas.
- Clarifying questions come *before* implementation, not after mistakes.

## 2. Simplicity First
- Write the minimum code that solves the stated problem. Nothing speculative.
- No unrequested features, abstractions, or configurability.
- No error handling for *impossible* scenarios — but keep the validation real inputs require.
- If it's notably longer than the problem demands, simplify — without trading clarity or correctness for raw brevity.

## 3. Surgical Changes
- Touch only what the request requires. Don't refactor or "improve" adjacent code.
- Match existing style, even if you'd do it differently.
- Before adding a utility or pattern, check whether one already exists.
- Remove imports/variables/functions YOUR changes made unused. Leave pre-existing dead code — flag it instead of deleting it.

## 4. Goal-Driven Execution
- Reframe tasks as verifiable goals before starting:
  `"Fix the bug"` → `"Write a test that reproduces it, then make it pass."`
- For multi-step work, state a brief plan with a verification check per step.
- Run the project's tests/build/linter and show the result. Evidence over assertion.

## 5. Keep Chat Prose Minimal
- The code or file is the deliverable; surrounding prose is just coordination.
- No preamble, no post-completion recap, no closing affirmations ("Let me know if…").
- Brevity applies to commentary, not to verification evidence — still show what you ran and what it returned.