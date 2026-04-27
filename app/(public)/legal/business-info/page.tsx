import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "사업자정보 · PATZ",
};

const rows: Array<[string, string]> = [
  ["상호", "피버샌클럽"],
  ["대표자", "최은우"],
  ["사업자등록번호", "583-12-03242"],
  ["사업장 주소", "서울특별시 서초구 방배로 21"],
  ["대표 전화번호", "010-2305-7259"],
  ["대표 이메일", "patz.nail@gmail.com"],
  ["통신판매업 신고번호", "확인 중"],
];

export default function BusinessInfoPage() {
  return (
    <main className="px-6 py-12">
      <h1 className="text-xl font-semibold">사업자정보</h1>
      <p className="mt-2 text-sm text-muted">
        전자상거래법에 따른 사업자 정보입니다.
      </p>
      <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[7.5rem_1fr] gap-4 py-3"
          >
            <dt className="text-muted">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
