"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Loaded as its own chunk that is never requested in production, so dialkit
// stays out of the shipped app.
const Panel = dynamic(() => import("./DesignDialsPanel"), { ssr: false });

/**
 * The design tuning panel, off unless asked for. Visit /?tune to open it.
 * Development only either way.
 */
export default function Dials() {
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    setWanted(new URLSearchParams(window.location.search).has("tune"));
  }, []);

  if (process.env.NODE_ENV === "production") return null;
  if (!wanted) return null;
  return <Panel />;
}
