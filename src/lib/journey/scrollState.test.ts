import { expect, it } from "vitest";
import { scrollState, setProgress, subscribeProgress } from "./scrollState";

it("구독자에게 진행률을 알리고, 구독을 끊으면 더 알리지 않는다", () => {
  const seen: number[] = [];
  const unsubscribe = subscribeProgress((progress) => seen.push(progress));
  setProgress(0.25);
  unsubscribe();
  setProgress(0.5);
  expect(seen).toEqual([0.25]);
  expect(scrollState.progress).toBe(0.5);
});
