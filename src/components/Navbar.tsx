import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
        <Link href="/" className="font-bold text-lg text-gray-900">
          GOV잡 트래커
        </Link>
      </div>
    </nav>
  );
}
