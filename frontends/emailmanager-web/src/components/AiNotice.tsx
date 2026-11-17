/** NFR-01: tell the user that their email content is analyzed by AI. */
export const AiNotice = () => (
  <p className="ai-notice" role="note" data-testid="ai-notice">
    EmailManager uses AI (Anthropic’s Claude) to analyze the content of your emails so it can categorize them and draft
    replies. Only the text a check needs is sent, without attachments, and email bodies are not stored.
  </p>
)
