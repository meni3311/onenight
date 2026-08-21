const ERROR_RE = /נכשל|שגוי|שגיא|נא ל/;

export function Toast({ message }) {
  if (!message) return null;
  const isError = ERROR_RE.test(message);
  return <div className={"toast" + (isError ? " toast-error" : "")}>{message}</div>;
}
