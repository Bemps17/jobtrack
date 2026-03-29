"use client";

import { Badge } from "@/components/ui/badge";
import { badgeClass, norm } from "@/lib/candidature-utils";
import { useCandidatures } from "@/context/candidatures-context";
import type { Candidature } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  c: Candidature;
  className?: string;
};

/**
 * Badge statut sur les cartes : si « à envoyer », un clic marque tout de suite « Envoyée »
 * (dates appliquées via le contexte : postulation + relance J+7).
 */
export function CardStatusChip({ c, className = "" }: Props) {
  const { updateCandidature } = useCandidatures();
  const pending = norm(c.status) === "à envoyer";

  const markSent = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    void updateCandidature(c.id, { status: "envoyée" });
  };

  const badgeCls = cn(
    "shrink-0 font-normal",
    badgeClass(c.status),
    className
  );

  if (pending) {
    return (
      <Badge
        asChild
        variant="secondary"
        className={cn(
          "cursor-pointer transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring",
          badgeCls
        )}
      >
        <button
          type="button"
          title="Marquer comme envoyée (date du jour + relance dans 7 jours)"
          aria-label={`Marquer la candidature ${c.company} comme envoyée`}
          onClick={markSent}
        >
          {c.status}
        </button>
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={badgeCls}>
      {c.status || "—"}
    </Badge>
  );
}
