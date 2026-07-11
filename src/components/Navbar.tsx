import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-indigo-700">
          gov잡 트래커
        </Link>
        <Link
          href="/jobs/new"
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + 공고 추가
        </Link>
      </div>
    </nav>
  );
}
