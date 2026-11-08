const TONES = {
  success: "border-success text-success",
  error: "border-error text-error",
  muted: "text-muted",
};

// The result of an action, shown after it redirects back to the page
export function AdminNotice({
  notice,
  className = "",
}: {
  notice: { tone: keyof typeof TONES; message: string };
  className?: string;
}) {
  return (
    <p
      role={notice.tone === "error" ? "alert" : "status"}
      className={`border p-4 text-body-s ${TONES[notice.tone]} ${className}`}
    >
      {notice.message}
    </p>
  );
}
