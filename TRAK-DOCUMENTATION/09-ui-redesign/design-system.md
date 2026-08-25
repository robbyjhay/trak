# Design System Reconstruction

This document explains how TRAK's visual styling architecture evolved from a hardcoded prototype palette to a modern, semantic design system.

## The Original System (Pre-Redesign)
The original styling approach relied on mapping brand colors directly to CSS utility classes. 

### Core Palette
* **Aztec** (`#0d1d1a`): The dominant dark green used for navigation, primary headers, and active states.
* **Saffron** (`#f6c642`): The primary accent color used for buttons, links, and highlights.
* **Paper** (`#fbfaf6`): A warm, off-white background used for the main application canvas.
* **Ink** (`#12211d`): The primary text color.
* **Line** (`#e6e3d9`): Used globally for borders and dividers.

**The Problem**: A component might be styled as `<div className="bg-paper border border-line text-ink">`. This meant the component was strictly bound to those exact colors.

## The Semantic Redesign Direction
The `ui-redesign` branch completely overhauls this architecture. Instead of applying brand colors, components now use **Semantic Tokens** that describe the *function* of the UI element.

### The Semantic Tokens
As defined in the updated `tailwind.config.ts` and `globals.css`:
* **Backgrounds**: `bg-background`, `bg-surface`, `bg-surface-elevated`, `bg-surface-muted`, `bg-surface-interactive`.
* **Foregrounds (Text/Icons)**: `text-foreground`, `text-muted`, `text-inverse`.
* **Borders**: `border-border`, `border-subtle`, `border-strong`.
* **Brand Actions**: `bg-primary`, `bg-secondary`.

**The Solution**: That same component is now styled as `<div className="bg-surface border border-border text-foreground">`. 

### How it Works
The application defines `.light` and `.dark` blocks in `globals.css`. 
* In Light Mode, `--surface` maps to the white card color and `--foreground` maps to the dark "Ink". 
* In Dark Mode, `--surface` maps to a deep charcoal (`#0f1b1a`), and `--foreground` maps to a warm near-white (`#f6f5f1`).

Because the React components only reference the Tailwind classes (`bg-surface`), the entire application can swap between themes instantly by changing a single class on the `<html>` root element, without any component-level JS logic or conditional classnames.
