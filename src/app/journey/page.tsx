import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import { JourneyContent } from "@/components/journey/JourneyContent";
import { JourneyStage } from "@/components/journey/JourneyStage";
import { VIEW_KEY } from "@/lib/journey/journeyMode";
import { SHORT_LANDSCAPE_QUERY } from "@/lib/journey/screen";

export const metadata: Metadata = {
  title: "Journey - 이준현",
  description: "A Journey Through Code",
};

/**
 * 처음 그리기(스펙 5절, 2-4b): 2D를 기억한 방문자는 본문보다 먼저 도는 이 스크립트가 <html>에 2D 표지를 걸어 처음 그릴 때부터 2D 배치다.
 * 짧은 가로 화면(2-4c)도 처음부터 2D다(기억한 3D보다 앞선다, 저장소가 막혀도 본다). 기기 단계로 2D인 기기는 하이드레이션 때 바뀐다(JourneyStage).
 * 루트 레이아웃의 <html>이 suppressHydrationWarning이라 경고가 없다.
 */
const FLAT_FIRST = `(function(){var d=document.documentElement;try{if(localStorage.getItem(${JSON.stringify(VIEW_KEY)})==="2d")d.dataset.journeyMode="2d"}catch(e){}try{if(matchMedia(${JSON.stringify(SHORT_LANDSCAPE_QUERY)}).matches)d.dataset.journeyMode="2d"}catch(e){}})()`;

export default function JourneyPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: FLAT_FIRST }} />
      <JourneyContent />
      <JourneyStage />
    </>
  );
}
