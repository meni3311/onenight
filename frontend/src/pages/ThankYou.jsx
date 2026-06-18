/* Confirmation screen shown after a dress is submitted for review. */
export default function ThankYou({ goHome }) {
  return (
    <div className="thankyou">
      <div className="mb-6 h-px w-[60px] bg-[var(--gold)]" />
      <h1>השמלה שלך בדרך לבמה ✨</h1>
      <p>קיבלנו את המודעה שלך ואנחנו בודקות אותה בקפידה. תוך 24–48 שעות תקבלי עדכון במייל. תודה שבחרת להיות חלק מהקהילה שלנו 💚</p>
      <span className="link-rose" onClick={goHome}>חזרה לעמוד הבית</span>
    </div>
  );
}
