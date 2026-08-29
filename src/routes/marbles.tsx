import { createFileRoute } from "@tanstack/react-router";
import { MarblesPage } from "@/components/eden/marbles-page";

export const Route = createFileRoute("/marbles")({ component: MarblesPage });
