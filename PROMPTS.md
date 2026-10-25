# AI Prompt Log

The following prompts represent the requests used during the implementation journey.

## 1. Inspect and plan the workspace

Inspect the empty workspace and propose the smallest practical structure for a dealership inventory system with a separate Node.js backend and React frontend. Use PNPM, keep the packages independent, and identify the first implementation slice that can be validated quickly.

## 2. Scaffold the project

Set up a PNPM workspace with `backend` and `frontend` packages. Use JavaScript rather than TypeScript. The backend should use Express and the frontend should use React with Vite. Keep the setup minimal and make sure both packages can be installed and run independently.

## 3. Design the persistence layer

Implement a persistent SQLite database for the backend using `better-sqlite3`. Create tables for users and vehicles with useful constraints for roles, prices, and stock quantities. Also make the database factory accept `:memory:` so the test suite can isolate each test.

## 4. Write the first backend tests

Before expanding the API, write focused Supertest and Vitest cases for user registration, duplicate email rejection, login, protected routes, admin authorization, vehicle creation, searching, purchasing, out-of-stock behavior, and restocking. Use an in-memory database for the tests.

## 5. Implement authentication

Add password hashing with bcrypt and JWT-based authentication. Create middleware for authenticated users and a separate middleware for admin-only routes. Return a safe public user object instead of password hashes from registration and login.

## 6. Implement the inventory API

Build the Express routes for vehicle listing, search, creation, update, deletion, purchase, and restocking. Keep inventory mutations atomic at the SQL level, validate negative prices and quantities, and return clear HTTP status codes and error messages.

## 7. Diagnose the failing tests

The authentication tests pass, but protected inventory tests receive 401 responses. Reproduce the failure with a small in-memory API check and inspect whether the test database is really isolated between test cases. Fix the root cause rather than weakening JWT validation.

## 8. Build the frontend shell

Replace the Vite starter screen with a practical dealership inventory interface. Add a login/register gate, a responsive dashboard, vehicle cards, search and filter controls, purchase actions, and an admin panel for adding and deleting vehicles. Keep the API base URL configurable with `VITE_API_URL`.

## 9. Add the visual system

Use Tailwind CSS through the Vite plugin and add a restrained, distinctive visual style for the dealership dashboard. Use responsive layouts, clear stock states, accessible form controls, meaningful icons, and mobile support without introducing a large component library.

## 10. Validate the frontend and backend

Run the frontend lint and production build, then run the backend test suite. Fix only issues introduced by this project. Pay attention to React hook lint rules, native SQLite build requirements under PNPM, and any mismatch between the test database behavior and the production database behavior.

## 11. Complete the submission documentation

Write a concise README covering the architecture, setup commands, API routes, database choice, admin access convention, test results, AI usage, and screenshot expectations. Add this prompt log as a root-level `PROMPTS.md` without copying the original assessment prompt.
