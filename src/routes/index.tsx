import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/eden/home-page";

export const Route = createFileRoute("/")({ component: HomePage });
