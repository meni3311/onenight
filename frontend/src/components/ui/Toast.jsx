/* Error/validation copy is detected from the message text itself rather
   than threading a second `type` argument through every toast(...) call
   site (there are ~30 of them across the app). Every failure message
   already reads "...נכשל" (failed) or "שגוי"/"שגיאה" (wrong/error), and
   every validation prompt opens with "נא ל..." (please...) — so this one
   regex covers all of them with zero changes anywhere else. */
const ERROR_RE = /נכשל|שגוי|שגיא|נא ל/;

/* Transient confirmation message pinned by the `.toast` style. Renders
   nothing when there's no message. */
export function Toast({ message }) {
  if (!message) return null;
  const isError = ERROR_RE.test(message);
  return <div className={"toast" + (isError ? " toast-error" : "")}>{message}</div>;
}
