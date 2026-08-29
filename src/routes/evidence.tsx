import { createFileRoute } from "@tanstack/react-router";
import { EvidencePage } from "@/components/eden/evidence-page";

export const Route = createFileRoute("/evidence")({ component: EvidencePage });
