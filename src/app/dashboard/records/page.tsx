"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RecordsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard/records/folders");
  }, [router]);

  return null;
}
