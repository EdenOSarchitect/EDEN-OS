import { createFileRoute } from "@tanstack/react-router";
import { RefineryPage } from "@/components/eden/refinery-page";

export const Route = createFileRoute("/refinery")({ component: RefineryPage });
