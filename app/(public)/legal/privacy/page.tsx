import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 · PATZ",
};

export default function PrivacyPage() {
  return (
    <main className="px-6 py-12">
      <h1 className="text-xl font-semibold">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-muted">최종 업데이트: 작성 예정</p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-ink">
        <div>
          <h2 className="font-medium">1. 수집하는 개인정보 항목</h2>
          <p className="mt-2 text-muted">
            (placeholder) 서비스 제공을 위해 수집하는 개인정보 항목과 수집
            방법을 이곳에 작성합니다.
          </p>
        </div>
        <div>
          <h2 className="font-medium">2. 개인정보의 이용 목적</h2>
          <p className="mt-2 text-muted">
            (placeholder) 수집한 개인정보를 어떤 목적으로 이용하는지 작성합니다.
          </p>
        </div>
        <div>
          <h2 className="font-medium">3. 개인정보의 보유 및 이용 기간</h2>
          <p className="mt-2 text-muted">
            (placeholder) 보유 기간 및 파기 절차를 작성합니다.
          </p>
        </div>
        <div>
          <h2 className="font-medium">4. 제3자 제공 및 처리 위탁</h2>
          <p className="mt-2 text-muted">
            (placeholder) 외부 제공 및 위탁 현황을 작성합니다.
          </p>
        </div>
        <div>
          <h2 className="font-medium">5. 이용자의 권리와 행사 방법</h2>
          <p className="mt-2 text-muted">
            (placeholder) 열람·정정·삭제 요청 절차를 작성합니다.
          </p>
        </div>
        <div>
          <h2 className="font-medium">6. 개인정보 보호책임자</h2>
          <p className="mt-2 text-muted">
            (placeholder) 책임자 성함, 연락처, 이메일을 작성합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
