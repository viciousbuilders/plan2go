import { Caprasimo } from "next/font/google";

/**
 * The front page's headline voice: a heavy, soft serif, the weight of the
 * lockup's wordmark beside it. Only the front page's own headings and the
 * numbers of its steps are set in it, so it is loaded here rather than in the
 * root layout, and a trip's pages never download it.
 *
 * Latin only. Every word set in it is the page's own English, never a place
 * name, so Vietnamese is not asked of it, and it is the one weight it comes
 * in. The arguments are written out rather than named, since Next reads them
 * from the source at build time.
 */
export const headlineFont = Caprasimo({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
