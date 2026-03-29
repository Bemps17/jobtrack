import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="text-center text-sm text-muted-foreground">
        Cette adresse n’existe pas ou a été déplacée.
      </p>
      <Button asChild variant="link" className="text-sm font-medium">
        <Link href="/">Retour à l’accueil</Link>
      </Button>
    </div>
  );
}
