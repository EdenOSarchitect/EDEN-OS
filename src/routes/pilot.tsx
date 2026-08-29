import { createFileRoute } from "@tanstack/react-router";
import { PilotPage } from "@/components/eden/pilot-page";

export const Route = createFileRoute("/pilot")({ component: PilotPage });
