import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(ssrErrorDetail(error)), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Em produção, a página de erro não revela a causa. Para diagnosticar um deploy,
// defina DEBUG_SSR_ERRORS=1 no ambiente: aí o stack real aparece no navegador.
function ssrErrorDetail(error: unknown): string | undefined {
  const on = typeof process !== "undefined" && Boolean(process.env?.DEBUG_SSR_ERRORS);
  if (!on) return undefined;
  if (error instanceof Error) return error.stack || error.message;
  return String(error);
}

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
