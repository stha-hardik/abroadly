"use client";

import { useState } from "react";

/* Quiet, Notion-style trust strip — real universities our guidance covers.
 * Grayscale favicons (with a clean monogram fallback), warming to colour on hover. */

const UNIS: { name: string; domain: string }[] = [
  { name: "Oxford", domain: "ox.ac.uk" },
  { name: "Cambridge", domain: "cam.ac.uk" },
  { name: "Imperial", domain: "imperial.ac.uk" },
  { name: "UCL", domain: "ucl.ac.uk" },
  { name: "Melbourne", domain: "unimelb.edu.au" },
  { name: "Toronto", domain: "utoronto.ca" },
  { name: "UBC", domain: "ubc.ca" },
];

function UniItem({ name, domain }: { name: string; domain: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="group inline-flex items-center gap-2 opacity-75 transition hover:opacity-100">
      {failed ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--ab-paper-2)] text-[10px] font-extrabold text-[var(--ab-muted)]">
          {name[0]}
        </span>
      ) : (
        <img
          src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
          alt=""
          width={22}
          height={22}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-[22px] w-[22px] rounded-[5px] object-contain grayscale transition duration-200 group-hover:grayscale-0"
        />
      )}
      <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--ab-muted)]">{name}</span>
    </span>
  );
}

export function HeroUniversityStrip() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3.5">
      {UNIS.map((u) => (
        <UniItem key={u.domain} {...u} />
      ))}
    </div>
  );
}
