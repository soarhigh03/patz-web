import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 · PATZ",
};

export default function TermsPage() {
  return (
    <main className="px-6 py-12">
      <h1 className="text-xl font-semibold">이용약관</h1>
      <p className="mt-2 text-sm text-muted">최종 업데이트: 작성 예정</p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-ink">
        <div>
          <h2 className="font-medium">제1조 (목적)</h2>
          <p className="mt-2 text-muted">
            (placeholder) 본 약관의 목적을 작성합니다.
          </p>
        </div>
        <div>
          <h2 className="font-medium">제2조 (정의)</h2>
          <p className="mt-2 text-muted">
            (placeholder) 본 약관에서 사용하는 용어의 정의를 작성합니다.
          </p>
        </div>
        <div>
          <h2 className="font-medium">제3조 (약관의 효력 및 변경)</h2>
          <p className="mt-2 text-muted">
            (placeholder) 약관의 게시·변경·통지 방법을 작성합니다.
          </p>
        </div>
        <div>
          <h2 className="font-medium">제4조 (서비스 이용)</h2>
          <p className="mt-2 text-muted">
            (placeholder) 가입, 예약, 결제, 취소 등 서비스 이용 규정을
            작성합니다.
          </p>
        </div>
        <div>
          <h2 className="font-medium">제5조 (회사와 이용자의 의무)</h2>
          <p className="mt-2 text-muted">
            (placeholder) 회사 및 이용자가 준수해야 할 사항을 작성합니다.
          </p>
        </div>
        <div>
          <h2 className="font-medium">제6조 (분쟁의 해결)</h2>
          <p className="mt-2 text-muted">
            (placeholder) 준거법 및 관할 법원 등을 작성합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
