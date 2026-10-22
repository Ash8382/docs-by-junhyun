import { describe, expect, it } from "vitest";
import { Box3, LineSegments, Mesh, MeshBasicMaterial, type BufferGeometry } from "three";
import { driveAt } from "@/lib/journey/drive";
import { TAILLIGHTS } from "@/lib/journey/carAsset";
import { rangeOf } from "@/lib/journey/timeline";
import { carLightLevel, trailColor } from "@/lib/journey/trail";
import { createSilhouette, paintSilhouette } from "./silhouette";

describe("빛 실루엣", () => {
  // 모델과 같은 자리·크기(뒤 1.94m, 앞 2.40m, 폭 2.2m)라야 같은 자세(placeCar)와 빛줄기 시작점이 맞는다(병합 뒤)
  it("모델만 한 윤곽선과 불빛 막대로 되어 있고 바닥이 노면에 닿는다", () => {
    const silhouette = createSilhouette();
    expect(silhouette.object.children.filter((child) => child instanceof LineSegments)).toHaveLength(1);
    const bounds = new Box3().setFromObject(silhouette.object);
    expect(bounds.min.z).toBeCloseTo(-1.94, 1);
    expect(bounds.max.z).toBeCloseTo(2.4, 1);
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(2.2, 1);
    expect(bounds.min.y).toBeGreaterThanOrEqual(0);
    expect(bounds.min.y).toBeLessThan(0.3);
    silhouette.dispose();
  });

  // 모서리 선만 있으면 도로 중앙선·빛줄기가 몸통을 뚫고 보이고, 바퀴가 없고 지붕까지 차 폭이라 뒤에서 보면 철사 상자였다(병합 뒤)
  it("몸통은 어둡게 채워 도로가 비치지 않고, 위 유리 부분은 아래 몸통보다 좁으며, 바퀴 고리 넷이 노면에 닿는다", () => {
    const silhouette = createSilhouette();
    const named = (name: string) => silhouette.object.getObjectByName(name);
    const body = named("journey-car-silhouette-body");
    if (!(body instanceof Mesh)) throw new Error("채운 몸통이 없습니다");
    const fill = body.material as MeshBasicMaterial;
    expect(fill.transparent).toBe(false);
    expect(Math.max(...fill.color.toArray())).toBeLessThan(0.05);
    // 높이별 폭: 허리선(0.8m) 아래는 차 폭, 지붕 쪽(뒤 데크 1.02m보다 위)은 그보다 좁다
    const widthAt = (geometry: BufferGeometry, test: (y: number) => boolean) => {
      const position = geometry.getAttribute("position");
      const xs: number[] = [];
      for (let index = 0; index < position.count; index++) if (test(position.getY(index))) xs.push(position.getX(index));
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(widthAt(body.geometry, (y) => y < 0.8)).toBeCloseTo(2.2, 2);
    expect(widthAt(body.geometry, (y) => y > 1.05)).toBeLessThanOrEqual(1.5);
    const wheels = named("journey-car-silhouette-wheels");
    if (!(wheels instanceof Mesh)) throw new Error("바퀴가 없습니다");
    const box = new Box3().setFromObject(wheels);
    expect(box.min.y).toBeGreaterThanOrEqual(0);
    expect(box.min.y).toBeLessThan(0.05);
    // 앞뒤 두 바퀴씩, 좌우 차 폭 안
    expect(box.max.z - box.min.z).toBeGreaterThan(3);
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(2.2 + 1e-6);
    silhouette.dispose();
  });

  it("빛줄기는 테일라이트 막대에서 시작한다(허공이나 몸통 위에서 시작하지 않는다)", () => {
    const silhouette = createSilhouette();
    const bar = new Box3().setFromObject(silhouette.taillightMesh);
    for (const light of TAILLIGHTS) {
      // 차 기준(+X 왼쪽)에서 옆(오른쪽 +)은 −x다
      expect(-light.lateral).toBeGreaterThanOrEqual(bar.min.x);
      expect(-light.lateral).toBeLessThanOrEqual(bar.max.x);
      expect(Math.abs(light.height - (bar.min.y + bar.max.y) / 2)).toBeLessThan(0.05);
      expect(Math.abs(light.forward - (bar.min.z + bar.max.z) / 2)).toBeLessThan(0.05);
    }
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
    // 바퀴 고리는 윤곽선과 같은 빛이다
    expect(silhouette.wheels.color.toArray()).toEqual(silhouette.outline.color.toArray());
    paintSilhouette(silhouette, driveAt(1));
    expect(silhouette.outline.color.b).toBeCloseTo(trailColor(driveAt(1).carS)[2] * 1.8 * carLightLevel(1), 6);
    silhouette.dispose();
  });
});
