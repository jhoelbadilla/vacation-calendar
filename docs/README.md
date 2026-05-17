# Vacation Calendar Planning Documentation

This folder contains the planning package for the vacation calculation calendar application. The documents are intended to guide implementation of a modern React, Express, and Docker Compose application that supports secure user-specific vacation simulations.

## Document index

- [Product requirements](requirements.md): Functional and non-functional requirements, user journeys, and acceptance criteria.
- [Calculation rules](calculation-rules.md): Vacation accrual, daily work-hour assumptions, day-type behavior, and range-editing rules.
- [Architecture](architecture.md): System components, request flow, authentication model, refresh strategy, and Mermaid architecture diagrams.
- [Data model](data-model.md): Entity definitions, relational schema proposal, constraints, indexes, and Mermaid ER diagram.
- [API design](api-design.md): Proposed REST API endpoints, payloads, validation rules, and authorization expectations.
- [UX and interface plan](ux-interface-plan.md): Layout, responsive behavior, calendar interactions, and modern visual design direction.
- [Deployment plan](deployment-plan.md): Docker Compose topology, `torrentnet` networking, domain routing assumptions, environment variables, and operational notes.
- [Implementation plan](implementation-plan.md): Phased build plan, milestones, testing strategy, and risk register.

## Proposed technology stack

| Layer | Proposed choice | Notes |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | Fast local development and production static build. |
| UI | shadcn/ui + Tailwind CSS | Modern component system with accessible primitives. |
| Calendar | Wix `react-native-calendars` via React Native Web compatibility layer, or a React calendar fallback if web support becomes impractical | The requirement names Wix React Native Calendar; feasibility should be validated early in the UI spike. |
| Backend | Express.js + TypeScript | REST API with secure authentication middleware. |
| Database | PostgreSQL | Docker-hostable, relational constraints, transaction support, strong fit for user-owned simulations. |
| Auth | Password hash with Argon2id or bcrypt + signed HTTP-only session/JWT cookie | Avoid localStorage tokens; enforce user ownership on every simulation resource. |
| Deployment | Docker Compose | Separate frontend, API, and database containers attached to `torrentnet`. |

## High-level success criteria

1. A visitor can create an account with username, email, and password, then log in with either username or email.
2. A logged-in user only sees their own simulation profiles and vacation calendar data.
3. If no simulation profile exists, the app blocks the main interface with a profile-creation prompt.
4. The main interface immediately recalculates visible accrued vacation balances after any parameter or day-setting change.
5. The calendar presents all 12 months of a selected year, supports mobile-responsive layout, and allows date or range editing for enabled dates.
6. Docker Compose can run the complete application stack and attach the deployable services to the existing `torrentnet` network.
