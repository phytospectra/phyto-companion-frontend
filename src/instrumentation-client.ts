/**
 * Client-only MSW bootstrap.
 *
 * This file is compiled only for the browser bundle, so `msw/browser` (whose
 * Node export is intentionally `null`) never enters the server module graph.
 * Without this separation, SSR fails with "Can't resolve 'msw/browser'".
 */
import { initMocks } from "@/mocks/init";

void initMocks();
