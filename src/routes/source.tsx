import { createFileRoute } from "@tanstack/react-router";
import { SourcePage } from "@/components/eden/source-page";

export const Route = createFileRoute("/source")({ component: SourcePage });
