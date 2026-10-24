"use client";

import * as React from "react";
import Image from "next/image";

export interface ReviewItem {
  id: number;
  image: string;
  name: string;
  location: string;
  feedback: string;
  bg: string;
}

export interface ReviewCardProps {
  review: ReviewItem;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div
      style={{ backgroundColor: `var(${review.bg})` }}
      className="
        group
        min-w-full
        snap-center
        p-6
        rounded-2xl
        lg:min-w-0
        cursor-pointer
        transition-all
        duration-300
        hover:-translate-y-2
        hover:shadow-xl
        border
        border-black/5
      "
    >
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <Image
            src={review.image}
            alt={review.name}
            fill
            sizes="80px"
            className="
              bg-white
              rounded-full
              object-cover
              transition-transform
              duration-300
              group-hover:scale-105
              shadow-sm
            "
          />
        </div>

        <div className="flex-col pl-3">
          <h6
            className="
              font-semibold
              text-[var(--brown-700)]
              text-lg
              transition-colors
              duration-300
              group-hover:text-[var(--brown-800)]
            "
          >
            {review.name}
          </h6>

          <p className="header-font text-sm text-[var(--brown-500)]">
            {review.location}
          </p>
        </div>
      </div>

      <p className="pt-4 feedback-font text-base leading-8 text-[var(--brown-800)]">
        {review.feedback}
      </p>
    </div>
  );
}

export default ReviewCard;
