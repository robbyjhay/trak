# Phase 01 — Initial SPA to React

## Context
The project started from a browser-based Single Page Application (SPA) supplied as the initial prototype (`trakprototype.txt`). 

## Starting Point
The original prototype was a monolithic file utilizing Vanilla HTML, CSS, and JavaScript. It manipulated the DOM directly (`appEl.innerHTML`) to simulate routing between screens (Dashboard, New Activity, Profile) and used in-memory JavaScript objects to hold state.

## Trigger
To build a scalable, maintainable web application, the Vanilla JS approach was untenable. The application needed to be migrated to a modern component-based framework before any significant feature development could continue.

## Work Performed
My first major task was to break that initial implementation into a React structure. 
1. **Routing**: The hash-based routing was converted into Next.js App Router paths (e.g., `/dashboard`, `/activities`).
2. **Componentization**: Massive HTML blocks were decomposed into reusable React components (`Topbar`, `Rail`, `ActRow`, `KPI cards`).
3. **State Management**: The global `DB` object from the prototype was wrapped into a React Context (`TrakStore`) to provide a reactive data layer for the UI.

## Technical Changes
* Introduction of React and Next.js.
* Migration of CSS variables into Tailwind utility classes or global stylesheets.

## Product Changes
From a user perspective, the application remained visually identical to the prototype. However, navigation became significantly faster and more robust due to React's virtual DOM and Next.js routing.

## Result
This phase successfully established the page and component structure that all later features were integrated into. It provided the React-based codebase that existed when the second prototype was eventually introduced.
