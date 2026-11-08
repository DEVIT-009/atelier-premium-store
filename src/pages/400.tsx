import ErrorPage from "./_error";

// Don't delete: `next build` (Turbopack) fails with "Cannot find module for page:
// /_document" if src/pages holds only special files. Also a preview of the 400
// design; this URL returns 200, real 400s come through _error.tsx.
export default function BadRequestPage() {
  return <ErrorPage statusCode={400} />;
}
