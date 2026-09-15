import type {
  MashupRole
} from "./types";

import type {
  MashupCandidate
} from "../discovery/types";

import type {
  MusicIntelligenceResult
} from "../intelligence/types";

export interface RoleAssignment {
  trackA: MashupRole;
  trackB: MashupRole;
}

export function assignMashupRoles(
  candidate: MashupCandidate,
  trackA: MusicIntelligenceResult,
  trackB: MusicIntelligenceResult
): RoleAssignment {
  const profileA =
    trackA.vocalProfile;

  const profileB =
    trackB.vocalProfile;

  if (
    profileA === "likely-instrumental" &&
    profileB === "likely-vocal"
  ) {
    return {
      trackA: "base",
      trackB: "vocal"
    };
  }

  if (
    profileA === "likely-vocal" &&
    profileB === "likely-instrumental"
  ) {
    return {
      trackA: "vocal",
      trackB: "base"
    };
  }

  if (
    profileA === "likely-vocal" &&
    profileB === "likely-vocal"
  ) {
    return assignByScore(
      candidate,
      "vocal",
      "vocal"
    );
  }

  if (
    profileA === "likely-instrumental" &&
    profileB === "likely-instrumental"
  ) {
    return assignByScore(
      candidate,
      "base",
      "base"
    );
  }

  return {
    trackA: "hybrid",
    trackB: "hybrid"
  };
}

function assignByScore(
  candidate: MashupCandidate,
  roleA: MashupRole,
  roleB: MashupRole
): RoleAssignment {
  if (
    candidate.compatibility.vocal
      .roleCompatible
  ) {
    return {
      trackA: roleA,
      trackB: roleB
    };
  }

  return {
    trackA: "hybrid",
    trackB: "hybrid"
  };
}