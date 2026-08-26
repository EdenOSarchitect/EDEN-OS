import { createFileRoute } from "@tanstack/react-router";
import { ShadowPage } from "@/components/eden/shadow-page";

export const Route = createFileRoute("/shadow")({ component: ShadowPage });
