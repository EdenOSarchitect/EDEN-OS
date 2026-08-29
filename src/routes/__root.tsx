import { AuthProvider } from "@/lib/auth/provider";
import { AppErrorComponent } from "@/lib/error-component";
import { SITE_ORIGIN } from "@/lib/site";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SiteShell } from "@/components/layout/site-shell";
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";

const APP_NAME = "EDEN Refinery";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "EDEN is a value-aware control layer for computation. Refinery, AOK and AURA FIELD — evidence before claim.",
      },
      { name: "theme-color", content: "#08090b" },
    ],
    links: [
      { rel: "canonical", href: `${SITE_ORIGIN}/` },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: RootDocument,
  errorComponent: AppErrorComponent,
  notFoundComponent: NotFound,
});

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-[1400px] px-4 py-24 sm:px-6">
        <p className="label-kicker">404</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-fg">
          Route not in the control plane.
        </h1>
        <p className="mt-3 max-w-md text-muted">
          That path is not a labelled EDEN surface.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex h-11 items-center border border-accent bg-accent px-4 font-mono text-[11px] tracking-[0.14em] text-accent-fg"
        >
          RETURN TO EDEN
        </Link>
      </section>
    </SiteShell>
  );
}
