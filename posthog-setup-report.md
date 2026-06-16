# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Charis fashion AI agent. The `posthog-node` SDK was installed and wired into the Express server (`server/index.js`). PostHog environment variables (`POSTHOG_API_KEY`, `POSTHOG_HOST`) were added to `.env`. The `setupExpressRequestContext` middleware was registered before all routes so that incoming `X-POSTHOG-DISTINCT-ID` and `X-POSTHOG-SESSION-ID` headers (useful for future frontend correlation) are automatically picked up. Three business events are captured inside the `/api/chat` route handler. `setupExpressErrorHandler` was added after all routes for automatic Express error capture, and graceful shutdown handlers ensure all queued events are flushed before the process exits.

| Event | Description | File |
|---|---|---|
| `chat message sent` | Fired when a valid chat request arrives at `/api/chat`. Properties: `message_count`, `model`. | `server/index.js` |
| `chat response received` | Fired when Groq returns a successful assistant response. Properties: `model`, `response_length`, `message_count`. | `server/index.js` |
| `chat error` | Fired when a Groq API error, empty response, or server exception occurs. Properties: `error_type`, `model`, and either `status_code` + `error_message` (API errors) or the exception via `captureException`. | `server/index.js` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/472889/dashboard/1719537)
- [Chat messages sent per day (wizard)](https://us.posthog.com/project/472889/insights/WjqPWPe3)
- [Daily active chatters (wizard)](https://us.posthog.com/project/472889/insights/N3YBQP3r)
- [Chat success rate (wizard)](https://us.posthog.com/project/472889/insights/CdpNWn8u)
- [Chat errors over time (wizard)](https://us.posthog.com/project/472889/insights/lYkRwynF)
- [Chat message to response funnel (wizard)](https://us.posthog.com/project/472889/insights/4gqFk61u)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_API_KEY` and `POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
