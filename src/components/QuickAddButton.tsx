"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function QuickAddButton() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    router.push("/app/todos");
    // Small delay to ensure page loads, then scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('[data-quick-add]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  return (
    <>
      {/* Desktop: Fixed in sidebar bottom */}
      <div className="hidden lg:block">
        <button
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#008069] text-white shadow-lg transition-all hover:scale-110 hover:bg-[#00a884] hover:shadow-xl"
          aria-label="Quick Add Todo"
        >
          <svg
            className={`h-6 w-6 transition-transform ${isHovered ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Mobile: Fixed bottom right */}
      <button
        onClick={handleClick}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#008069] text-white shadow-lg transition-all active:scale-95 lg:hidden"
        aria-label="Quick Add Todo"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </>
  );
}

