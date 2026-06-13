# Contributing to BTCFi API

Thanks for your interest in contributing! This document provides guidelines for contributing to the BTCFi API.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/btcfi-api.git
   cd btcfi-api
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Configure** environment:
   ```bash
   cp .env.example .env
   # Edit .env with your local values
   ```
5. **Run** the dev server:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes
3. Run linting:
   ```bash
   npm run lint
   ```
4. Run security audit:
   ```bash
   npm run security-audit
   ```
5. Commit with a clear message (see below)
6. Push and open a Pull Request

## Commit Messages

Use conventional commits:

- `feat: add new endpoint for X`
- `fix: resolve rate limiting edge case`
- `docs: update API reference`
- `refactor: optimize mempool query`
- `test: add coverage for risk scoring`
- `chore: update dependencies`

## Pull Request Guidelines

- PRs should target `main`
- Include a clear description of what changed and why
- Add or update tests for new endpoints
- Ensure `npm run lint` passes
- Ensure `npm run security-audit` passes
- Keep PRs focused — one feature or fix per PR
- Reference any related issues

## Adding a New Endpoint

1. Create the route handler in `app/api/v1/<endpoint>/route.ts`
2. Add input validation and error handling
3. Add x402 pricing metadata
4. Update `llms.txt` in `public/`
5. Update `docs/ARCHITECTURE.md`
6. Add tests
7. Update the OpenAPI spec if applicable

## Code Style

- TypeScript strict mode
- No `any` types — use proper type definitions
- Prefer functional patterns
- Handle errors explicitly — no silent failures
- Use the existing encryption and signing utilities

## Security

- Never commit API keys, tokens, or secrets
- Report security vulnerabilities privately to **security@aiindigo.com**
- Do not disclose vulnerabilities publicly until a fix is released
- Follow the security model in `docs/SECURITY.md`

## Code of Conduct

- Be respectful and constructive
- Focus on technical merit
- Welcome newcomers and help them get started
- Disagreements are fine — personal attacks are not

## Questions?

Open a [GitHub Discussion](https://github.com/aiindigo925/btcfi-api/discussions) or reach out at **security@aiindigo.com** for security matters.
