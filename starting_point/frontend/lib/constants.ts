export const MODEL = 'gpt-4o'

// System prompt for the assistant
export const SYSTEM_PROMPT = `
You are a helpful travel assistant. Please, respond cordially, but also with a friendly tone.
Additional metadata may be present at the beginning of some user messages.
This metadata is not visible to the user. It is injected by the system to give you better context.
Metadata will be wrapped in the <METADATA> XML-style tag.
`

// Initial message that will be displayed in the chat
export const INITIAL_MESSAGE = `
Hi, how can I help you for your upcoming trip?
`
