/* Transient confirmation message pinned by the `.toast` style. Renders
   nothing when there's no message. */
export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
