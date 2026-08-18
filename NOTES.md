## Express.js

Express is a lightweight web framework for Node.js that makes it easy to build APIs and backend services without a lot of boilerplate. Switching from a more manual HTML-style switch setup to Express statements cuts down on code and keeps the logic much cleaner and easier to follow.

It’s especially useful for REST APIs, internal tools, auth flows, and backend services that need to handle HTTP requests, validate data, and connect to databases or AI tools. It does well when you want to move fast, keep routes organized, and use middleware to handle repeated pieces of logic without overcomplicating the app.

## What Express takes off my hands

Express owns the HTTP plumbing and dispatch loop: it receives a request, walks through the registered middleware and routes in order, and sends the response or forwards an error. That means I do not have to build the server loop, manually inspect every URL and method, or repeat shared request handling. My code owns the route handlers, validation, database work, and document-comparison logic. In this project, that Express wiring is still to be implemented; `src/app.ts` and `src/index.ts` are currently empty.

## What is still fuzzy

The parts I would reread before an interview are the boundaries between the Express layer and the application layer, how a request moves through middleware into a handler, and how errors travel through that chain. The project also still has open implementation work around database persistence, document ingestion, version grouping, section alignment, retrieval, and the agent workflow. The intended flow is clear, but those pieces are not fully wired yet.

## Corpus shape

`docs/corpus.json` is a manifest of filing versions, not a list of logical documents. The top-level key is therefore `versions`. A seed script can group versions by a stable identity such as filer and document type, insert one row into `documents`, and then insert each manifest entry into `document_versions` linked to that document.

---