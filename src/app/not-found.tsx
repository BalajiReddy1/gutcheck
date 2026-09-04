import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="nf on-ink">
      <div className="bleed">
        <span className="cap">Error 404</span>
        <h1 className="display">
          No such
          <br />
          <em>entry.</em>
        </h1>
        <p className="lead">
          Nothing is filed under that address. The record only holds what you wrote.
        </p>
        <Link className="btn-hs btn-hs--lime" href="/">
          Back to the front
        </Link>
      </div>

      <style>{`
        .nf {
          min-height: 100vh;
          display: grid;
          align-content: center;
          padding-block: 4rem;
        }
        .nf .bleed { display: grid; gap: 1.5rem; justify-items: start; }
        .nf h1 em { color: var(--lime); font-family: var(--font-display); font-style: italic; font-weight: 400; }
      `}</style>
    </main>
  );
}
