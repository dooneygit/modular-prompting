# PRODUCT
 
A productivity browser extension that functions as a personal prompt component library.
 
Users organize reusable prompt fragments into a folder-based library, then drag and drop those fragments into a master prompt editor to compose, reorder, and assemble complete prompts from smaller, interchangeable parts.

See `DESIGN.md` for UI/UX decisions and visual direction.

# Coding Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask before implementing.
- If multiple interpretations exist, present them — don't pick silently.
- If the approach seems wrong or overcomplicated, say so. Don't validate bad ideas.

## 2. Simplicity First
- Minimum code that solves the problem. Nothing speculative.
- No unrequested features, abstractions, flexibility, or defensive error handling.
- If it could be half the length, rewrite it.

## 3. Surgical Changes
- Touch only what the request requires. Don't improve adjacent code.
- Match existing style. Flag unrelated issues; don't fix them.
- Remove imports/variables/functions YOUR changes made unused — not pre-existing dead code.
- Before writing new utilities or patterns, check if one already exists.

## 4. Goal-Driven Execution
- Reframe tasks as verifiable goals before starting:
  `"Fix the bug"` → `"Write a test that reproduces it, then make it pass"`
- For multi-step tasks, state a brief plan with a verification check per step.
- Clarifying questions come *before* implementation, not after mistakes.

## 5. Keep Chat Responses Brief
- Prose is coordination. The code or file is the deliverable — keep surrounding text minimal.
- No preamble, no post-completion summaries, no closing affirmations ("Let me know if…").
