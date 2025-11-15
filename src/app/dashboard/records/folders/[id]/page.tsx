"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FolderRecordsPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.id as string;

  useEffect(() => {
    // Redirect to parent with state
    router.push(`/dashboard/records/folders?id=${folderId}`);
  }, [folderId, router]);

  return null;
}
