import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/** Browser service worker for development (`NEXT_PUBLIC_USE_MOCKS=true`). */
export const worker = setupWorker(...handlers);
