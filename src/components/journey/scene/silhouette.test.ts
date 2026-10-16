import { describe, expect, it } from "vitest";
import { Box3, LineSegments } from "three";
import { driveAt } from "@/lib/journey/drive";
import { rangeOf } from "@/lib/journey/timeline";
import { carLightLevel, trailColor } from "@/lib/journey/trail";
import { createSilhouette, paintSilhouette } from "./silhouette";

describe("빛 실루엣", () => {
  it("차만 한 윤곽선과 불빛 막대로 되어 있고 바닥이 노면에 닿는다", () => {
    const silhouette = createSilhouette();
    expect(silhouette.object.children.filter((child) => child instanceof LineSegments)).toHaveLength(1);
    const bounds = new Box3().setFromObject(silhouette.object);
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(4.6, 1);
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(1.9, 1);
    expect(bounds.min.y).toBeGreaterThanOrEqual(0);
    expect(bounds.min.y).toBeLessThan(0.3);
    silhouette.dispose();
  });

  it("윤곽선은 지금 자리의 궤적 색으로 빛나고 엔딩에서 낮아진다", () => {
    const silhouette = createSilhouette();
    const range = rangeOf("kokoa-clone");
    const state = driveAt((range.start + range.end) / 2);
    paintSilhouette(silhouette, state);
    const color = trailColor(state.carS);
    const [r, , b] = silhouette.outline.color.toArray();
    expect(r / b).toBeCloseTo(color[0] / color[2], 5);
    expect(r).toBeGreaterThan(color[0]);
    expect(silhouette.taillights[0].emissiveIntensity).toBeGreaterThan(1);
    paintSilhouette(silhouette, driveAt(1));
    expect(silhouette.outline.color.b).toBeCloseTo(trailColor(driveAt(1).carS)[2] * 1.8 * carLightLevel(1), 6);
    silhouette.dispose();
  });
});
