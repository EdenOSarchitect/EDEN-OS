import { createFileRoute } from "@tanstack/react-router";
import { AokPage } from "@/components/eden/aok-page";

export const Route = createFileRoute("/aok")({ component: AokPage });
