"use client";

import { useState } from "react";

/* Quiet trust strip for the dark hero — real universities our guidance covers.
 * Each logo sits in a small white chip so the favicon reads on the navy. */

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
    <span className="group inline-flex items-center gap-2 transition">
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]">
        {failed ? (
          <span className="text-[11px] font-extrabold text-[#12244a]">{name[0]}</span>
        ) : (
          <img
            src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-4 w-4 object-contain"
          />
        )}
      </span>
      <span className="text-[13px] font-semibold tracking-[-0.01em] text-white/55 transition group-hover:text-white/85">
        {name}
      </span>
    </span>
  );
}

export function HeroUniversityStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
      {UNIS.map((u) => (
        <UniItem key={u.domain} {...u} />
      ))}
    </div>
  );
}
