import { createFileRoute } from "@tanstack/react-router";
import { NeuralFieldPage } from "@/components/eden/neural-field-page";

export const Route = createFileRoute("/neural")({ component: NeuralFieldPage });
