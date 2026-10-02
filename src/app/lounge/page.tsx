import type { Metadata } from "next";
import { LoungeClient } from "./LoungeClient";

export const metadata: Metadata = {
  title: "쉼터",
  description: "멍 때릴 때 잠깐 머무는 공간. 이름만 정하면 들어올 수 있어요.",
};

export default function LoungePage() {
  return (
    <div className="container py-12">
      <LoungeClient />
    </div>
  );
}
